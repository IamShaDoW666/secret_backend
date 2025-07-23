# syntax=docker/dockerfile:1.4
FROM node:18-alpine

WORKDIR /app

COPY package.json /app
COPY pnpm-lock.yaml /app

RUN npm install -g pnpm

RUN pnpm install

RUN --mount=type=secret,id=firebase_key,target=/run/secrets/firebase-key.json \
    base64 -d /run/secrets/firebase-key.json > src/data/firebase-key.json

COPY . .

RUN pnpm build

EXPOSE 5100

CMD ["pnpm", "start"]
