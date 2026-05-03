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
exports.isSyncingFileTree = void 0;
exports.registerFileTracker = registerFileTracker;
exports.handleFileTree = handleFileTree;
const vscode = __importStar(require("vscode"));
const connection_1 = require("../socket/connection");
const pathUtils_1 = require("../utils/pathUtils");
const notifications_1 = require("../ui/notifications");
const ignoreFilter_1 = require("../utils/ignoreFilter");
function registerFileTracker(context) {
    const onOpen = vscode.workspace.onDidOpenTextDocument((document) => {
        const relativePath = (0, pathUtils_1.getRelativePath)(document.uri);
        if (!relativePath)
            return;
        if ((0, ignoreFilter_1.shouldIgnore)(relativePath))
            return;
        (0, connection_1.send)({
            type: "FILE_OPEN",
            filePath: relativePath
        });
    });
    const onClose = vscode.workspace.onDidCloseTextDocument((document) => {
        const relativePath = (0, pathUtils_1.getRelativePath)(document.uri);
        if (!relativePath)
            return;
        if ((0, ignoreFilter_1.shouldIgnore)(relativePath))
            return;
        (0, connection_1.send)({
            type: "FILE_CLOSE",
            filePath: relativePath
        });
    });
    context.subscriptions.push(onOpen, onClose);
}
exports.isSyncingFileTree = false;
async function handleFileTree(fileTree) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("[Sync] Please open a folder to sync the workspace.");
        return;
    }
    exports.isSyncingFileTree = true;
    try {
        const encoder = new TextEncoder();
        for (const node of fileTree) {
            if (node.type == "folder") {
                const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(node.path);
                if (!absolutePath)
                    continue;
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(absolutePath));
            }
        }
        for (const node of fileTree) {
            if (node.type == "file") {
                const absolutePath = (0, pathUtils_1.resolveAbsolutePath)(node.path);
                if (!absolutePath)
                    continue;
                const uri = vscode.Uri.file(absolutePath);
                await vscode.workspace.fs.writeFile(uri, encoder.encode(node.content ?? ""));
            }
        }
        (0, notifications_1.showMessage)("[FileTree] File tree synced successfully.");
    }
    catch (err) {
        console.error(`[Sync] Failed to construct file tree: ${err.message}`);
        vscode.window.showErrorMessage("Failed to sync workspace.");
    }
    finally {
        setTimeout(() => {
            exports.isSyncingFileTree = false;
        }, 1000);
    }
}
//# sourceMappingURL=fileTracker.js.map