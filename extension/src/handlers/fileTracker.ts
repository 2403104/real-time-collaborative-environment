import * as vscode from "vscode";
import { send } from "../socket/connection";
import { getRelativePath, resolveAbsolutePath } from "../utils/pathUtils";
import { showMessage } from "../ui/notifications";
import { shouldIgnore } from "../utils/ignoreFilter";

export function registerFileTracker(context: vscode.ExtensionContext) : void {
  const onOpen = vscode.workspace.onDidOpenTextDocument((document) => {
    const relativePath = getRelativePath(document.uri);
    if(!relativePath) return;
    if(shouldIgnore(relativePath)) return;
    send({
      type: "FILE_OPEN",
      filePath: relativePath
    });  
  });
  const onClose = vscode.workspace.onDidCloseTextDocument((document) => {
    const relativePath = getRelativePath(document.uri);
    if(!relativePath) return;
    if(shouldIgnore(relativePath)) return;
    send({
      type: "FILE_CLOSE",
      filePath: relativePath
    });  
  });
  context.subscriptions.push(onOpen, onClose);
}

export interface FileTreeNode {
  type: "file" | "folder";
  path: string;
  content: string | null;
}

export let isSyncingFileTree = false;

export async function handleFileTree(fileTree: FileTreeNode[]) : Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage("[Sync] Please open a folder to sync the workspace.");
    return;
  }
  isSyncingFileTree = true;
  try {
    const encoder = new TextEncoder();
    for(const node of fileTree) {
      if(node.type == "folder") {
        const absolutePath = resolveAbsolutePath(node.path);
        if(!absolutePath) continue;
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(absolutePath));
      }
    }
    for(const node of fileTree) {
      if(node.type == "file") {
        const absolutePath = resolveAbsolutePath(node.path);
        if(!absolutePath) continue;
        const uri = vscode.Uri.file(absolutePath);
        await vscode.workspace.fs.writeFile(uri, encoder.encode(node.content ?? ""));
      }
    }
    showMessage("[FileTree] File tree synced successfully.");

  } catch (err: any) {
    console.error(`[Sync] Failed to construct file tree: ${err.message}`);
    vscode.window.showErrorMessage("Failed to sync workspace.");
  } finally {
    setTimeout(() => {
      isSyncingFileTree = false;
    }, 1000);
  }
}