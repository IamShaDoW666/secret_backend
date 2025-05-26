import { Server, Socket } from "socket.io";
import { getReciever, sendDelivered, sendPoke } from "./utils/common";
import { addMessageToQueue, getAllMessages, redis } from "./utils/redis";
import { Message } from "./types";

export const EVENTS = {
  connection: "connection",
  disconnect: "disconnect",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    SEND_MESSAGE: "SEND_MESSAGE",
    MESSAGE_ENQUEUED: "MESSAGE_ENQUEUED",
    MESSAGE_DEQUEUED: "MESSAGE_DEQUEUED",
    MESSAGE_DELIVERED: "MESSAGE_DELIVERED",
    MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
    JOIN_ROOM: "JOIN_ROOM",
    DOWNSTREAM: "DOWNSTREAM",
    POKE: "POKE",
    TYPING: "TYPING_CLIENT",
    READ_ACK: "READ_ACK",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    NEW_MESSAGE: "NEW_MESSAGE",
    MESSAGE_ENQUEUED: "MESSAGE_ENQUEUED",
    MESSAGE_DEQUEUED: "MESSAGE_DEQUEUED",
    MESSAGE_DELIVERED: "MESSAGE_DELIVERED",
    MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
    READ_ACK: "READ_ACK_SERVER",
    CONNECTIONS: "CONNECTIONS",
    UPSTREAM: "UPSTREAM",
    POKED: "POKED",
    TYPING: "TYPING",
  },
};

export const onlineUsers = new Map<string, Socket>();

async function socket({ io }: { io: Server }) {
  let liveConnections = 0;
  redis.set("connections", 0);
  setInterval(() => {
    console.log("LIVE CONNECTIONS", liveConnections);
  }, 2500);
  const deleteUserKeys = async () => {
    const keys = await redis.keys("user:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
  };
  await deleteUserKeys();

  io.on(EVENTS.connection, async (socket: Socket) => {
    socket.onAny((event, ...args) => {
      console.warn(`EVENT: ${event}`, args);
    });
    socket.onAnyOutgoing((event, ...args) => {
      console.warn(`EVENT ==>: ${event}`, args);
    });

    const username = socket.handshake.query.username as string;
    socket.data.username = username;

    if (!onlineUsers.has(username)) {
      onlineUsers.set(username, socket);
    }

    if (!(await redis.exists(username))) {
      redis.hset(`user:${username}`, {
        clientId: socket.id,
        joined: new Date().toJSON(),
        username,
      });
      liveConnections++;
      redis.set("connections", liveConnections);
    }

    console.log(`CONNECTED: ${username} TOTAL: ${liveConnections}`);

    io.emit(EVENTS.SERVER.CONNECTIONS, {
      connections: liveConnections,
      onlineUsers: Array.from(onlineUsers.keys()),
    });

    if (await redis.exists(`queue:${username}`)) {
      socket.emit(
        EVENTS.SERVER.UPSTREAM,
        await getAllMessages(username, redis)
      );
    }

    /**
     * When a user disconnects
     */
    socket.on(EVENTS.disconnect, () => {
      console.log(`Client disconnected ${socket.data.username}`);
      let time = new Date();
      redis.hset(`time:${socket.data.username}`, {
        clientId: socket.id,
        lastOnline: time.toJSON(),
        time: time.toString(),
        username,
      });

      if (onlineUsers.has(username)) {
        onlineUsers.delete(username);
      }
      // Remove user from redis

      redis.del(`user:${socket.data.username}`);
      liveConnections--;
      redis.set("connections", liveConnections);

      io.emit(EVENTS.SERVER.CONNECTIONS, {
        connections: liveConnections,
        onlineUsers: Array.from(onlineUsers.keys()),
      });
    });
    /*
     * When a user sends a message
     */
    socket.on(EVENTS.CLIENT.SEND_MESSAGE, async ({ message }, callback) => {
      const date = new Date();
      const msg = JSON.parse(message) as Message;
      callback({ status: "ok", message: "Received!" });
      if (onlineUsers.has(getReciever(username))) {
        console.log(`NEW MESSAGE FROM ${username}`);
        socket.broadcast.emit(EVENTS.SERVER.NEW_MESSAGE, {
          id: msg.id,
          message: msg.message,
          username,
          time: date.toJSON(),
          status: "SENT",
        });
      } else {
        const sent = await addMessageToQueue(
          getReciever(username),
          {
            id: msg.id,
            message: msg.message,
            time: date.toJSON(),
            username,
            status: "SENDING",
          },
          redis
        );
        if (sent) {
          socket.broadcast.emit(EVENTS.SERVER.MESSAGE_ENQUEUED, msg.id);
          const newMsg = JSON.parse(
            (await redis.lindex(`queue:${getReciever(username)}`, -1))!
          ) as Message;
          newMsg.status = "DELIVERED";
          await redis.lset(
            `queue:${getReciever(username)}`,
            -1,
            JSON.stringify(newMsg)
          );
          // sendDelivered(username, newMsg.id, newMsg);
        }
        // Send notification if message is to me
        if (username != "Milan") {
          sendPoke(username, message);
        }
      }
    });

    /*
     * When a user reads a message
     */
    socket.on(EVENTS.CLIENT.READ_ACK, async ({ messageId, username }) => {
      socket.broadcast.emit(EVENTS.SERVER.READ_ACK, {
        id: messageId,
        username: username,
        time: new Date().toJSON(),
        status: "READ",
      });
    });

    /**
     * When a user is poked
     */
    socket.on(EVENTS.CLIENT.POKE, async () => {
      sendPoke(username);
    });

    /**
     * When a user starts typing
     */
    socket.on(EVENTS.CLIENT.TYPING, () => {
      console.log(`TYPING FROM ${username}`);
      socket.broadcast.emit(EVENTS.SERVER.TYPING, {
        username,
      });
    });

    /**
     * When user calls downstream
     */
    socket.on(EVENTS.CLIENT.DOWNSTREAM, async () => {
      console.log(`DOWN: ${username}`);
      if (username == "Malu") {
        sendPoke(username, `Read: ${new Date().toLocaleTimeString()}`);
      }
      redis.del(`queue:${username}`);
    });
  });
}

export default socket;
