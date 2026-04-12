import * as vscode from "vscode";

let fileViewerBar: vscode.StatusBarItem;
let totalUsersBar: vscode.StatusBarItem;

interface FilePresence {
  editor: string | null;
  viewers: string[];
}

const fileStateMap = new Map<string, FilePresence>();

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}

function getWorkspaceRoot(): string | null {
  if (!vscode.workspace.workspaceFolders?.length) return null;
  return normalizePath(vscode.workspace.workspaceFolders[0].uri.fsPath);
}

function toRelativePath(filePath: string): string {
  const normalized = normalizePath(filePath);
  const root = getWorkspaceRoot();

  if (root && normalized.startsWith(root)) {
    return normalized.slice(root.length).replace(/^\//, "");
  }

  return normalized;
}

function getOrderedUsers(presence: FilePresence): { name: string; isEditor: boolean }[] {
  const seen = new Set<string>();
  const ordered: { name: string; isEditor: boolean }[] = [];

  if (presence.editor && !seen.has(presence.editor)) {
    seen.add(presence.editor);
    ordered.push({ name: presence.editor, isEditor: true });
  }

  for (const viewer of presence.viewers) {
    if (!viewer || seen.has(viewer)) continue;
    seen.add(viewer);
    ordered.push({ name: viewer, isEditor: false });
  }

  return ordered;
}

function lookupPresence(relativePath: string): FilePresence | undefined {
  // Exact match first
  if (fileStateMap.has(relativePath)) {
    return fileStateMap.get(relativePath);
  }

  // Fallback: stored key ends with the relative path (handles workspace prefix prepended by server)
  for (const [key, value] of fileStateMap.entries()) {
    if (key.endsWith(relativePath) || relativePath.endsWith(key)) {
      return value;
    }
  }

  return undefined;
}

export function initializeFileStatusBar(context: vscode.ExtensionContext) {
  totalUsersBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(totalUsersBar);

  fileViewerBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  fileViewerBar.command = "myExtension.showFileViewersDropdown";
  context.subscriptions.push(fileViewerBar);

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    refreshFileViewerBar(editor);
  }, null, context.subscriptions);
}

export function updateTotalUserCount(count: number): void {
  if (count > 0) {
    totalUsersBar.text = count === 1 ? `${count} User Connected` : `${count} Users Connected`;
    totalUsersBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    totalUsersBar.show();
  } else {
    totalUsersBar.hide();
  }
}

export function updateFilePresence(
  fileStates: {
    filePath: string;
    viewers?: string[];
    isModifying?: boolean;
    modifyingBy?: string | null;
  }[]
) {
  fileStateMap.clear();

  fileStates.forEach((state) => {
    if (!state?.filePath || state.filePath.trim() === "") return;
    const key = toRelativePath(state.filePath);
    fileStateMap.set(key, {
      editor: state.isModifying ? (state.modifyingBy ?? null) : null,
      viewers: Array.isArray(state.viewers) ? state.viewers : [],
    });
  });

  refreshFileViewerBar(vscode.window.activeTextEditor);
}

export function refreshFileViewerBar(editor: vscode.TextEditor | undefined) {
  if (!editor || !vscode.workspace.workspaceFolders) {
    fileViewerBar.hide();
    return;
  }

  const relativePath = normalizePath(
    vscode.workspace.asRelativePath(editor.document.uri, false)
  );

  const presence = lookupPresence(relativePath);

  if (!presence) {
    fileViewerBar.hide();
    return;
  }

  const orderedUsers = getOrderedUsers(presence);
  if (orderedUsers.length === 0) {
    fileViewerBar.hide();
    return;
  }

  const displayText = orderedUsers
    .map((u) => `${u.isEditor ? "$(edit)" : "$(eye)"} ${u.name}`)
    .join("  |  ");

  fileViewerBar.text = displayText;
  fileViewerBar.backgroundColor = presence.editor
    ? new vscode.ThemeColor("statusBarItem.warningBackground")
    : undefined;
  fileViewerBar.show();
}

export async function showFileViewersDropdown() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !vscode.workspace.workspaceFolders) return;

  const relativePath = normalizePath(
    vscode.workspace.asRelativePath(editor.document.uri, false)
  );

  const presence = lookupPresence(relativePath);
  if (!presence) return;

  const orderedUsers = getOrderedUsers(presence);
  if (orderedUsers.length === 0) return;

  const quickPickItems: vscode.QuickPickItem[] = orderedUsers.map((user) => ({
    label: `${user.isEditor ? "$(edit)" : "$(eye)"} ${user.name}`,
    description: user.isEditor ? "Currently modifying the file." : "Viewing",
  }));

  await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: `Users in ${relativePath}`,
  });
}

// import * as vscode from "vscode";

// let fileViewerBar: vscode.StatusBarItem;
// let totalUsersBar : vscode.StatusBarItem;

// interface FilePresence {
//   editor: string | null;
//   viewers: string[];
// }

// const fileStateMap = new Map<string, FilePresence>();

// function normalizePath(p: string): string {
//   return p.replace(/\\/g, "/");
// }

// function getOrderedUsers(presence: FilePresence): { name: string; isEditor: boolean }[] {
//   const seen = new Set<string>();
//   const ordered: { name: string; isEditor: boolean }[] = [];

//   if (presence.editor && !seen.has(presence.editor)) {
//     seen.add(presence.editor);
//     ordered.push({ name: presence.editor, isEditor: true });
//   }

//   for (const viewer of presence.viewers) {
//     if (!viewer || seen.has(viewer)) continue;
//     seen.add(viewer);
//     ordered.push({ name: viewer, isEditor: false });
//   }

//   return ordered;
// }

// export function initializeFileStatusBar(context: vscode.ExtensionContext) {
//   totalUsersBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
//   context.subscriptions.push(totalUsersBar);

//   fileViewerBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
//   fileViewerBar.command = "myExtension.showFileViewersDropdown";
//   context.subscriptions.push(fileViewerBar);
  
//   vscode.window.onDidChangeActiveTextEditor((editor) => {
//     refreshFileViewerBar(editor);
//   });
// }

// export function updateTotalUserCount(count : number) : void {
//   if(count > 0) {
//     totalUsersBar.text = ((count == 1) ? `${count} User Connected` : `${count} Users Connected`);
//     totalUsersBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');  
//     totalUsersBar.show();
//   } else {
//     totalUsersBar.hide();  
//   }
// }

// export function updateFilePresence(fileStates: {filePath: string, viewers: string[], isModifying: boolean, modifyingBy: string | null}[]) {
//   fileStateMap.clear();
  
//   fileStates.forEach((state) => {
//     fileStateMap.set(normalizePath(state.filePath), {
//       editor: state.isModifying ? (state.modifyingBy ?? null) : null,
//       viewers: state.viewers
//     });
//   });
  
//   refreshFileViewerBar(vscode.window.activeTextEditor);
// }

// export function refreshFileViewerBar(editor: vscode.TextEditor | undefined) {
//   console.log("fileStateMap contents:", [...fileStateMap.entries()]);
//   if (!editor || !vscode.workspace.workspaceFolders) {
//     fileViewerBar.hide();
//     return;  
//   }
  
//   const relativePath = normalizePath(vscode.workspace.asRelativePath(editor.document.uri, false));
//   const presence = fileStateMap.get(relativePath);
  
//   if (!presence) {
//     fileViewerBar.hide();
//     return;
//   }

//   const orderedUsers = getOrderedUsers(presence);
//   if (orderedUsers.length === 0) {
//     fileViewerBar.hide();
//     return;
//   }

//   const displayText = orderedUsers
//     .map((u) => `${u.isEditor ? "$(edit)" : "$(eye)"} ${u.name}`)
//     .join("  |  ");

//   fileViewerBar.text = displayText;
//   fileViewerBar.backgroundColor = presence.editor ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
//   fileViewerBar.show();
// }

// export async function showFileViewersDropdown() {
//   const editor = vscode.window.activeTextEditor;
//   if (!editor || !vscode.workspace.workspaceFolders) return;

//   const relativePath = normalizePath(vscode.workspace.asRelativePath(editor.document.uri, false));
//   const presence = fileStateMap.get(relativePath);

//   if (!presence) return;

//   const orderedUsers = getOrderedUsers(presence);
//   if (orderedUsers.length === 0) return;

//   const quickPickItems: vscode.QuickPickItem[] = [];
//   for (const user of orderedUsers) {
//     quickPickItems.push({
//       label: `${user.isEditor ? "$(edit)" : "$(eye)"} ${user.name}`,
//       description: user.isEditor ? "Currently modifying the file." : "Viewing"
//     });
//   }

//   await vscode.window.showQuickPick(quickPickItems, {
//     placeHolder: `Users in ${relativePath}`
//   });
// }