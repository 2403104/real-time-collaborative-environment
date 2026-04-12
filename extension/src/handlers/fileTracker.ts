import * as vscode from "vscode";
import { send } from "../socket/connection";
import { getRelativePath } from "../utils/pathUtils";

export function registerFileTracker(context: vscode.ExtensionContext) : void {
  const onOpen = vscode.workspace.onDidOpenTextDocument((document) => {
    const relativePath = getRelativePath(document.uri);
    if(!relativePath) return;
    send({
      type: "FILE_OPEN",
      filePath: relativePath
    });  
  });
  const onClose = vscode.workspace.onDidCloseTextDocument((document) => {
    const relativePath = getRelativePath(document.uri);
    if(!relativePath) return;
    send({
      type: "FILE_CLOSE",
      filePath: relativePath
    });  
  });
  context.subscriptions.push(onOpen, onClose);
}