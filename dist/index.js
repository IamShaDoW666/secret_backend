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
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_1 = __importDefault(require("./socket"));
const redis_1 = require("./utils/redis");
const firebase_1 = require("./utils/firebase");
const port = 5000;
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
(0, firebase_1.initFirebase)();
app.get("/", (req, res) => {
    res.json({ status: true, message: "Ok" });
});
app.use(express_1.default.json());
app.post("/subscribe", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token, username } = req.body;
    console.log(`NEW TOKEN CAME IN`);
    if (token && username) {
        const response = yield redis_1.redis.set(`subscribe:${username}`, token);
        if (response) {
            res.status(200).json({ success: true, token: req.body.token });
        }
        else {
            res.status(500).json({ success: false });
        }
    }
}));
httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server online on port: ${port}`);
    (0, socket_1.default)({ io });
});
