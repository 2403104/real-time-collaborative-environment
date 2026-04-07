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
  const folders = vscode.workspace.workspaceFolders;
  if(!folders || folders.length == 0) return null;
  const root = folders[0].uri.fsPath;
  const absolute = uri.fsPath;
  if(!absolute.startsWith(root)) return null;
  const relative = absolute.slice(root.length).replace(/^[\\/]/, "");
  return relative.split(path.sep).join("/");
}