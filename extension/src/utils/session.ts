// Stores the current user's details in memory. Every file that needs
import * as vscode from "vscode";
import * as os from "os";
interface Session {
  sessionKey: string,
  username: string,
  machineId : string,
  workspaceId : string
};

let currentSession: Session = {
  sessionKey : "", 
  username : "",
  machineId : "",
  workspaceId : ""
}

// Actual
// export function initSession() : void {
//   const machineId = vscode.env.machineId;
//   const username = os.userInfo().username;  
//   currentSession.machineId = machineId;
//   currentSession.username = username;
//   console.log(`[Sync] Session initialized — user: ${username}, machine: ${machineId}`);  
// }

// For Testing
export function initSession(testUsername?: string) : void {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const machineId = `${vscode.env.machineId}_TEST_${randomSuffix}`;
  const username = testUsername || `${os.userInfo().username}_${randomSuffix}`;  

  currentSession.machineId = machineId;
  currentSession.username = username;
  
  console.log(`[Sync] Session initialized — user: ${username}, machine: ${machineId}`);  
}

// Partial session does not allow us to provide all the detail of session everytime
export function setSession (data : Partial<Session>): void {
  currentSession = {...currentSession, ...data};
}

export function getSession (): Session {
  return currentSession;
}

export function clearSession() : void { 
  currentSession = {
    sessionKey:  "",
    username:    "",
    machineId:   "",
    workspaceId: "",
  };
}

export function isSessionReady(): boolean {
  return (
    currentSession.sessionKey !== "" &&
    currentSession.username   !== "" &&
    currentSession.machineId  !== ""
  );
}