import * as vscode from "vscode";
import { getRelativePath, resolveAbsolutePath } from "../utils/pathUtils";
import { send } from "../socket/connection";
import { sign } from "crypto";

export let expectedRemoteEdits = new Map<string, number> ();

function normalizePath(filePath: string) : string {
  let p = filePath.replace(/\\/g, "/");
  if(p.startsWith("/")) p = p.substring(1);
  return p;
}

function normalizeText(text: string) : string {
  return text.replace(/\r\n/g, "\n");
}

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

let isProcessingQueue = false;
const incomingEditQueue : (() => Promise<void>)[] = [];

async function processEditQueue() {
  if(isProcessingQueue) return;
  isProcessingQueue = true;
  while(incomingEditQueue.length > 0) {
    const task = incomingEditQueue.shift();
    if(task) {
      await task();
    }
  }
  isProcessingQueue = false;
}

export function registerEditHandlers(context: vscode.ExtensionContext): void {
  const onFileEdit = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.scheme !== "file") return;
    const rawRelativePath = getRelativePath(event.document.uri);
    if (!rawRelativePath) return;
    const relativePath = normalizePath(rawRelativePath);
    for (const change of event.contentChanges) {
      const offset = change.rangeOffset; 
      const length = change.rangeLength;
      const text = normalizeText(change.text); 
      
      const signature = `${relativePath}:${offset}:${length}:${text}`;

      const count = expectedRemoteEdits.get(signature) || 0;
      if (count > 0) {
        if (count > 1) expectedRemoteEdits.set(signature, count - 1);
        else expectedRemoteEdits.delete(signature);
        continue; 
      }
      send({
        type: "FILE_EDIT",
        filePath: relativePath,
        offset: offset,
        length: length,
        text: change.text 
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
  incomingEditQueue.push(async () => {
    const {filePath, offset, length, text} = message;
    const absolutePath = resolveAbsolutePath(filePath);
    if(!absolutePath) return;
    const uri = vscode.Uri.file(absolutePath);
    let signature = "";
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const startPosition = document.positionAt(offset);
      const endPosition = document.positionAt(offset + length);
      const range = new vscode.Range(startPosition, endPosition);
      
      const  normalizedText = normalizeText(text);
      signature = `${filePath}:${offset}:${length}:${text}`; // Unique signature
      
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, range, text);
      
      expectedRemoteEdits.set(signature, (expectedRemoteEdits.get(signature) || 0) + 1);
      
      const success = await applyEditWithRetry(edit);
      if(success) {
        await document.save();
      }
    } catch (err: any) {
      console.error(`[Sync] Failed to apply remote edit: ${err.message}`);
    } finally {
      if(signature) {
        setTimeout(() => {
          const count = expectedRemoteEdits.get(signature) || 0;
          if(count > 1) expectedRemoteEdits.set(signature, count - 1);
          else expectedRemoteEdits.delete(signature);          
        }, 1000);
      }
    }
  });
  processEditQueue();
}

// import * as vscode from "vscode";
// import { getRelativePath, resolveAbsolutePath } from "../utils/pathUtils";
// import { send } from "../socket/connection";

// export let expectedRemoteEdits = new Set<string>();

// // Helper to normalize line endings so Windows/Mac/Linux don't cause infinite loops
// function normalizeText(text: string): string {
//   return text.replace(/\r\n/g, '\n');
// }

// async function applyEditWithRetry(edit: vscode.WorkspaceEdit, retries = 3): Promise<boolean> {
//   for (let retry = 0; retry < retries; retry++) {
//     const success = await vscode.workspace.applyEdit(edit);
//     if (success) return true;
//     await new Promise((resolve) => setTimeout(resolve, 50));
//   }
//   return false;
// }

// export function registerEditHandlers(context: vscode.ExtensionContext): void {
//   const onFileEdit = vscode.workspace.onDidChangeTextDocument((event) => {
//     if (event.document.uri.scheme !== "file") return;
//     const relativePath = getRelativePath(event.document.uri);
//     if (!relativePath) return;

//     for (const change of event.contentChanges) {
//       // FIX: Use native rangeOffset instead of calculating from document state
//       const offset = change.rangeOffset; 
//       const length = change.rangeLength;
//       // FIX: Normalize line endings
//       const text = normalizeText(change.text); 
      
//       const signature = `${relativePath}:${offset}:${length}:${text}`;

//       if (expectedRemoteEdits.has(signature)) {
//         expectedRemoteEdits.delete(signature);
//         continue; // It's a remote edit, don't broadcast!
//       }

//       send({
//         type: "FILE_EDIT",
//         filePath: relativePath,
//         offset: offset,
//         length: length,
//         text: change.text // Send original text, let the server/other client handle it
//       });
//     }
//   });
//   context.subscriptions.push(onFileEdit);
// }

// export async function handleIncomingFileEdit(message: {
//   filePath: string,
//   offset: number,
//   length: number,
//   text: string
// }): Promise<void> {
//   const { filePath, offset, length, text } = message;
//   const absolutePath = resolveAbsolutePath(filePath);
//   if (!absolutePath) return;
  
//   const uri = vscode.Uri.file(absolutePath);
//   let signatureToRemove = "";

//   try {
//     const document = await vscode.workspace.openTextDocument(uri);
//     const startPosition = document.positionAt(offset);
//     const endPosition = document.positionAt(offset + length);
//     const range = new vscode.Range(startPosition, endPosition);

//     // FIX: Normalize text for the signature check
//     const normalizedText = normalizeText(text);
//     signatureToRemove = `${filePath}:${offset}:${length}:${normalizedText}`;

//     const edit = new vscode.WorkspaceEdit();
//     edit.replace(uri, range, text);
    
//     expectedRemoteEdits.add(signatureToRemove);
    
//     const success = await applyEditWithRetry(edit);
    
//     // FIX: If the text replaced was identical to what was already there, 
//     // onDidChangeTextDocument will NEVER fire, causing a memory leak in the Set.
//     // We clean it up manually if the document text at that range didn't actually change.
//     if (success) {
//       const currentTextInRange = document.getText(range);
//       if (currentTextInRange === text) {
//         expectedRemoteEdits.delete(signatureToRemove);
//       }
//     }

//     // FIX: Removed `await document.save()` to prevent Format-on-Save loops.
//     // Let the remote user save manually, or handle saving at a higher level.

//   } catch (err: any) {
//     console.error(`[Sync] Failed to apply remote edit: ${err.message}`);
//     expectedRemoteEdits.delete(signatureToRemove); // Clean up on error
//   } finally {
//     // FIX: Increased timeout to 2 seconds as an absolute worst-case fallback 
//     // in case an edit applies but the event drops.
//     if (signatureToRemove) {
//       setTimeout(() => {
//         expectedRemoteEdits.delete(signatureToRemove);
//       }, 2000);
//     }
//   }
// }
