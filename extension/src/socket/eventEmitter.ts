// will route the messages (all the messages incoming from the server)

import { writeSyncJsonFile } from "../extension";
import { handleIncomingFileEdit } from "../handlers/editHandler";
import { handleIncomingDirCreated, handleIncomingDirMoved, handleIncomingDirRename, handleIncomingFileCreated, handleIncomingFileDeleted, handleIncomingFileMoved, handleIncomingFileRenamed, hanldeIncomingDirDelete } from "../handlers/fileTreeHandler";
import { showError, showMessage } from "../ui/notifications";
import { updateFilePresence, updateTotalUserCount } from "../ui/statusManager";
import { setSession } from "../utils/session";

export function routeMessage(message : any): void {
  if(!message || !message.type) {
    console.warn("[Sync] Received message with no type:", message);
    return;
  }
  switch (message.type) {

    case "NEW_SESSION_CREATED":
      if(message.sessionKey) {
        setSession({ sessionKey: message.sessionKey });
        writeSyncJsonFile(message.sessionKey);
        showMessage(`Sync: New session started! Key: ${message.sessionKey}`);
        console.log(`[Sync] Session created: ${message.sessionKey}`);
      }
      break;

    case "JOINED_EXISTING_SESSION":
      if(message.sessionKey) {
        setSession({ sessionKey: message.sessionKey });
        writeSyncJsonFile(message.sessionKey);
        showMessage(`Sync: Joined session! Key: ${message.sessionKey}`);
        console.log(`[Sync] Joined Existing session: ${message.sessionKey}`);
      }
      break;

    case "FILE_EDIT":
      handleIncomingFileEdit(message);
      break;

    case "FILE_SYNC":
      // TODO: import and call syncHandler
      break;

    case "SESSION_STATE":
      console.log("[Sync] SESSION_STATE received:", JSON.stringify(message));
      console.log("[Sync] SESSION_STATE received:", JSON.stringify(message));
      updateFilePresence(message.files ?? []);
      break;

    case "TOTAL_ACTIVE_USERS":
      updateTotalUserCount(message.total ?? 0);
      break;

    // File Tree changes
    case "FILE_CREATED":
      handleIncomingFileCreated(message.path);
      break;
    case "FILE_DELETED":
      handleIncomingFileDeleted(message.path);
      break;
    case "FILE_RENAMED":
      handleIncomingFileRenamed(message.oldPath, message.newPath);
      break;
    case "FILE_MOVED":
      handleIncomingFileMoved(message.oldPath, message.newPath);
      break;
    case "DIR_CREATED":
      handleIncomingDirCreated(message.path);
      break;
    case "DIR_DELETED":
      hanldeIncomingDirDelete(message.path);
      break;
    case "DIR_RENAMED":
      handleIncomingDirRename(message.oldPath, message.newPath);
      break;
    case "DIR_MOVED":
      handleIncomingDirMoved(message.oldPath, message.newPath);
      break;
    case "ERROR":
      const errorMsg = message.message || "Unknown server error";
      showError(`Sync Error: ${errorMsg}`);
      console.error(`[Sync] Server Error [${message.code}]: ${errorMsg}`);
      break;

    default:
      console.warn("[Sync] Unknown message type:", message.type);
  }
}