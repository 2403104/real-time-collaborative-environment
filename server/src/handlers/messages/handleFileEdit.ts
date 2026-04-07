import { ConnectedUser, getFileIdByPath } from "../../session/sessionManager";
import { broadcastFileEdit, sendError } from "../../broadcast";
import engine from "../../engine";

export async function handleFileEdit(
  user: ConnectedUser, 
  message: { filePath: string; offset: number; length: number; text: string }
): Promise<void> {
  const { sessionKey, username, userId } = user;
  const { filePath, offset, length, text } = message;

  if (
    !filePath ||
    offset === undefined ||
    length === undefined ||
    text === undefined
  ) {
    sendError(user.ws, "MISSING_FIELDS", "FILE_EDIT requires filePath.");
    return;
  }
  
  if (length === 0 && text === "") return;

  const fileId = getFileIdByPath(sessionKey, filePath);
  
  if (!fileId) {
    sendError(user.ws, "FILE_NOT_FOUND", `File ID not found for path: ${filePath}`);
    return;
  }

  try {
    if (length === 0) {
      engine.insert(sessionKey, fileId, offset, text);
    } else if (text === "") {
      engine.remove(sessionKey, fileId, offset, length);
    } else {
      engine.remove(sessionKey, fileId, offset, length);
      engine.insert(sessionKey, fileId, offset, text);
    }
  } catch (err: any) {
    sendError(user.ws, "ENGINE_ERROR", err.message);
    return;
  }

  broadcastFileEdit(sessionKey, filePath, offset, length, text, userId, username);
}