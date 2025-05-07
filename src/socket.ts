import { Server, Socket } from "socket.io";
import { addMessageToQueue, getAllMessages, redis } from "./utils/redis";
import { getReciever, sendPoke } from "./utils/common";

const EVENTS = {
  connection: "connection",
  disconnect: "disconnect",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    SEND_MESSAGE: "SEND_MESSAGE",
    JOIN_ROOM: "JOIN_ROOM",
    DOWNSTREAM: "DOWNSTREAM",
    POKE: "POKE",
    TYPING: "TYPING_CLIENT",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    NEW_MESSAGE: "NEW_MESSAGE",
    CONNECTIONS: "CONNECTIONS",
    UPSTREAM: "UPSTREAM",
    POKED: "POKED",
    TYPING: "TYPING",
  },
};

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
    socket.onAnyOutgoing((event) => {
      console.warn(`EVENT ==>: ${event}`);
    });

    const username = socket.handshake.query.username as string;
    socket.data.username = username;
    if (!(await redis.exists(username))) {
      redis.hSet(`user:${username}`, {
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
    socket.on(EVENTS.disconnect, async () => {
      console.log(`Client disconnected ${socket.data.username}`);
      let time = new Date();
      redis.hSet(`time:${socket.data.username}`, {
        clientId: socket.id,
        lastOnline: time.toJSON(),
        time: time.toString(),
        username,
      });
      
      if (await redis.exists(`user:${socket.data.username}`)) {
        redis.del(`user:${socket.data.username}`);
        liveConnections--;
        redis.set("connections", liveConnections);
      }

      io.emit(EVENTS.SERVER.CONNECTIONS, {
        connections: liveConnections,
      });
    });
    /*
     * When a user sends a message
     */
    socket.on(EVENTS.CLIENT.SEND_MESSAGE, async ({ message }) => {
      const date = new Date();
      if (liveConnections > 1) {
        console.log(`NEW MESSAGE FROM ${username}`);
        socket.broadcast.emit(EVENTS.SERVER.NEW_MESSAGE, {
          message,
          username,
          time: date.toJSON(),
        });
      } else {
        addMessageToQueue(
          getReciever(username),
          {
            message,
            time: date.toJSON(),
            username,
          },
          redis
        );
        // Send notification if message is to me
        if (username != "Milan") {
          sendPoke(username, message);
        }
      }
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
