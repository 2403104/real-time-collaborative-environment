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
exports.expectedRemoteEdits = void 0;
exports.registerEditHandlers = registerEditHandlers;
exports.handleIncomingFileEdit = handleIncomingFileEdit;
const vscode = __importStar(require("vscode"));
const pathUtils_1 = require("../utils/pathUtils");
const connection_1 = require("../socket/connection");
exports.expectedRemoteEdits = new Map();
function normalizePath(filePath) {
    let p = filePath.replace(/\\/g, "/");
    if (p.startsWith("/"))
        p = p.substring(1);
    return p;
}
function normalizeText(text) {
    return text.replace(/\r\n/g, "\n");
}
async function applyEditWithRetry(edit, retries = 3) {
    for (let retry = 0; retry < retries; retry++) {
        const success = await vscode.workspace.applyEdit(edit);
        if (success) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
}
let isProcessingQueue = false;
const incomingEditQueue = [];
async function processEditQueue() {
    if (isProcessingQueue)
        return;
    isProcessingQueue = true;
    while (incomingEditQueue.length > 0) {
        const task = incomingEditQueue.shift();
        if (task) {
            await task();
        }
    }
    isProcessingQueue = false;
}
function registerEditHandlers(context) {
    const onFileEdit = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.scheme !== "file")
            return;
        const rawRelativePath = (0, pathUtils_1.getRelativePath)(event.document.uri);
        if (!rawRelativePath)
            return;
        const relativePath = normalizePath(rawRelativePath);
        for (const change of event.contentChanges) {
            const offset = change.rangeOffset;
            const length = change.rangeLength;
            const text = normalizeText(change.text);
            const signature = `${relativePath}:${offset}:${length}:${text}`;
            const count = exports.expectedRemoteEdits.get(signature) || 0;
            if (count > 0) {
                if (count > 1)
                    exports.expectedRemoteEdits.set(signature, count - 1);
                else
                    exports.expectedRemoteEdits.delete(signature);
                continue;
            }
            (0, connection_1.send)({
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
async function handleIncomingFileEdit(message) {
    incomingEditQueue.push(async () => {
        const { filePath, offset, length, text } = message;
        const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(filePath);
        if (!absolutePath)
            return;
        const uri = vscode.Uri.file(absolutePath);
        let signature = "";
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const startPosition = document.positionAt(offset);
            const endPosition = document.positionAt(offset + length);
            const range = new vscode.Range(startPosition, endPosition);
            const normalizedText = normalizeText(text);
            signature = `${filePath}:${offset}:${length}:${normalizedText}`; // Unique signature
            const edit = new vscode.WorkspaceEdit();
            edit.replace(uri, range, normalizedText);
            exports.expectedRemoteEdits.set(signature, (exports.expectedRemoteEdits.get(signature) || 0) + 1);
            const success = await applyEditWithRetry(edit);
            // if(success) {
            //   await document.save();
            // }
        }
        catch (err) {
            console.error(`[Sync] Failed to apply remote edit: ${err.message}`);
        }
        finally {
            if (signature) {
                setTimeout(() => {
                    const count = exports.expectedRemoteEdits.get(signature) || 0;
                    if (count > 1)
                        exports.expectedRemoteEdits.set(signature, count - 1);
                    else
                        exports.expectedRemoteEdits.delete(signature);
                }, 2500);
            }
        }
    });
    processEditQueue();
}
//# sourceMappingURL=editHandler.js.map