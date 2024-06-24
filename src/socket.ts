import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { addMessageToQueue, getAllMessages, redis } from "./utils/redis";
import { getNotificationMessage, getReciever, sendPoke } from "./utils/common";
import admin from 'firebase-admin'

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
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    NEW_MESSAGE: "NEW_MESSAGE",
    CONNECTIONS: "CONNECTIONS",
    UPSTREAM: "UPSTREAM",
    POKED: "POKED",
  },
};

async function socket({ io }: { io: Server }) {
  let liveConnections = Number(await redis.get("connections")) ?? 0;
  io.on(EVENTS.connection, async (socket: Socket) => {
    socket.onAny((event) => {
      console.warn(`EVENT: ${event}`);
    });
    socket.onAnyOutgoing((event) => {
      console.warn(`EVENT ==>: ${event}`);
    });

    const username = socket.handshake.query.username as string;
    socket.data.username = username;
    if (!(await redis.exists(username))) {
      socket.data.username = username;
      redis.hSet(username, {
        clientId: socket.id,
        joined: new Date().toJSON(),
        username,
      });
      console.log("BEFORE: CONNECTIONSS", liveConnections);
      liveConnections++;
      console.log("ADD CONNECTIONSS", liveConnections);
      redis.set("connections", liveConnections);
    }

    console.info(`Client connected ${socket.id} ${liveConnections}`);

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
      console.log(`Client disconnected ${socket.id}`);
      console.log(socket.data.username);
      if (await redis.exists(socket.data.username)) {
        redis.del(socket.data.username);
        liveConnections--;
        redis.set("connections", liveConnections);
      }

      io.emit(EVENTS.SERVER.CONNECTIONS, {
        connections: liveConnections,
      });
    });

    /*
     * When a user creates a new room
     */
    socket.on(EVENTS.CLIENT.CREATE_ROOM, ({ roomName }) => {
      console.log({ roomName });
      // create a roomId
      const roomId = nanoid();
      // add a new room to the rooms object
      // rooms[roomId] = {
      //   name: roomName,
      // };

      socket.join(roomId);

      // broadcast an event saying there is a new room
      // socket.broadcast.emit(EVENTS.SERVER.ROOMS, rooms);

      // emit back to the room creator with all the rooms
      // socket.emit(EVENTS.SERVER.ROOMS, rooms);
      // emit event back the room creator saying they have joined a room
      // socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    /*
     * When a user sends a room message
     */

    socket.on(EVENTS.CLIENT.SEND_MESSAGE, async ({ message, username }) => {
      const date = new Date();
      if (liveConnections > 1) {
        console.log(`NEW MESSAGE FROM ${username}`);
        socket.broadcast.emit(EVENTS.SERVER.NEW_MESSAGE, {
          message,
          username,
          time: `${date.getHours()}:${date.getMinutes()}`,
        });
      } else {
        addMessageToQueue(
          getReciever(username),
          {
            message,
            time: `${date.getHours()}:${date.getMinutes()}`,
            username,
          },
          redis
        );
        // Send notification is message is to me
        if (username != "Milan") {
          sendPoke(username, message)
        }
      }
    });

    /*
     * When a user joins a room
     */
    socket.on(EVENTS.CLIENT.JOIN_ROOM, (roomId) => {
      socket.join(roomId);

      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    socket.on(EVENTS.CLIENT.DOWNSTREAM, async (username: string) => {
      if (await redis.exists(`queue:${username}`)) {
        redis.del(`queue:${username}`);
      }
    });

    /**
     * When a user is poked
     */
    socket.on(EVENTS.CLIENT.POKE, async (username: string) => {
     sendPoke(username)
    });
  });
}

export default socket;
