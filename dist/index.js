"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_1 = __importDefault(require("./socket"));
const port = 5000;
// const nextApp = next({ dev: true });
// const handle = nextApp.getRequestHandler();
//  nextApp.prepare().then(() => {
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
app.get("/", (req, res) => {
    res.json({ status: true, message: "Ok" });
});
httpServer.listen(port, "0.0.0.0", () => {
    // logger.info(`Server is listening port ${port}`);
    (0, socket_1.default)({ io });
});
// });
