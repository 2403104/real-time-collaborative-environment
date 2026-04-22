import * as vscode from "vscode";
import WebSocket from "ws";
import config from "../config";
import { getSession } from "../utils/session";
import { LocalManfest } from "../utils/manifest";

export let isSyncing = false;

let syncQueue: any[][] = [];
let isProcessingQueue = false;
let processedCount = 0;
let totalFiles = 0;
let progressReporter: vscode.Progress<{message?: string; increment?: number}> | null = null;
let syncResolve: (() => void) | null = null;

export async function startSync(clientManifest: LocalManfest = {}): Promise<void> {
  const session = getSession();
  if (!session.sessionKey) return;

  isSyncing = true;
  syncQueue = [];
  isProcessingQueue = false;
  processedCount = 0;
  totalFiles = 0;

  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Syncing Workspace",
    cancellable: false,
  }, async (progress) => {
    progressReporter = progress;
    progress.report({ message: "Connecting..." });

    await new Promise<void>((resolve, reject) => {
      syncResolve = resolve;

      const ws = new WebSocket(`${config.server.url}/sync`);

      ws.on("open", () => {
        progress.report({ message: "Requesting sync..." });
        ws.send(JSON.stringify({
          type: "SYNC_REQUEST",
          sessionKey: session.sessionKey,
          clientManifest,
        }));
      });

      ws.on("message", async (data) => {
        try {
          const msg = JSON.parse(data.toString());
          await handleSyncMessage(msg, ws);
        } catch (err) {
          console.error("[Sync] Failed to parse message:", err);
        }
      });

      ws.on("error", (err) => {
        console.error("[Sync] WebSocket error:", err.message);
        reject(err);
      });

      ws.on("close", () => {});
    });

    vscode.window.showInformationMessage("Workspace synced!");
  });

  setTimeout(() => { isSyncing = false; }, 500);
};

async function handleSyncMessage(msg: any, ws: WebSocket): Promise<void> {
  switch(msg.type) {
    case "SYNC_START":
      totalFiles = msg.totalFiles;
      processedCount = 0;
      progressReporter?.report({message: `0 / ${totalFiles} Synced`});
      break;
    case "SYNC_DELETE":
      for (const path of (msg.toDelete ?? [])) {
        const uri = resolveUri(path);
        if (!uri) continue
        await Promise.resolve(vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false })).catch(() => {});
        processedCount++;
        const increment = totalFiles > 0 ? (1 / totalFiles) * 100 : 0;
        progressReporter?.report({
          increment,
          message: `${processedCount} / ${totalFiles} Synced`
        });
      }
      break;
    case "SYNC_CHUNK":
      syncQueue.push(msg.files);
      processSyncQueue();
      break;
    case "SYNC_COMPLETE":
      ws.close(1000);
      const interval = setInterval(() => {
        if (syncQueue.length === 0 && !isProcessingQueue) {
          clearInterval(interval);
          syncResolve?.();
        }
      }, 100);
      break;
    case "SYNC_ERROR":
      vscode.window.showErrorMessage(`Sync Failed : ${msg.message}`);
      syncResolve?.();
      break;
  }
}

async function processSyncQueue(): Promise<void> {
  if(isProcessingQueue || syncQueue.length === 0) return;
  const encoder = new TextEncoder();
  isProcessingQueue = true;
  while(syncQueue.length > 0) {
    const batch = syncQueue.shift();
    if(!batch) continue;
    for(const node of batch) {
      const uri = resolveUri(node.path);
      if(!uri) continue;
      if(node.type === "folder") {
        await vscode.workspace.fs.createDirectory(uri);
      } else if(node.type === "file") {
        const parentUri = vscode.Uri.joinPath(uri, "..");
        await vscode.workspace.fs.createDirectory(parentUri);
        await vscode.workspace.fs.writeFile(uri, encoder.encode(node.content));
      }
      processedCount++;
      const increment = totalFiles > 0 ? (1 / totalFiles) * 100 : 0;
      progressReporter?.report({
        increment,
        message: `${processedCount} / ${totalFiles} Synced`
      });
    }
  } 
  isProcessingQueue = false;
}
function resolveUri(relativePath: string): vscode.Uri | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return vscode.Uri.joinPath(folders[0].uri, relativePath);
}