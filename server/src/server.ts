import http from "http"
import express from "express"
import {WebSocketServer, WebSocket} from "ws"

import { onConnection } from "./handlers/onConnection"
import { onDisconnect } from "./handlers/onDisconnect"
import { onMessage } from "./handlers/onMessage"

import { getUserFromWs } from "./session/sessionManager"
import { connectMongo } from "./db/mongo"
import { connectRedis } from "./db/redis"

const PORT = process.env.PORT || 8080;
const app = express();

app.get("/health", (req, res) => {
  res.status(200).send("OK");
})

const server = http.createServer(app);
const wss = new WebSocketServer({server});

wss.on("connection", async (ws: WebSocket, req: http.IncomingMessage) => {
  try {
    await onConnection(ws, req);
    if(ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED) {
      return;
    }
    ws.on("message", async(data: any) => {
      const connectedUser = getUserFromWs(ws);
      if(connectedUser) {
        await onMessage(connectedUser, data); 
      } else {
        console.warn("[Server] Received message from an unregistered socket.");
      }
    });
    
    ws.on("close", async() => {
      await onDisconnect(ws);
    });

    ws.on("error", async() => {
      await onDisconnect(ws);
    });
  } catch (err: any) {
    console.error("[Server] Critical error during connection:", err);
    ws.close(1011, "Internal Server Error");
  }
});

async function bootstrap(): Promise<void>  {
  await connectMongo();
  // await connectRedis();
  server.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
  });
  const shutdown = async (signal : string) => {
    console.log(`[Server] ${signal} — shutting down...`);
    await wss.close();
    await server.close();
    process.exit(0);
  }
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("[Server] Bootstrap failed:", err.message);
  process.exit(1);
})