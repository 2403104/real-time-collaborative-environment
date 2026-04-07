import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import { initSession, setSession, clearSession } from "./utils/session";
import { createNewSession, joinExistingSession, disconnect } from "./socket/connection";
import { notifyLeft, showError, showWarning } from "./ui/notifications";
import { register } from "module";
import { registerFileTreeHandlers } from "./handlers/fileTreeHandler";
import { authHandler } from "./handlers/authHandler";
import { registerEditHandlers } from "./handlers/editHandler";

const SYNC_FILE = ".sync.json"
const GITIGNORE = ".gitignore";

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if(!folders || folders.length == 0) return null;
  return folders[0].uri.fsPath;
}

function getSyncFilePath(): string {
  const workspaceRoot = getWorkspaceRoot();
  if(!workspaceRoot) return "";
  return path.join(workspaceRoot, SYNC_FILE);
}

export function readSyncJsonFile(): string | null {
  const syncFilePath = getSyncFilePath();
  if(!syncFilePath) return null;
  try {
    if(!fs.existsSync(syncFilePath)) return null;
    const content = fs.readFileSync(syncFilePath, "utf-8");
    const parsed = JSON.parse(content);
    return parsed.sessionKey ?? null;
  } catch (error) {
    return null;
  }
}

export function writeSyncJsonFile(sessionKey: string): void {
  const syncFilePath = getSyncFilePath();
  if (!syncFilePath) return;
  try {
    let existingData: any = {};
    if (fs.existsSync(syncFilePath)) {
      const content = fs.readFileSync(syncFilePath, "utf-8");
      
      if (content.trim() !== "") {
        existingData = JSON.parse(content);
      }
    }
    existingData.sessionKey = sessionKey;
    const newData = JSON.stringify(existingData, null, 2);
    fs.writeFileSync(syncFilePath, newData);
    addToGitignore();

    console.log("[Sync] .sync.json updated.");
  } catch (err: any) {
    console.error("[Sync] Failed to update .sync.json:", err.message);
  }
}

function addToGitignore(): void {
  const root = getWorkspaceRoot();
  if(!root) return;
  const gitignorePath = path.join(root, GITIGNORE);
  try {
    let content = "";
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, "utf-8");
    }
    const lines = content.split("\n").map((l) => l.trim());
    if(!lines.includes(SYNC_FILE)) {
      const entry = content.endsWith("\n") || content === "" ?
        SYNC_FILE
        : "\n" + SYNC_FILE;
      fs.writeFileSync(gitignorePath, content + entry);
      console.log("[Sync] .gitignore updated.");
    }
  } catch (err: any) {
    console.error("[Sync] Failed to update .gitignore:", err.message);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  initSession();
  authHandler(context);
  registerFileTreeHandlers(context);
  registerEditHandlers(context);
}

export function deactivate(): void {}