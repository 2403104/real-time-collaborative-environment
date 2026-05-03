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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSyncing = void 0;
exports.startSync = startSync;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
const config_1 = __importDefault(require("../config"));
const session_1 = require("../utils/session");
exports.isSyncing = false;
let syncQueue = [];
let isProcessingQueue = false;
let processedCount = 0;
let totalFiles = 0;
let progressReporter = null;
let syncResolve = null;
async function startSync(clientManifest = {}) {
    const session = (0, session_1.getSession)();
    if (!session.sessionKey)
        return;
    exports.isSyncing = true;
    syncQueue = [];
    isProcessingQueue = false;
    processedCount = 0;
    totalFiles = 0;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Syncing Workspace",
        cancellable: false,
    }, async (progress) => {
        progressReporter = progress;
        progress.report({ message: "Connecting..." });
        await new Promise((resolve, reject) => {
            syncResolve = resolve;
            const ws = new ws_1.default(`${config_1.default.server.url}/sync`);
            ws.on("open", () => {
                progress.report({ message: "Requesting sync..." });
                ws.send(JSON.stringify({
                    type: "SYNC_REQUEST",
                    sessionKey: session.sessionKey,
                    clientManifest,
                }));
            });
            ws.on("message", async (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    await handleSyncMessage(msg, ws);
                }
                catch (err) {
                    console.error("[Sync] Failed to parse message:", err);
                }
            });
            ws.on("error", (err) => {
                console.error("[Sync] WebSocket error:", err.message);
                reject(err);
            });
            ws.on("close", () => { });
        });
        vscode.window.showInformationMessage("Workspace synced!");
    });
    setTimeout(() => { exports.isSyncing = false; }, 500);
}
;
async function handleSyncMessage(msg, ws) {
    switch (msg.type) {
        case "SYNC_START":
            totalFiles = msg.totalFiles;
            processedCount = 0;
            progressReporter?.report({ message: `0 / ${totalFiles} Synced` });
            break;
        case "SYNC_DELETE":
            for (const path of (msg.toDelete ?? [])) {
                const uri = resolveUri(path);
                if (!uri)
                    continue;
                await Promise.resolve(vscode.workspace.fs.delete(uri, { recursive: true, useTrash: false })).catch(() => { });
                processedCount++;
                const increment = totalFiles > 0 ? (1 / totalFiles) * 100 : 0;
                progressReporter?.report({
                    increment,
                    message: `${processedCount} / ${totalFiles} Synced`
                });
            }
            break;
        case "SYNC_CHUNK":
            syncQueue.push(msg.files);
            processSyncQueue();
            break;
        case "SYNC_COMPLETE":
            ws.close(1000);
            const interval = setInterval(() => {
                if (syncQueue.length === 0 && !isProcessingQueue) {
                    clearInterval(interval);
                    syncResolve?.();
                }
            }, 100);
            break;
        case "SYNC_ERROR":
            vscode.window.showErrorMessage(`Sync Failed : ${msg.message}`);
            syncResolve?.();
            break;
    }
}
async function processSyncQueue() {
    if (isProcessingQueue || syncQueue.length === 0)
        return;
    const encoder = new TextEncoder();
    isProcessingQueue = true;
    while (syncQueue.length > 0) {
        const batch = syncQueue.shift();
        if (!batch)
            continue;
        for (const node of batch) {
            const uri = resolveUri(node.path);
            if (!uri)
                continue;
            if (node.type === "folder") {
                await vscode.workspace.fs.createDirectory(uri);
            }
            else if (node.type === "file") {
                const parentUri = vscode.Uri.joinPath(uri, "..");
                await vscode.workspace.fs.createDirectory(parentUri);
                await vscode.workspace.fs.writeFile(uri, encoder.encode(node.content));
            }
            processedCount++;
            const increment = totalFiles > 0 ? (1 / totalFiles) * 100 : 0;
            progressReporter?.report({
                increment,
                message: `${processedCount} / ${totalFiles} Synced`
            });
        }
    }
    isProcessingQueue = false;
}
function resolveUri(relativePath) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0)
        return null;
    return vscode.Uri.joinPath(folders[0].uri, relativePath);
}
//# sourceMappingURL=syncHandler.js.map