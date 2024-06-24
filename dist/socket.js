"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const nanoid_1 = require("nanoid");
const redis_1 = require("./utils/redis");
const common_1 = require("./utils/common");
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
function socket({ io }) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let liveConnections = (_a = Number(yield redis_1.redis.get("connections"))) !== null && _a !== void 0 ? _a : 0;
        io.on(EVENTS.connection, (socket) => __awaiter(this, void 0, void 0, function* () {
            socket.onAny((event) => {
                console.warn(`EVENT: ${event}`);
            });
            socket.onAnyOutgoing((event) => {
                console.warn(`EVENT ==>: ${event}`);
            });
            const username = socket.handshake.query.username;
            socket.data.username = username;
            if (!(yield redis_1.redis.exists(username))) {
                socket.data.username = username;
                redis_1.redis.hSet(username, {
                    clientId: socket.id,
                    joined: new Date().toJSON(),
                    username,
                });
                console.log("BEFORE: CONNECTIONSS", liveConnections);
                liveConnections++;
                console.log("ADD CONNECTIONSS", liveConnections);
                redis_1.redis.set("connections", liveConnections);
            }
            console.info(`Client connected ${socket.id} ${liveConnections}`);
            io.emit(EVENTS.SERVER.CONNECTIONS, {
                connections: liveConnections,
            });
            if (yield redis_1.redis.exists(`queue:${username}`)) {
                socket.emit(EVENTS.SERVER.UPSTREAM, yield (0, redis_1.getAllMessages)(username, redis_1.redis));
            }
            /**
             * When a user disconnects
             */
            socket.on(EVENTS.disconnect, () => __awaiter(this, void 0, void 0, function* () {
                console.log(`Client disconnected ${socket.id}`);
                console.log(socket.data.username);
                if (yield redis_1.redis.exists(socket.data.username)) {
                    redis_1.redis.del(socket.data.username);
                    liveConnections--;
                    redis_1.redis.set("connections", liveConnections);
                }
                io.emit(EVENTS.SERVER.CONNECTIONS, {
                    connections: liveConnections,
                });
            }));
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
            socket.on(EVENTS.CLIENT.SEND_MESSAGE, ({ message, username }) => __awaiter(this, void 0, void 0, function* () {
                const date = new Date();
                if (liveConnections > 1) {
                    console.log(`NEW MESSAGE FROM ${username}`);
                    socket.broadcast.emit(EVENTS.SERVER.NEW_MESSAGE, {
                        message,
                        username,
                        time: `${date.getHours()}:${date.getMinutes()}`,
                    });
                }
                else {
                    (0, redis_1.addMessageToQueue)((0, common_1.getReciever)(username), {
                        message,
                        time: `${date.getHours()}:${date.getMinutes()}`,
                        username,
                    }, redis_1.redis);
                    // Send notification is message is to me
                    if (username != "Milan") {
                        (0, common_1.sendPoke)(username, message);
                    }
                }
            }));
            /*
             * When a user joins a room
             */
            socket.on(EVENTS.CLIENT.JOIN_ROOM, (roomId) => {
                socket.join(roomId);
                socket.emit(EVENTS.SERVER.JOINED_ROOM, roomId);
            });
            socket.on(EVENTS.CLIENT.DOWNSTREAM, (username) => __awaiter(this, void 0, void 0, function* () {
                if (yield redis_1.redis.exists(`queue:${username}`)) {
                    redis_1.redis.del(`queue:${username}`);
                }
            }));
            /**
             * When a user is poked
             */
            socket.on(EVENTS.CLIENT.POKE, ({ username }) => __awaiter(this, void 0, void 0, function* () {
                (0, common_1.sendPoke)(username);
            }));
        }));
    });
}
exports.default = socket;
