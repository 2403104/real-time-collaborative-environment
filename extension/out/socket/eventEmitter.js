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
exports.routeMessage = routeMessage;
// will route the messages (all the messages incoming from the server)
const vscode = __importStar(require("vscode"));
const extension_1 = require("../extension");
const editHandler_1 = require("../handlers/editHandler");
const fileTracker_1 = require("../handlers/fileTracker");
const fileTreeHandler_1 = require("../handlers/fileTreeHandler");
const syncHandler_1 = require("../handlers/syncHandler");
const notifications_1 = require("../ui/notifications");
const statusManager_1 = require("../ui/statusManager");
const manifest_1 = require("../utils/manifest");
const session_1 = require("../utils/session");
async function routeMessage(message) {
    console.log(`[MESSAGE TYPE] ${message.type}`);
    if (!message || !message.type) {
        console.warn("[Sync] Received message with no type:", message);
        return;
    }
    switch (message.type) {
        case "NEW_SESSION_CREATED":
            console.log("[NEW_SESSION_CREATED] Message Recieved From Server");
            if (message.sessionKey) {
                (0, session_1.setSession)({ sessionKey: message.sessionKey });
                (0, extension_1.writeSyncJsonFile)(message.sessionKey);
                (0, notifications_1.showMessage)(`Sync: New session started! Key: ${message.sessionKey}`);
                console.log(`[Sync] Session created: ${message.sessionKey}`);
            }
            break;
        case "JOINED_EXISTING_SESSION":
            if (message.sessionKey) {
                (0, session_1.setSession)({ sessionKey: message.sessionKey });
                (0, extension_1.writeSyncJsonFile)(message.sessionKey);
                (0, notifications_1.showMessage)(`Sync: Joined session! Key: ${message.sessionKey}`);
                // Handling Sync
                const folders = vscode.workspace.workspaceFolders;
                if (!folders || folders.length === 0)
                    break;
                const dirPath = folders[0].uri.fsPath;
                const localManifest = await (0, manifest_1.buildLocalManifest)(dirPath);
                await (0, syncHandler_1.startSync)(localManifest);
                console.log(`[Sync] Joined Existing session: ${message.sessionKey}`);
            }
            break;
        case "FILE_EDIT":
            (0, editHandler_1.handleIncomingFileEdit)(message);
            break;
        case "FILE_SYNC":
            // Done
            break;
        case "SESSION_STATE":
            console.log("[Sync] SESSION_STATE received:", JSON.stringify(message));
            console.log("[Sync] SESSION_STATE received:", JSON.stringify(message));
            (0, statusManager_1.updateFilePresence)(message.files ?? []);
            break;
        case "TOTAL_ACTIVE_USERS":
            (0, statusManager_1.updateTotalUserCount)(message.total ?? 0);
            break;
        case "FILE_TREE":
            if (message.fileTree && Array.isArray(message.fileTree)) {
                // console.log(`[Sync] Received FILE_TREE [${message.fileTree.length}`);
                (0, fileTracker_1.handleFileTree)(message.fileTree).catch((err) => {
                    console.error("[Sync] Error handling file tree:", err);
                });
            }
            else {
                console.warn("[Sync] Received FILE_TREE but payload was invalid.");
            }
            break;
        // File Tree changes
        case "FILE_CREATED":
            (0, fileTreeHandler_1.handleIncomingFileCreated)(message.path);
            break;
        case "FILE_DELETED":
            (0, fileTreeHandler_1.handleIncomingFileDeleted)(message.path);
            break;
        case "FILE_RENAMED":
            (0, fileTreeHandler_1.handleIncomingFileRenamed)(message.oldPath, message.newPath);
            break;
        case "FILE_MOVED":
            (0, fileTreeHandler_1.handleIncomingFileMoved)(message.oldPath, message.newPath);
            break;
        case "DIR_CREATED":
            (0, fileTreeHandler_1.handleIncomingDirCreated)(message.path);
            break;
        case "DIR_DELETED":
            (0, fileTreeHandler_1.hanldeIncomingDirDelete)(message.path);
            break;
        case "DIR_RENAMED":
            (0, fileTreeHandler_1.handleIncomingDirRename)(message.oldPath, message.newPath);
            break;
        case "DIR_MOVED":
            (0, fileTreeHandler_1.handleIncomingDirMoved)(message.oldPath, message.newPath);
            break;
        case "ERROR":
            const errorMsg = message.message || "Unknown server error";
            (0, notifications_1.showError)(`Sync Error: ${errorMsg}`);
            console.error(`[Sync] Server Error [${message.code}]: ${errorMsg}`);
            break;
        default:
            console.warn("[Sync] Unknown message type:", message.type);
    }
}
//# sourceMappingURL=eventEmitter.js.map