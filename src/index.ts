import express, { Request, Response, Express } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import socket from "./socket";

const port = 5000;
// const nextApp = next({ dev: true });
// const handle = nextApp.getRequestHandler();

//  nextApp.prepare().then(() => {
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.get("/", (req: Request, res: Response) => {
  res.json({ status: true, message: "Ok" });
});

httpServer.listen(port, "0.0.0.0", () => {
  socket({ io });
});
// });
