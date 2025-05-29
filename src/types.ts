export interface Message {
  id: string;
  message: string;
  username: string;
  path?: string; // path to the audio file if type is audio
  type: "text" | "audio";
  sent?: boolean;
  time: string;
  status: "SENDING" | "DELIVERED" | "RECEIVED" | "READ"; // 0: sending, 1: delivered, 2: received 3: read
}

export interface User {
  username: string;
  joined: Date;
  clientId: string;
}
