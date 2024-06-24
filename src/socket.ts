import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { addMessageToQueue, getAllMessages, redis } from "./utils/redis";

const EVENTS = {
  connection: "connection",
  disconnect: "disconnect",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    SEND_MESSAGE: "SEND_MESSAGE",
    JOIN_ROOM: "JOIN_ROOM",
    DOWNSTREAM: "DOWNSTREAM",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    NEW_MESSAGE: "NEW_MESSAGE",
    CONNECTIONS: "CONNECTIONS",
    UPSTREAM: "UPSTREAM",
  },
};

async function socket({ io }: { io: Server }) {
  const redisClient = await redis();
  let liveConnections = Number(await redisClient.get("connections")) ?? 0;
  io.on(EVENTS.connection, async (socket: Socket) => {

    socket.onAny((event) => {
      console.warn(`EVENT: ${event}`);
    });
    socket.onAnyOutgoing((event) => {
      console.warn(`EVENT ==>: ${event}`);
    });

    const username = socket.handshake.query.username as string;
    socket.data.username = username;
    if (!(await redisClient.exists(username))) {
      socket.data.username = username;
      redisClient.hSet(username, {
        clientId: socket.id,
        joined: new Date().toJSON(),
        username,
      }); 
      console.log("BEFORE: CONNECTIONSS", liveConnections)
      liveConnections++;
      console.log("ADD CONNECTIONSS", liveConnections)
      redisClient.set("connections", liveConnections);
    }

    console.info(`Client connected ${socket.id} ${liveConnections}`);

    io.emit(EVENTS.SERVER.CONNECTIONS, {
      connections: liveConnections,
    });

    if (await redisClient.exists(`queue:${username}`)) {
      socket.emit(
        EVENTS.SERVER.UPSTREAM,
        await getAllMessages(username, redisClient)
      );
    }


    /**
     * When a user disconnects
     */
    socket.on(EVENTS.disconnect, async () => {
      console.log(`Client disconnected ${socket.id}`);
      console.log(socket.data.username);
      if (await redisClient.exists(socket.data.username)) {
        redisClient.del(socket.data.username);
        liveConnections--;
        redisClient.set("connections", liveConnections);
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

    socket.on(
      EVENTS.CLIENT.SEND_MESSAGE,
      async ({ message, username }) => {
        const date = new Date();
        if (liveConnections > 1) {
          console.log(`NEW MESSAGE FROM ${username}`)
          socket.broadcast.emit(EVENTS.SERVER.NEW_MESSAGE, {
            message,
            username,
            time: `${date.getHours()}:${date.getMinutes()}`,
          });
        } else {
          addMessageToQueue(
            username === "Malu" ? "Milan" : "Malu",
            {
              message,
              time: `${date.getHours()}:${date.getMinutes()}`,
              username,
            },
            redisClient
          );
        }
      }
    );

    /*
     * When a user joins a room
     */
    socket.on(EVENTS.CLIENT.JOIN_ROOM, (roomId) => {
      socket.join(roomId);

      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    socket.on(EVENTS.CLIENT.DOWNSTREAM, async (username: string) => {
      if (await redisClient.exists(`queue:${username}`)) {
        redisClient.del(`queue:${username}`);
      }
    });
  });
}

export default socket;
