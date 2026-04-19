import * as vscode from "vscode";
import * as path from "path"
import { send, isConnected } from "../socket/connection";
import { shouldIgnore } from "../utils/ignoreFilter";
import * as fs from "fs";
import { notifyFileDeleted } from "../ui/notifications";
import { resolveAbsolutePath, getRelativePath } from "../utils/pathUtils";
import { isSyncingFileTree } from "./fileTracker";

async function closeTabIfOpen(absolutePath: string): Promise<void> {
  const uri = vscode.Uri.file(absolutePath);
  for(const tabGroup of vscode.window.tabGroups.all) {
    for(const tab of tabGroup.tabs) {
      if(
        tab.input instanceof vscode.TabInputText &&
        tab.input.uri.fsPath === uri.fsPath
      ) {
        await vscode.window.tabGroups.close(tab);
      }
    }
  }
}

// temporary memory to remmeber if the path was a direcctory or file before it get delted
const pendingDeletions = new Map<string, boolean>();

export function registerFileTreeHandlers(context: vscode.ExtensionContext): void {

  const onFileOrDirCreate = vscode.workspace.onDidCreateFiles((event) => {
    if(!isConnected()) return;

    // Handle may cause issue
    if(isSyncingFileTree) return;
    for(const file of event.files) {
      const relativePath = getRelativePath(file);
      if(!relativePath || shouldIgnore(relativePath)) continue;
      const isDir = fs.statSync(file.fsPath).isDirectory();
      send({
        type: isDir ? "DIR_CREATE" : "FILE_CREATE",
        path: relativePath
      });
      console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_CREATE sent: ${relativePath}`);
    }
  });

  const onFIleOrDirRename = vscode.workspace.onDidRenameFiles((event) => {
    if(!isConnected()) return;
    for(const file of event.files) {
      const oldPath = getRelativePath(file.oldUri);
      const newPath = getRelativePath(file.newUri);
      if(!oldPath || !newPath || shouldIgnore(oldPath) || shouldIgnore(newPath)) continue;
      const isDir = fs.statSync(file.oldUri.fsPath).isDirectory();
      const oldParent = oldPath.slice(0, oldPath.lastIndexOf("/"));
      const newParent = newPath.slice(0, newPath.lastIndexOf("/"));
      if(oldParent === newParent){
        send({
          type: isDir ? "DIR_RENAME" : "FILE_RENAME",
          oldPath: oldPath,
          newPath: newPath
        });
        console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_RENAME sent: ${oldPath} → ${newPath}`);      
      } else {
        send({
          type: isDir ? "DIR_MOVE" : "FILE_MOVE",
          oldPath: oldPath,
          newPath: newPath
        });
        console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_MOVE sent: ${oldPath} → ${newPath}`);      
      }
    }      
  });

  const onWillDelete = vscode.workspace.onWillDeleteFiles((event)  =>  {
    for(const file of event.files) {
      try {
        const isDir = fs.statSync(file.fsPath).isDirectory();
        pendingDeletions.set(file.fsPath, isDir);
      } catch (err: any) {
        console.log(`[FileTree] : Got error in onWillDeleteFiles. err: ${err.message}`);
        pendingDeletions.set(file.fsPath, false);
      }
    }
  });

  const onFileOrDirDelete = vscode.workspace.onDidDeleteFiles((event) => {
    if(!isConnected()) return;
    for(const file of event.files){
      const relativePath = getRelativePath(file);
      if(!relativePath || shouldIgnore(relativePath)) continue
      const isDir = pendingDeletions.get(file.fsPath);
      send({
        type: isDir ? "DIR_DELETE" : "FILE_DELETE",
        path: relativePath
      });
      console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_DELETE sent: ${relativePath}`);
    }
  });  
  context.subscriptions.push(onFileOrDirCreate, onWillDelete ,onFileOrDirDelete, onFIleOrDirRename);
}  

//  -- FILE HANDLERS --
export async function handleIncomingFileCreated(relativePath: string): Promise<void> {
  const absolutePath = resolveAbsolutePath(relativePath);
  if(!absolutePath) return;
  if(fs.existsSync(absolutePath)) return;
  try {
    fs.writeFileSync(absolutePath, "", "utf-8");
    console.log(`[FileTree] File created locally: ${relativePath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to create file: ${err.message}`);
  }
}

export async function handleIncomingFileDeleted(relativePath: string): Promise<void> {
  const absolutePath = resolveAbsolutePath(relativePath);
  if(!absolutePath) return;
  await closeTabIfOpen(absolutePath);
  notifyFileDeleted(relativePath);
  try {
    if(fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
    console.log(`[FileTree] File deleted locally: ${relativePath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to delete file: ${err.message}`);
  }
}

export async function handleIncomingFileRenamed(oldPath: string, newPath: string): Promise<void> {
  const oldAbsolutePath = resolveAbsolutePath(oldPath);
  const newAbsolutePath = resolveAbsolutePath(newPath);
  if(!oldAbsolutePath || !newAbsolutePath) return;
  if(!fs.existsSync(oldAbsolutePath)) return;
  try {
    fs.renameSync(oldAbsolutePath, newAbsolutePath);
    console.log(`[FileTree] File renamed locally: ${oldPath} → ${newPath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to rename file: ${err.message}`);
  }
}

export async function handleIncomingFileMoved(oldPath: string, newPath: string): Promise<void> {
  const oldAbsolutePath = resolveAbsolutePath(oldPath);
  const newAbsolutePath = resolveAbsolutePath(newPath);
  if(!oldAbsolutePath || !newAbsolutePath) return;
  if(!fs.existsSync(oldAbsolutePath)) return;
  try {
    const destDir = path.dirname(newAbsolutePath);
    if(!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, {recursive: true});
    }
    fs.renameSync(oldAbsolutePath, newAbsolutePath);
    console.log(`[FileTree] File moved locally: ${oldPath} → ${newPath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to move file: ${err.message}`);
  }
}

// -- DIRECTORY HANDLERS --

export async function handleIncomingDirCreated(relativePath: string): Promise<void> {
  const absolutePath = resolveAbsolutePath(relativePath);
  if(!absolutePath) return;
  try {
    fs.mkdirSync(absolutePath, {recursive: true});
    console.log(`[FileTree] Directory created locally: ${relativePath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to create dir: ${err.message}`);
  }
}

export async function handleIncomingDirRename(oldPath: string, newPath: string): Promise<void> {
  const oldAbsolutePath = resolveAbsolutePath(oldPath);
  const newAbsolutePath = resolveAbsolutePath(newPath);
  if(!oldAbsolutePath || !newAbsolutePath) return;
  try {
    fs.renameSync(oldAbsolutePath, newAbsolutePath);
    console.log(`[FileTree] Directory renamed: ${oldPath} → ${newPath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to rename dir: ${err.message}`);
  }
}

export async function handleIncomingDirMoved(oldPath: string, newPath: string) : Promise<void> {
  const oldAbsolutePath = resolveAbsolutePath(oldPath);
  const newAbsolutePath = resolveAbsolutePath(newPath);
  if(!oldAbsolutePath || !newAbsolutePath) return;
  try {
    const destDir = path.dirname(newAbsolutePath);
    if(!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, {recursive: true});    
    }
    fs.renameSync(oldAbsolutePath, newAbsolutePath);
    console.log(`[FileTree] Directory moved: ${oldPath} → ${newPath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to move dir: ${err.message}`);
  }
}


export async function hanldeIncomingDirDelete(relativePath: string): Promise<void> {
  const absolutePath = resolveAbsolutePath(relativePath);
  if(!absolutePath) return;
  await closeTabIfOpen(absolutePath);
  try {
    if(fs.existsSync(absolutePath)) {
      fs.rmSync(absolutePath, {recursive: true, force: true});
    }
    console.log(`[FileTree] Directory deleted locally: ${relativePath}`);
  } catch (err: any) {
    console.error(`[FileTree] Failed to delete directory: ${err.message}`);
  }
}