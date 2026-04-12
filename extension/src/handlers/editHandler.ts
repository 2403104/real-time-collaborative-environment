import * as vscode from "vscode";
import { getRelativePath, resolveAbsolutePath } from "../utils/pathUtils";
import { send } from "../socket/connection";

export let expectedRemoteEdits = new Set<string> ();

async function applyEditWithRetry(edit: vscode.WorkspaceEdit, retries = 3) : Promise<boolean> {
  for(let retry = 0; retry < retries; retry++) {
    const success = await vscode.workspace.applyEdit(edit);
    if(success) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));  
  }
  return false;
}

export function registerEditHandlers(context: vscode.ExtensionContext): void {
  const onFileEdit = vscode.workspace.onDidChangeTextDocument((event) => {
    if(event.document.uri.scheme !== "file") return;
    const relativePath = getRelativePath(event.document.uri);
    if(!relativePath) return;
    for(const change of event.contentChanges)  {
      const offset = event.document.offsetAt(change.range.start);
      const length = change.rangeLength;
      const text = change.text;
      const signature = `${relativePath}:${offset}:${length}:${text}`; // Unique signature
      if(expectedRemoteEdits.has(signature)) {
        expectedRemoteEdits.delete(signature);
        continue;
      }
      send({
        type: "FILE_EDIT",
        filePath: relativePath,
        offset: offset,
        length: length,
        text: text
      });
    }
  });
  context.subscriptions.push(onFileEdit);
}

export async function handleIncomingFileEdit(message: {
  filePath: string,
  offset: number,
  length: number,
  text: string
}) : Promise<void> {
  const {filePath, offset, length, text} = message;
  const absolutePath = resolveAbsolutePath(filePath);
  if(!absolutePath) return;
  const uri = vscode.Uri.file(absolutePath);
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const startPosition = document.positionAt(offset);
    const endPosition = document.positionAt(offset + length);
    const range = new vscode.Range(startPosition, endPosition);

    const signature = `${filePath}:${offset}:${length}:${text}`; // Unique signature

    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, range, text);
    expectedRemoteEdits.add(signature);
    const success = await applyEditWithRetry(edit);
    if(success) {
      await document.save();
    }
  } catch (err: any) {
    console.error(`[Sync] Failed to apply remote edit: ${err.message}`);
  } finally {
    setTimeout(() => {
      expectedRemoteEdits.delete(`${filePath}:${offset}:${length}:${text}`);
    }, 500);
  }
}