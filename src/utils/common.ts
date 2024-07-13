import fs from "fs";
import path from "path";
import { redis } from "./redis";
import admin from "firebase-admin";

export const getReciever = (username: string) =>
  username == "Milan" ? "Malu" : "Milan";

export const getNotificationMessage = (): { heading: string; body: string } => {
  const messagesFilePath = path.join(__dirname, "../data/notifications.json");
  const data = fs.readFileSync(messagesFilePath, "utf8");
  const allMessages = [...JSON.parse(data).taskMessages];
  return allMessages[Math.floor(Math.random() * allMessages.length)];
};

export const sendPoke = async (username: string, message?: string) => {
  if (process.env.ENV == 'local') return
  const toSend = getReciever(username);
  const tokenToSend = await redis.get(`subscribe:${toSend}`);
  const msg = message
    ? {
        heading: `New message!`,
        body: message,
      }
    : getNotificationMessage();
  // await admin.messaging().send({
  //   notification: {
  //     title: msg.heading,
  //     body: msg.body,
  //   },
  //   token: tokenToSend!,
  // });
};
