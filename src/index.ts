import express, { Request, Response, Express, response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import socket, { EVENTS } from "./socket";
import { redis } from "./utils/redis";
import { initFirebase } from "./utils/firebase";
import { Message } from "./types";
import dotenv from "dotenv";
import { sendDelivered, sendSwitchNotif } from "./utils/common";
import { USER_TWO } from "./utils/constants";
import path from "path";
dotenv.config();
const port = 5100;
// const port = process.env.PORT ? parseInt(process.env.PORT) : 5100;
const INSTANCE_ID = Math.random().toString(36).slice(2, 8); // Unique ID
const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
initFirebase();

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req: Request, res: Response) => {
  res.json({ status: true, message: "Ok", id: INSTANCE_ID });
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

app.post(
  "/deliveryAck",
  async (
    req: Request<{}, {}, { messageId: string; username: string }>,
    res
  ) => {
    const { messageId, username } = req.body;
    // console.log(`DELIVERY ACK CAME IN`);
    if (messageId && username) {
      try {
        const msg = JSON.parse(
          (await redis.lindex(`queue:${username}`, -1))!
        ) as Message;
        console.log(msg);
        msg.status = "RECEIVED";
        await redis.lset(`queue:${username}`, -1, JSON.stringify(msg));
        // sendDelivered(username, messageId, msg);
        if (response) {
          res.status(200).json({ success: true });
        } else {
          res.status(500).json({ success: false });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ success: false });
      }
    }
  }
);

app.get("/switchnotif", async (req: Request, res) => {
  try {
    sendSwitchNotif(USER_TWO);
    res.status(200).json({ success: true, message: "Notification Switched!" });
  } catch (error) {
    console.error("Error sending switch notification:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to send notification" });
  }
});

app.get("/token", async (req: Request<{}, {}, { username: string }>, res) => {
  const { username } = req.query;
  if (username) {
    const response = await redis.get(`subscribe:${username}`);
    if (response) {
      res.status(200).json({ success: true, token: response });
    } else {
      res.status(200).json({ success: true, token: null });
    }
  } else {
    res.status(500).json({ success: false });
  }
});

app.get(
  "/last-online",
  async (req: Request<{}, {}, { username: string }>, res) => {
    const { username } = req.query;
    if (username) {
      const response = await redis.hgetall(`time:${username}`);
      if (response) {
        res.status(200).json({ success: true, data: response });
      } else {
        res.status(500).json({ success: false });
      }
    } else {
      res.status(500).json({ success: false });
    }
  }
);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Server online on port: ${port}`);
  socket({ io });
});
