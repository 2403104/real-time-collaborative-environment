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
exports.notifyConnecting = notifyConnecting;
exports.notifyConnected = notifyConnected;
exports.notifySessionCreated = notifySessionCreated;
exports.notifyReconnectFailed = notifyReconnectFailed;
exports.showMessage = showMessage;
exports.showError = showError;
exports.showWarning = showWarning;
exports.notifyLeft = notifyLeft;
exports.notifyFileDeleted = notifyFileDeleted;
exports.notifyDirDeleted = notifyDirDeleted;
exports.notifyError = notifyError;
exports.notifyUserJoined = notifyUserJoined;
exports.notifyUserLeft = notifyUserLeft;
const vscode = __importStar(require("vscode"));
function notifyConnecting(sessionKey) {
    vscode.window.showInformationMessage(`Sync: Connecting to workspace with key: ${sessionKey}`);
}
function notifyConnected(action) {
    vscode.window.showInformationMessage(`Sync: Connected to session. Action: ${action}`);
}
function notifySessionCreated(sessionKey) {
    vscode.window.showInformationMessage(`Sync: Session created. Share this key with your team: ${sessionKey}`, "Copy Key").then((selection) => {
        if (selection === "Copy Key") {
            vscode.env.clipboard.writeText(sessionKey);
            vscode.window.showInformationMessage("Sync: Session key copied to clipboard.");
        }
    });
}
function notifyReconnectFailed() {
    vscode.window.showErrorMessage("Sync: Could not reconnect to server after 5 attempts. Please rejoin manually.");
}
function showMessage(message) {
    vscode.window.showInformationMessage(message);
}
function showError(message) {
    vscode.window.showErrorMessage(message);
}
function showWarning(message) {
    vscode.window.showWarningMessage(message);
}
function notifyLeft() {
    vscode.window.showInformationMessage("Sync: Left the session.");
}
function notifyFileDeleted(path) {
    vscode.window.showWarningMessage(`Sync: File deleted by another user: ${path}`);
}
function notifyDirDeleted(path) {
    vscode.window.showWarningMessage(`Sync: Directory deleted by another user: ${path}`);
}
function notifyError(message) {
    vscode.window.showErrorMessage(`Sync Error: ${message}`);
}
function notifyUserJoined(username) {
    vscode.window.showInformationMessage(`Sync: ${username} joined the session.`);
}
function notifyUserLeft(username) {
    vscode.window.showInformationMessage(`Sync: ${username} left the session.`);
}
//# sourceMappingURL=notifications.js.map