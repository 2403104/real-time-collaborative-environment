import { ConnectedUser, userLeavesFile, getFileViewers } from "../../session/sessionManager";
import { sendError, broadcastSessionState } from "../../broadcast";
import { getNodeByPath } from "../../db/operation";
import engine from "../../engine";

export async function handleCloseFile(user: ConnectedUser, message: {path: string}) : Promise<void> {
  const {sessionKey, workspaceId, username} = user;
  const {path} = message;
  if(!path) {
    sendError(user.ws, "MISSING_PATH", "FILE_CLOSE requires path.");
    return;  
  }
  const node = await getNodeByPath(workspaceId, path);
  if(!node) {
    sendError(user.ws, "FILE_NOT_FOUND", `File not found: ${path}`);
    return;
  }
  const fileId = node._id.toString();
  try {
    engine.clearViewer(sessionKey, fileId, user.userId);
    if(engine.getModifyingUser(sessionKey, fileId) === username) {
      engine.clearModifyingUser(sessionKey, fileId);
    }
  } catch (err: any) {
    // file is already closed
  }

  userLeavesFile(sessionKey, user.userId, fileId);
  const remainViewers = getFileViewers(sessionKey, fileId);
  if(remainViewers.length === 0) {
    try {
      engine.closeFile(sessionKey, fileId);
    } catch (err: any) {
      // Already closed
    }
  }
  try {
    broadcastSessionState(sessionKey, engine.getAllFileStates(sessionKey));
  } catch (err: any) {
    
  }
  console.log(
    `[CloseFile] ${username} closed ${path} in session ${sessionKey}`
  );
}