import { ConnectedUser, userEntersFile, joinPathSessionKey } from "../../session/sessionManager";
import { getNodeByPath, loadFileContent } from "../../db/operation";

import { sendFileSync, sendError, broadcastSessionState } from "../../broadcast";
import engine from "../../engine/index";

export async function handleOpenFile(user: ConnectedUser, message: {path: string}) : Promise<void> {
  const {sessionKey, workspaceId, username} = user;
  const {path} = message;
  if(!path) {
    sendError(user.ws, "MISSING_PATH", "FILE_OPEN requires path.");
    return;  
  }
  const node = await getNodeByPath(workspaceId, path);
  if(!node) {
    sendError(user.ws, "FILE_NOT_FOUND", `File not found: ${path}`);
    return;
  }

  if(node.type != "file") {
    sendError(user.ws, "NOT_A_FILE", `Path is not a file: ${path}`);
    return;
  }
  
  const fileId = node._id.toString();
  const filePath = joinPathSessionKey(path, sessionKey);
  userEntersFile(sessionKey, user.userId, fileId, filePath);
  try {
    engine.setViewer(sessionKey, fileId, username);
  } catch (err: any) {
    
  }
  try {
    const fileStates = engine.getAllFileStates(sessionKey);
    broadcastSessionState(sessionKey, fileStates);
  } catch (err: any) {
    broadcastSessionState(sessionKey, []);
  }
  console.log(
    `[OpenFile] ${username} viewing ${path} in session ${sessionKey}`
  );
}