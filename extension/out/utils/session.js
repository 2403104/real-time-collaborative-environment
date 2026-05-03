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
exports.initSession = initSession;
exports.setSession = setSession;
exports.getSession = getSession;
exports.clearSession = clearSession;
exports.isSessionReady = isSessionReady;
// Stores the current user's details in memory. Every file that needs
const vscode = __importStar(require("vscode"));
const os = __importStar(require("os"));
;
let currentSession = {
    sessionKey: "",
    username: "",
    machineId: "",
    workspaceId: ""
};
// Actual
// export function initSession() : void {
//   const machineId = vscode.env.machineId;
//   const username = os.userInfo().username;  
//   currentSession.machineId = machineId;
//   currentSession.username = username;
//   console.log(`[Sync] Session initialized — user: ${username}, machine: ${machineId}`);  
// }
// For Testing
function initSession(testUsername) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const machineId = `${vscode.env.machineId}_TEST_${randomSuffix}`;
    const username = testUsername || `${os.userInfo().username}_${randomSuffix}`;
    currentSession.machineId = machineId;
    currentSession.username = username;
    console.log(`[Sync] Session initialized — user: ${username}, machine: ${machineId}`);
}
// Partial session does not allow us to provide all the detail of session everytime
function setSession(data) {
    currentSession = { ...currentSession, ...data };
}
function getSession() {
    return currentSession;
}
function clearSession() {
    currentSession = {
        sessionKey: "",
        username: "",
        machineId: "",
        workspaceId: "",
    };
}
function isSessionReady() {
    return (currentSession.sessionKey !== "" &&
        currentSession.username !== "" &&
        currentSession.machineId !== "");
}
//# sourceMappingURL=session.js.map