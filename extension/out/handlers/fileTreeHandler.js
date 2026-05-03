"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFileTreeHandlers = registerFileTreeHandlers;
exports.handleIncomingFileCreated = handleIncomingFileCreated;
exports.handleIncomingFileDeleted = handleIncomingFileDeleted;
exports.handleIncomingFileRenamed = handleIncomingFileRenamed;
exports.handleIncomingFileMoved = handleIncomingFileMoved;
exports.handleIncomingDirCreated = handleIncomingDirCreated;
exports.handleIncomingDirRename = handleIncomingDirRename;
exports.handleIncomingDirMoved = handleIncomingDirMoved;
exports.hanldeIncomingDirDelete = hanldeIncomingDirDelete;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const connection_1 = require("../socket/connection");
const ignoreFilter_1 = require("../utils/ignoreFilter");
const fs = __importStar(require("fs"));
const notifications_1 = require("../ui/notifications");
const pathUtils_1 = require("../utils/pathUtils");
const fileTracker_1 = require("./fileTracker");
async function closeTabIfOpen(absolutePath) {
    const uri = vscode.Uri.file(absolutePath);
    for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            if (tab.input instanceof vscode.TabInputText &&
                tab.input.uri.fsPath === uri.fsPath) {
                await vscode.window.tabGroups.close(tab);
            }
        }
    }
}
// temporary memory to remmeber if the path was a direcctory or file before it get delted
const pendingDeletions = new Map();
function registerFileTreeHandlers(context) {
    const onFileOrDirCreate = vscode.workspace.onDidCreateFiles((event) => {
        if (!(0, connection_1.isConnected)())
            return;
        // Handle may cause issue
        if (fileTracker_1.isSyncingFileTree)
            return;
        for (const file of event.files) {
            const relativePath = (0, pathUtils_1.getRelativePath)(file);
            if (!relativePath || (0, ignoreFilter_1.shouldIgnore)(relativePath))
                continue;
            const isDir = fs.statSync(file.fsPath).isDirectory();
            (0, connection_1.send)({
                type: isDir ? "DIR_CREATE" : "FILE_CREATE",
                path: relativePath
            });
            console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_CREATE sent: ${relativePath}`);
        }
    });
    const onFIleOrDirRename = vscode.workspace.onDidRenameFiles((event) => {
        if (!(0, connection_1.isConnected)())
            return;
        for (const file of event.files) {
            const oldPath = (0, pathUtils_1.getRelativePath)(file.oldUri);
            const newPath = (0, pathUtils_1.getRelativePath)(file.newUri);
            if (!oldPath || !newPath || (0, ignoreFilter_1.shouldIgnore)(oldPath) || (0, ignoreFilter_1.shouldIgnore)(newPath))
                continue;
            const isDir = fs.statSync(file.oldUri.fsPath).isDirectory();
            const oldParent = oldPath.slice(0, oldPath.lastIndexOf("/"));
            const newParent = newPath.slice(0, newPath.lastIndexOf("/"));
            if (oldParent === newParent) {
                (0, connection_1.send)({
                    type: isDir ? "DIR_RENAME" : "FILE_RENAME",
                    oldPath: oldPath,
                    newPath: newPath
                });
                console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_RENAME sent: ${oldPath} → ${newPath}`);
            }
            else {
                (0, connection_1.send)({
                    type: isDir ? "DIR_MOVE" : "FILE_MOVE",
                    oldPath: oldPath,
                    newPath: newPath
                });
                console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_MOVE sent: ${oldPath} → ${newPath}`);
            }
        }
    });
    const onWillDelete = vscode.workspace.onWillDeleteFiles((event) => {
        for (const file of event.files) {
            try {
                const isDir = fs.statSync(file.fsPath).isDirectory();
                pendingDeletions.set(file.fsPath, isDir);
            }
            catch (err) {
                console.log(`[FileTree] : Got error in onWillDeleteFiles. err: ${err.message}`);
                pendingDeletions.set(file.fsPath, false);
            }
        }
    });
    const onFileOrDirDelete = vscode.workspace.onDidDeleteFiles((event) => {
        if (!(0, connection_1.isConnected)())
            return;
        for (const file of event.files) {
            const relativePath = (0, pathUtils_1.getRelativePath)(file);
            if (!relativePath || (0, ignoreFilter_1.shouldIgnore)(relativePath))
                continue;
            const isDir = pendingDeletions.get(file.fsPath);
            (0, connection_1.send)({
                type: isDir ? "DIR_DELETE" : "FILE_DELETE",
                path: relativePath
            });
            console.log(`[FileTree] ${isDir ? 'DIR' : 'FILE'}_DELETE sent: ${relativePath}`);
        }
    });
    context.subscriptions.push(onFileOrDirCreate, onWillDelete, onFileOrDirDelete, onFIleOrDirRename);
}
//  -- FILE HANDLERS --
async function handleIncomingFileCreated(relativePath) {
    const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(relativePath);
    if (!absolutePath)
        return;
    if (fs.existsSync(absolutePath))
        return;
    try {
        fs.writeFileSync(absolutePath, "", "utf-8");
        console.log(`[FileTree] File created locally: ${relativePath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to create file: ${err.message}`);
    }
}
async function handleIncomingFileDeleted(relativePath) {
    const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(relativePath);
    if (!absolutePath)
        return;
    await closeTabIfOpen(absolutePath);
    (0, notifications_1.notifyFileDeleted)(relativePath);
    try {
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
        console.log(`[FileTree] File deleted locally: ${relativePath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to delete file: ${err.message}`);
    }
}
async function handleIncomingFileRenamed(oldPath, newPath) {
    const oldAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(oldPath);
    const newAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(newPath);
    if (!oldAbsolutePath || !newAbsolutePath)
        return;
    if (!fs.existsSync(oldAbsolutePath))
        return;
    try {
        fs.renameSync(oldAbsolutePath, newAbsolutePath);
        console.log(`[FileTree] File renamed locally: ${oldPath} → ${newPath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to rename file: ${err.message}`);
    }
}
async function handleIncomingFileMoved(oldPath, newPath) {
    const oldAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(oldPath);
    const newAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(newPath);
    if (!oldAbsolutePath || !newAbsolutePath)
        return;
    if (!fs.existsSync(oldAbsolutePath))
        return;
    try {
        const destDir = path.dirname(newAbsolutePath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.renameSync(oldAbsolutePath, newAbsolutePath);
        console.log(`[FileTree] File moved locally: ${oldPath} → ${newPath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to move file: ${err.message}`);
    }
}
// -- DIRECTORY HANDLERS --
async function handleIncomingDirCreated(relativePath) {
    const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(relativePath);
    if (!absolutePath)
        return;
    try {
        fs.mkdirSync(absolutePath, { recursive: true });
        console.log(`[FileTree] Directory created locally: ${relativePath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to create dir: ${err.message}`);
    }
}
async function handleIncomingDirRename(oldPath, newPath) {
    const oldAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(oldPath);
    const newAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(newPath);
    if (!oldAbsolutePath || !newAbsolutePath)
        return;
    try {
        fs.renameSync(oldAbsolutePath, newAbsolutePath);
        console.log(`[FileTree] Directory renamed: ${oldPath} → ${newPath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to rename dir: ${err.message}`);
    }
}
async function handleIncomingDirMoved(oldPath, newPath) {
    const oldAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(oldPath);
    const newAbsolutePath = (0, pathUtils_1.resolveAbsolutePath)(newPath);
    if (!oldAbsolutePath || !newAbsolutePath)
        return;
    try {
        const destDir = path.dirname(newAbsolutePath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.renameSync(oldAbsolutePath, newAbsolutePath);
        console.log(`[FileTree] Directory moved: ${oldPath} → ${newPath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to move dir: ${err.message}`);
    }
}
async function hanldeIncomingDirDelete(relativePath) {
    const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(relativePath);
    if (!absolutePath)
        return;
    await closeTabIfOpen(absolutePath);
    try {
        if (fs.existsSync(absolutePath)) {
            fs.rmSync(absolutePath, { recursive: true, force: true });
        }
        console.log(`[FileTree] Directory deleted locally: ${relativePath}`);
    }
    catch (err) {
        console.error(`[FileTree] Failed to delete directory: ${err.message}`);
    }
}
//# sourceMappingURL=fileTreeHandler.js.map