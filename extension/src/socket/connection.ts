import * as vscode from "vscode";
import WebSocket from "ws";
import config from "../config";
import { getSession } from "../utils/session";
import { routeMessage } from "./eventEmitter";
import { notifyConnecting, notifyReconnectFailed, notifyConnected, showMessage } from "../ui/notifications";

let ws: WebSocket | null = null;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

let reconnectTimer: NodeJS.Timeout | null = null;

export function createNewSession(workspaceName: string): void {
  const session = getSession();
  
  notifyConnecting("Creating new session...");
  
  const url = 
    `${config.server.url}` + 
    `?action=new_session` + 
    `&username=${encodeURIComponent(session.username)}` + 
    `&machineId=${encodeURIComponent(session.machineId)}` +
    `&workspaceName=${encodeURIComponent(workspaceName)}`;
    
  _createConnection(url, "new_session");
}

export function joinExistingSession(sessionKey: string): void {
  const session = getSession();
  
  notifyConnecting(`Joining session ${sessionKey}...`);
  
  const url = 
    `${config.server.url}` + 
    `?action=join_session` + 
    `&username=${encodeURIComponent(session.username)}` + 
    `&machineId=${encodeURIComponent(session.machineId)}` +
    `&sessionKey=${encodeURIComponent(sessionKey)}`;
    
  _createConnection(url, "join_session");
}

function _createConnection(url: string, action: string): void {
  if (ws) {
    ws.close(1000);
    ws = null;
  }
  
  ws = new WebSocket(url);
  
  ws.on("open", () => {
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    notifyConnected(action);
  });
  
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      try {
        routeMessage(message);
      } catch (err: any) {
        console.error("[Sync] Failed to handle message:", message?.type, err?.message ?? err);
      }
    } catch (err: any) {
      console.error("[Sync] Failed to parse message:", data.toString());
    }
  });
  
  ws.on("close", (code: number) => {
    console.warn(`[Sync] Connection closed. Code: ${code}`);
    ws = null;
    if (code !== 1000) {
      _scheduleReconnect();
    }
  });
  
  ws.on("error", (err: Error) => {
    console.error("[Sync] WebSocket error:", err.message);
  });
}

function _scheduleReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    notifyReconnectFailed();
    return;
  }
  
  const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
  reconnectAttempts++;
  
  reconnectTimer = setTimeout(() => {
    const key = getSession().sessionKey;
    if (key) {
      joinExistingSession(key);
    }
  }, delayMs);
}

export function send(message: object): void { // will be used this to send to the server
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    console.warn("[Sync] Cannot send — not connected.");
  }
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close(1000);
    ws = null;
  }
  showMessage("Sync: Disconnected from server.");
}

export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}