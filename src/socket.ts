import { Server, Socket } from "socket.io";
import logger from "./utils/logger";
import { nanoid } from "nanoid";

const EVENTS = {
  connection: "connection",
  disconnect: "disconnect",
  CLIENT: {
    CREATE_ROOM: "CREATE_ROOM",
    SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
    JOIN_ROOM: "JOIN_ROOM",
    JOINED: "JOINED",
  },
  SERVER: {
    ROOMS: "ROOMS",
    JOINED_ROOM: "JOINED_ROOM",
    ROOM_MESSAGE: "ROOM_MESSAGE",
    IN_CHAT: "IN_CHAT",
    LEFT_CHAT: "LEFT_CHAT",
  },
};

const rooms: Record<string, { name: string }> = {};

function socket({ io }: { io: Server }) {
  logger.info(`Sockets enabled`);

  io.on(EVENTS.connection, (socket: Socket) => {
    socket.join("1");
    logger.info(`Client connected ${socket.id}  (${JSON.stringify(rooms)})`);
    socket.emit(EVENTS.SERVER.ROOMS, {connections: io.sockets.sockets.size});
    socket.on(EVENTS.CLIENT.JOINED, () => {
      logger.info(`Joinedd ${io.sockets.sockets.size}`)
      if (io.sockets.sockets.size > 1) {
        logger.info("INCHAT");
        socket.to("1").emit(EVENTS.SERVER.IN_CHAT);
      } else {
        logger.info("LEFT");
        socket.to("1").emit(EVENTS.SERVER.LEFT_CHAT);
      }
    });

    /**
     * When a user disconnects
     */
    socket.on(EVENTS.disconnect, () => {
      logger.info(`Client disconnected ${socket.id}`);
      if (io.sockets.sockets.size > 1) {
        logger.info("INCHAT");
        socket.to("1").emit(EVENTS.SERVER.IN_CHAT);
      } else {
        logger.info("LEFT");
        socket.to("1").emit(EVENTS.SERVER.LEFT_CHAT);
      }
    });

    /*
     * When a user creates a new room
     */
    socket.on(EVENTS.CLIENT.CREATE_ROOM, ({ roomName }) => {
      console.log({ roomName });
      // create a roomId
      const roomId = nanoid();
      // add a new room to the rooms object
      rooms[roomId] = {
        name: roomName,
      };

      socket.join(roomId);

      // broadcast an event saying there is a new room
      socket.broadcast.emit(EVENTS.SERVER.ROOMS, rooms);

      // emit back to the room creator with all the rooms
      socket.emit(EVENTS.SERVER.ROOMS, rooms);
      // emit event back the room creator saying they have joined a room
      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });

    /*
     * When a user sends a room message
     */

    socket.on(
      EVENTS.CLIENT.SEND_ROOM_MESSAGE,
      ({ roomId, message, username }) => {
        const date = new Date();
        logger.info(`New Message from ${username}: ${message}`);
        socket.to(roomId).emit(EVENTS.SERVER.ROOM_MESSAGE, {
          message,
          username,
          time: `${date.getHours()}:${date.getMinutes()}`,
        });
      }
    );

    /*
     * When a user joins a room
     */
    socket.on(EVENTS.CLIENT.JOIN_ROOM, (roomId) => {
      socket.join(roomId);

      socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
    });
  });
}

export default socket;
