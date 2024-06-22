"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("./utils/logger"));
const nanoid_1 = require("nanoid");
const EVENTS = {
    connection: "connection",
    disconnect: "disconnect",
    CLIENT: {
        CREATE_ROOM: "CREATE_ROOM",
        SEND_ROOM_MESSAGE: "SEND_ROOM_MESSAGE",
        JOIN_ROOM: "JOIN_ROOM",
        JOINED: "JOINED",
        DOWNSTREAM: "DOWNSTREAM",
    },
    SERVER: {
        ROOMS: "ROOMS",
        JOINED_ROOM: "JOINED_ROOM",
        ROOM_MESSAGE: "ROOM_MESSAGE",
        IN_CHAT: "IN_CHAT",
        LEFT_CHAT: "LEFT_CHAT",
        CONNECTIONS: "CONNECTIONS",
        UPSTREAM: "UPSTREAM",
    },
};
// const rooms: Record<string, { name: string }> = {};
let messageQueue = [];
function socket({ io }) {
    logger_1.default.info(`Sockets enabled`);
    console.log(`INITIAL QUEUE => ${messageQueue}`);
    io.on(EVENTS.connection, (socket) => {
        socket.join("1");
        logger_1.default.info(`Client connected ${socket.id}`);
        socket.emit(EVENTS.SERVER.ROOMS, { connections: io.sockets.sockets.size });
        socket.on(EVENTS.CLIENT.JOINED, () => {
            socket.emit(EVENTS.SERVER.ROOMS, {
                connections: io.sockets.sockets.size,
            });
            logger_1.default.info(`Joinedd ${io.sockets.sockets.size}`);
            socket.emit(EVENTS.SERVER.UPSTREAM, messageQueue);
            if (io.sockets.sockets.size > 1) {
                logger_1.default.info("INCHAT");
                socket.to("1").emit(EVENTS.SERVER.IN_CHAT);
            }
            else {
                logger_1.default.info("LEFT");
                socket.to("1").emit(EVENTS.SERVER.LEFT_CHAT);
            }
        });
        /**
         * When a user disconnects
         */
        socket.on(EVENTS.disconnect, () => {
            logger_1.default.info(`Client disconnected ${socket.id}`);
            socket.emit(EVENTS.SERVER.ROOMS, {
                connections: io.sockets.sockets.size,
            });
            if (io.sockets.sockets.size > 1) {
                logger_1.default.info("INCHAT");
                socket.to("1").emit(EVENTS.SERVER.IN_CHAT);
            }
            else {
                logger_1.default.info("LEFT");
                socket.to("1").emit(EVENTS.SERVER.LEFT_CHAT);
            }
        });
        /*
         * When a user creates a new room
         */
        socket.on(EVENTS.CLIENT.CREATE_ROOM, ({ roomName }) => {
            console.log({ roomName });
            // create a roomId
            const roomId = (0, nanoid_1.nanoid)();
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
        socket.on(EVENTS.CLIENT.SEND_ROOM_MESSAGE, ({ roomId, message, username }) => {
            const date = new Date();
            logger_1.default.info(`New Message from ${username}: ${message}`);
            if (io.sockets.sockets.size > 1) {
                socket.to(roomId).emit(EVENTS.SERVER.ROOM_MESSAGE, {
                    message,
                    username,
                    time: `${date.getHours()}:${date.getMinutes()}`,
                });
            }
            else {
                messageQueue.push({ message, time: `${date.getHours()}:${date.getMinutes()}`, username });
                console.log('ADD TO QUEUE =>', messageQueue);
            }
        });
        /*
         * When a user joins a room
         */
        socket.on(EVENTS.CLIENT.JOIN_ROOM, (roomId) => {
            socket.join(roomId);
            socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
        });
        socket.on(EVENTS.CLIENT.DOWNSTREAM, (username) => {
            console.log(`SLICE FOR ${username}`);
            messageQueue = messageQueue.filter(msg => msg.username === username);
            console.log(messageQueue);
        });
    });
}
exports.default = socket;
