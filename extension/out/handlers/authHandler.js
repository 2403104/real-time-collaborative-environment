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
exports.authHandler = authHandler;
const vscode = __importStar(require("vscode"));
const notifications_1 = require("../ui/notifications");
const connection_1 = require("../socket/connection");
const session_1 = require("../utils/session");
const connection_2 = require("../socket/connection");
const extension_1 = require("../extension");
function authHandler(context) {
    // Will connect automatically
    // const savedSessionKey = readSyncJsonFile();
    // if (savedSessionKey) {
    //   setSession({ sessionKey: savedSessionKey });
    //   joinExistingSession(savedSessionKey);
    // }
    const newSessionCmd = vscode.commands.registerCommand("sync.newSession", async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length == 0) {
            (0, notifications_1.showError)("Sync: Please open a workspace folder first.");
            return;
        }
        const workspacename = folders[0].name;
        (0, connection_1.createNewSession)(workspacename);
    });
    const joinSessionCmd = vscode.commands.registerCommand("sync.joinSession", async () => {
        const savedSessionKey = (0, extension_1.readSyncJsonFile)();
        const sessionKey = await vscode.window.showInputBox({
            prompt: "Enter Existing Session Key",
            placeHolder: "e.g. 550e8400-e29b-41d4-a716-446655440000",
            value: savedSessionKey ?? "",
            ignoreFocusOut: true
        });
        if (!sessionKey || sessionKey.trim() === "") {
            (0, notifications_1.showWarning)("Sync: No session key entered.");
            return;
        }
        (0, connection_1.joinExistingSession)(sessionKey.trim());
    });
    const leaveSessionCmd = vscode.commands.registerCommand("sync.leaveSession", () => {
        (0, connection_2.disconnect)();
        (0, session_1.clearSession)();
        (0, notifications_1.notifyLeft)();
    });
    context.subscriptions.push(newSessionCmd, joinSessionCmd, leaveSessionCmd);
}
//# sourceMappingURL=authHandler.js.map