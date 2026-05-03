"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewSession = createNewSession;
exports.joinExistingSession = joinExistingSession;
exports.send = send;
exports.disconnect = disconnect;
exports.isConnected = isConnected;
const ws_1 = __importDefault(require("ws"));
const config_1 = __importDefault(require("../config"));
const session_1 = require("../utils/session");
const eventEmitter_1 = require("./eventEmitter");
const notifications_1 = require("../ui/notifications");
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 8;
let reconnectTimer = null;
function getLiveUrl(query) {
    return `${config_1.default.server.url}/live${query}`;
}
function createNewSession(workspaceName) {
    const session = (0, session_1.getSession)();
    (0, notifications_1.notifyConnecting)("Creating new session...");
    const url = getLiveUrl(`?action=new_session` +
        `&username=${encodeURIComponent(session.username)}` +
        `&machineId=${encodeURIComponent(session.machineId)}` +
        `&workspaceName=${encodeURIComponent(workspaceName)}`);
    _createConnection(url, "new_session");
}
function joinExistingSession(sessionKey) {
    const session = (0, session_1.getSession)();
    (0, notifications_1.notifyConnecting)(`Joining session ${sessionKey}...`);
    const url = getLiveUrl(`?action=join_session` +
        `&username=${encodeURIComponent(session.username)}` +
        `&machineId=${encodeURIComponent(session.machineId)}` +
        `&sessionKey=${encodeURIComponent(sessionKey)}`);
    _createConnection(url, "join_session");
}
function _createConnection(url, action) {
    if (ws) {
        ws.close(1000);
        ws = null;
    }
    ws = new ws_1.default(url);
    ws.on("open", () => {
        reconnectAttempts = 0;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        (0, notifications_1.notifyConnected)(action);
    });
    ws.on("message", async (data) => {
        console.log(`[Extension Debug ] ${data}`);
        try {
            const message = JSON.parse(data.toString());
            console.log(`[Debug ] : ${message}`);
            try {
                await (0, eventEmitter_1.routeMessage)(message);
            }
            catch (err) {
                console.error("[Sync] Failed to handle message:", message?.type, err?.message ?? err);
            }
        }
        catch (err) {
            console.error("[Sync] Failed to parse message:", data.toString());
        }
    });
    ws.on("close", (code) => {
        console.warn(`[Sync] Connection closed. Code: ${code}`);
        ws = null;
        if (code !== 1000) {
            _scheduleReconnect();
        }
    });
    ws.on("error", (err) => {
        console.error("[Sync] WebSocket error:", err.message);
    });
}
function _scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        (0, notifications_1.notifyReconnectFailed)();
        return;
    }
    const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 60000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
        const key = (0, session_1.getSession)().sessionKey;
        if (key) {
            joinExistingSession(key);
        }
    }, delayMs);
}
function send(message) {
    if (ws && ws.readyState === ws_1.default.OPEN) {
        ws.send(JSON.stringify(message));
    }
    else {
        console.warn("[Sync] Cannot send — not connected.");
    }
}
function disconnect() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close(1000);
        ws = null;
    }
    (0, notifications_1.showMessage)("Sync: Disconnected from server.");
}
function isConnected() {
    return ws !== null && ws.readyState === ws_1.default.OPEN;
}
//# sourceMappingURL=connection.js.map