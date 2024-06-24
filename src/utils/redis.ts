import { createClient, type RedisClientType } from "redis";
import { Message } from "../types";
import { promisify } from "util";

export const client = createClient({
  password: "WTMdjPmMqMZVXB95PQZGpmsvAKz3Tppl",
  socket: {
    host: "redis-12998.c264.ap-south-1-1.ec2.redns.redis-cloud.com",
    port: 12998,
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));

export const redis = async () => {
  return await client.connect();
};

export async function addMessageToQueue(
  username: string,
  message: Message,
  client: any
) {
  const messageData = JSON.stringify(message);
  client.rPush(`queue:${username}`, messageData);
}

export async function getAllMessages(username: string, client: any): Promise<Message[]> {
  const messages = await client.lRange(`queue:${username}`, 0, -1);
  return messages.map((message: string) => JSON.parse(message) as Message);
}