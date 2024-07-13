import express, { Request, Response, Express, response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import socket from "./socket";
import { redis } from "./utils/redis";
import { initFirebase } from "./utils/firebase";

const port = 5000;
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
initFirebase();
app.get("/", (req: Request, res: Response) => {
  res.json({ status: true, message: "Ok" });
});

app.use(express.json());

app.post(
  "/subscribe",
  async (req: Request<{}, {}, { token: string; username: string }>, res) => {
    const { token, username } = req.body;
    console.log(`NEW TOKEN CAME IN`);
    if (token && username) {
      const response = await redis.set(`subscribe:${username}`, token);
      if (response) {
        res.status(200).json({ success: true, token: req.body.token });
      } else {
        res.status(500).json({ success: false });
      }
    }
  }
);

app.get("/token", async (req: Request<{}, {}, { username: string }>, res) => {
  const { username } = req.query;
  if (username) {
    const response = await redis.get(`subscribe:${username}`);
    if (response) {
      res.status(200).json({ success: true, token: response });
    } else {
      res.status(500).json({ success: false });
    }
  } else {
    res.status(500).json({ success: false });
  }
});

app.get("/last-online", async (req: Request<{}, {}, { username: string }>, res) => {
  const { username } = req.query;
  if (username) {
    const response = await redis.hGetAll(`time:${username}`);
    if (response) {
      res.status(200).json({ success: true, data: response });
    } else {
      res.status(500).json({ success: false });
    }
  } else {
    res.status(500).json({ success: false });
  }
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server online on port: ${port}`);
  socket({ io });
});
