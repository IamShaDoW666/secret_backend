import { createClient } from "redis";
import { Message } from "../types";

// LIVE
export const redis = createClient({
  password: "WTMdjPmMqMZVXB95PQZGpmsvAKz3Tppl",
  socket: {
    host: "redis-12998.c264.ap-south-1-1.ec2.redns.redis-cloud.com",
    port: 12998,
  },
});

// LOCAL

// export const redis = createClient({
//   password: 'F2qRiYnMyUWGTh7yCptYTuYXpjTFxrmu',
//   socket: {
//       host: 'redis-14216.c264.ap-south-1-1.ec2.redns.redis-cloud.com',
//       port: 14216
//   }
// });

redis.connect();

redis.on("error", (err) => console.log("Redis Client Error", err));

export const useRedis = async () => {
  return await redis.connect();
};

export async function addMessageToQueue(
  username: string,
  message: Message,
  client: any
) {
  const messageData = JSON.stringify(message);
  client.rPush(`queue:${username}`, messageData);
}

export async function getAllMessages(
  username: string,
  client: any
): Promise<Message[]> {
  const messages = await client.lRange(`queue:${username}`, 0, -1);
  return messages.map((message: string) => JSON.parse(message) as Message);
}
