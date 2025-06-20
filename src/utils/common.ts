import fs from "fs";
import path from "path";
import { redis } from "./redis";
import admin from "firebase-admin";
import { Message } from "../types";
import { USER_TWO } from "./constants";
export const getReciever = (username: string) =>
  username == "Milan" ? USER_TWO : "Milan";

export const getNotificationMessage = (): { heading: string; body: string } => {
  const messagesFilePath = path.join(
    __dirname,
    "../../src/data/notifications.json"
  );
  const data = fs.readFileSync(messagesFilePath, "utf8");
  const allMessages = [...JSON.parse(data).taskMessages];
  return allMessages[Math.floor(Math.random() * allMessages.length)];
};

export const sendPoke = async (username: string, message?: string) => {
  // if (process.env.ENV == "local") return;
  const toSend = getReciever(username);
  console.log(`Sending poke to ${toSend}`);
  const msg = message
    ? {
        heading: `New message!`,
        body: message,
      }
    : getNotificationMessage();
  try {
    await admin.messaging().send({
      notification: {
        title: msg.heading,
        body: msg.body,
      },
      topic: toSend,
    });
  } catch (error) {
    console.log(error);
  }
};

export const sendDelivered = async (
  username: string,
  messageId: string,
  message: Message
) => {
  // if (process.env.ENV == "local") return;
  const toSend = getReciever(username);
  if (!toSend) return;
  try {
    const res = await admin.messaging().send({
      data: {
        type: "DELIVERED",
        message: JSON.stringify(message),
      },
      topic: toSend,
    });
    console.log(res);
  } catch (error) {
    console.log(error);
  }
};

export const sendSwitchNotif = async (username: string) => {
  // if (process.env.ENV == "local") return;
  try {
    const res = await admin.messaging().send({
      data: {
        switchnotif: "true",
      },
      topic: username,
    });
    console.log(res);
  } catch (error) {
    console.log(error);
  }
};
