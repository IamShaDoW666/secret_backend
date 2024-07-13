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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPoke = exports.getNotificationMessage = exports.getReciever = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const redis_1 = require("./redis");
const getReciever = (username) => username == "Milan" ? "Malu" : "Milan";
exports.getReciever = getReciever;
const getNotificationMessage = () => {
    const messagesFilePath = path_1.default.join(__dirname, "../data/notifications.json");
    const data = fs_1.default.readFileSync(messagesFilePath, "utf8");
    const allMessages = [...JSON.parse(data).taskMessages];
    return allMessages[Math.floor(Math.random() * allMessages.length)];
};
exports.getNotificationMessage = getNotificationMessage;
const sendPoke = (username, message) => __awaiter(void 0, void 0, void 0, function* () {
    if (process.env.ENV == 'local')
        return;
    const toSend = (0, exports.getReciever)(username);
    const tokenToSend = yield redis_1.redis.get(`subscribe:${toSend}`);
    const msg = message
        ? {
            heading: `New message!`,
            body: message,
        }
        : (0, exports.getNotificationMessage)();
    // await admin.messaging().send({
    //   notification: {
    //     title: msg.heading,
    //     body: msg.body,
    //   },
    //   token: tokenToSend!,
    // });
});
exports.sendPoke = sendPoke;
