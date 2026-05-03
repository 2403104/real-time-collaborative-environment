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
exports.readSyncJsonFile = readSyncJsonFile;
exports.writeSyncJsonFile = writeSyncJsonFile;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const session_1 = require("./utils/session");
const fileTreeHandler_1 = require("./handlers/fileTreeHandler");
const authHandler_1 = require("./handlers/authHandler");
const editHandler_1 = require("./handlers/editHandler");
const dropDownHandler_1 = require("./handlers/dropDownHandler");
const fileTracker_1 = require("./handlers/fileTracker");
const SYNC_FILE = ".sync.json";
const GITIGNORE = ".gitignore";
function getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length == 0)
        return null;
    return folders[0].uri.fsPath;
}
function getSyncFilePath() {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot)
        return "";
    return path.join(workspaceRoot, SYNC_FILE);
}
function readSyncJsonFile() {
    const syncFilePath = getSyncFilePath();
    if (!syncFilePath)
        return null;
    try {
        if (!fs.existsSync(syncFilePath))
            return null;
        const content = fs.readFileSync(syncFilePath, "utf-8");
        const parsed = JSON.parse(content);
        return parsed.sessionKey ?? null;
    }
    catch (error) {
        return null;
    }
}
function writeSyncJsonFile(sessionKey) {
    const syncFilePath = getSyncFilePath();
    if (!syncFilePath)
        return;
    try {
        let existingData = {};
        if (fs.existsSync(syncFilePath)) {
            const content = fs.readFileSync(syncFilePath, "utf-8");
            if (content.trim() !== "") {
                existingData = JSON.parse(content);
            }
        }
        existingData.sessionKey = sessionKey;
        const newData = JSON.stringify(existingData, null, 2);
        fs.writeFileSync(syncFilePath, newData);
        addToGitignore();
        console.log("[Sync] .sync.json updated.");
    }
    catch (err) {
        console.error("[Sync] Failed to update .sync.json:", err.message);
    }
}
function addToGitignore() {
    const root = getWorkspaceRoot();
    if (!root)
        return;
    const gitignorePath = path.join(root, GITIGNORE);
    try {
        let content = "";
        if (fs.existsSync(gitignorePath)) {
            content = fs.readFileSync(gitignorePath, "utf-8");
        }
        const lines = content.split("\n").map((l) => l.trim());
        if (!lines.includes(SYNC_FILE)) {
            const entry = content.endsWith("\n") || content === "" ?
                SYNC_FILE
                : "\n" + SYNC_FILE;
            fs.writeFileSync(gitignorePath, content + entry);
            console.log("[Sync] .gitignore updated.");
        }
    }
    catch (err) {
        console.error("[Sync] Failed to update .gitignore:", err.message);
    }
}
function activate(context) {
    // Fix the bug , when the user reconnects the session
    (0, session_1.initSession)();
    (0, authHandler_1.authHandler)(context);
    (0, fileTreeHandler_1.registerFileTreeHandlers)(context);
    (0, fileTracker_1.registerFileTracker)(context);
    (0, editHandler_1.registerEditHandlers)(context);
    (0, dropDownHandler_1.registerStatusHandler)(context);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map