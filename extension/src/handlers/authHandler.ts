import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { showError, showWarning, notifyLeft } from "../ui/notifications";
import { createNewSession, joinExistingSession } from "../socket/connection";
import {  clearSession } from "../utils/session";
import { disconnect } from "../socket/connection";
import { readSyncJsonFile } from "../extension";

export function authHandler(context: vscode.ExtensionContext): void {
  // Will connect automatically
  // const savedSessionKey = readSyncJsonFile();
  // if (savedSessionKey) {
  //   setSession({ sessionKey: savedSessionKey });
  //   joinExistingSession(savedSessionKey);
  // }

  const newSessionCmd = vscode.commands.registerCommand(
    "sync.newSession",
    async () => {
      const folders = vscode.workspace.workspaceFolders;
      if(!folders || folders.length == 0) {
        showError("Sync: Please open a workspace folder first.");
        return;
      }
      const workspacename = folders[0].name;
      createNewSession(workspacename);
    }
  );
  const joinSessionCmd = vscode.commands.registerCommand(
    "sync.joinSession",
    async () => {
      const savedSessionKey = readSyncJsonFile();
      const sessionKey = await vscode.window.showInputBox({
        prompt: "Enter Existing Session Key",
        placeHolder: "e.g. 550e8400-e29b-41d4-a716-446655440000",
        value: savedSessionKey ?? "",
        ignoreFocusOut: true
      });
      if (!sessionKey || sessionKey.trim() === ""){
        showWarning("Sync: No session key entered.");
        return;
      }
      joinExistingSession(sessionKey.trim());
    }
  );
  const leaveSessionCmd = vscode.commands.registerCommand(
    "sync.leaveSession",
    () => {
      disconnect();
      clearSession();
      notifyLeft();
    }
  );
  context.subscriptions.push(newSessionCmd, joinSessionCmd, leaveSessionCmd);
}