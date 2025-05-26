import { Message } from "../types";
import { Redis } from "ioredis";

export const redis = new Redis({
  port: Number(process.env.REDIS_PORT!), // Redis port
  host: process.env.REDIS_HOST!, // Redis host
  username: process.env.REDIS_USERNAME!, // needs Redis >= 6
  password: process.env.REDIS_PASSWORD!,
  maxRetriesPerRequest: null,
});

export async function addMessageToQueue(
  username: string,
  message: Message,
  client: Redis
): Promise<boolean> {
  const messageData = JSON.stringify(message);
  try {
    await client.rpush(`queue:${username}`, messageData);
    return true;
  } catch (error) {
    console.error("Error adding message to queue:", error);
    return false;
  }
}

export async function getAllMessages(
  username: string,
  client: Redis
): Promise<Message[] | null> {
  try {
    const messages = await client.lrange(`queue:${username}`, 0, -1);
    return messages.map((message: string) => {
      const parsedMessage = JSON.parse(message) as Message;
      return {
        ...parsedMessage,
        status: "RECEIVED",
      };
    });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return null;
  }
}
