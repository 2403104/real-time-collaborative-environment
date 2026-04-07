import * as vscode from "vscode";

export function notifyConnecting(sessionKey: string) : void {
  vscode.window.showInformationMessage(
    `Sync: Connecting to workspace with key: ${sessionKey}`
  );
}

export function notifyConnected(action: string): void {
  vscode.window.showInformationMessage(
    `Sync: Connected to session. Action: ${action}`
  );
}

export function notifySessionCreated(sessionKey: string): void {
  vscode.window.showInformationMessage(
    `Sync: Session created. Share this key with your team: ${sessionKey}`,
    "Copy Key"
  ).then((selection) => {
    if(selection === "Copy Key") {
      vscode.env.clipboard.writeText(sessionKey);
      vscode.window.showInformationMessage(
        "Sync: Session key copied to clipboard."
      );
    }
  })
}

export function notifyReconnectFailed(): void {
  vscode.window.showErrorMessage(
    "Sync: Could not reconnect to server after 5 attempts. Please rejoin manually."
  );
}

export function showMessage(message: string): void {
  vscode.window.showInformationMessage(
    message
  );
}

export function showError(message: string): void {
  vscode.window.showErrorMessage(
    message
  );
}

export function showWarning(message: string): void {
  vscode.window.showWarningMessage(
    message
  );
}

export function notifyLeft(): void {
  vscode.window.showInformationMessage(
    "Sync: Left the session."
  );
}

export function notifyFileDeleted(path: string): void {
  vscode.window.showWarningMessage(
    `Sync: File deleted by another user: ${path}`
  );
}

export function notifyDirDeleted(path: string): void {
  vscode.window.showWarningMessage(
    `Sync: Directory deleted by another user: ${path}`
  );
}

export function notifyError(message: string): void {
  vscode.window.showErrorMessage(
    `Sync Error: ${message}`
  );
}

export function notifyUserJoined(username: string): void {
  vscode.window.showInformationMessage(
    `Sync: ${username} joined the session.`
  );
}

export function notifyUserLeft(username: string): void {
  vscode.window.showInformationMessage(
    `Sync: ${username} left the session.`
  );
}