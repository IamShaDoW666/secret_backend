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
exports.getAllMessages = exports.addMessageToQueue = exports.redis = exports.client = void 0;
const redis_1 = require("redis");
exports.client = (0, redis_1.createClient)({
    password: "WTMdjPmMqMZVXB95PQZGpmsvAKz3Tppl",
    socket: {
        host: "redis-12998.c264.ap-south-1-1.ec2.redns.redis-cloud.com",
        port: 12998,
    },
});
exports.client.on("error", (err) => console.log("Redis Client Error", err));
const redis = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield exports.client.connect();
});
exports.redis = redis;
function addMessageToQueue(username, message, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const messageData = JSON.stringify(message);
        client.rPush(`queue:${username}`, messageData);
    });
}
exports.addMessageToQueue = addMessageToQueue;
function getAllMessages(username, client) {
    return __awaiter(this, void 0, void 0, function* () {
        const messages = yield client.lRange(`queue:${username}`, 0, -1);
        return messages.map((message) => JSON.parse(message));
    });
}
exports.getAllMessages = getAllMessages;
