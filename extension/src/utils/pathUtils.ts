import * as vscode from "vscode";
import * as path from "path";

function getWorkspaceRoot(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return null;
  return folders[0].uri.fsPath;
}

export function resolveAbsolutePath(relativePath: string): string | null {
  const root = getWorkspaceRoot();;
  if(!root) return null;
  return path.join(root, relativePath);
}

export function getRelativePath(uri: vscode.Uri) : string | null {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) return null;
  const relative = vscode.workspace.asRelativePath(uri, false);
  if (!relative || relative.startsWith("..")) return null;
  return relative.replace(/\\/g, "/");
}