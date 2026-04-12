import * as vscode from "vscode";
import { initializeFileStatusBar, showFileViewersDropdown } from "../ui/statusManager";

export function registerStatusHandler(context : vscode.ExtensionContext) : void {
  initializeFileStatusBar(context);
  const dropDownCommand = vscode.commands.registerCommand(
    "myExtension.showFileViewersDropdown",
    showFileViewersDropdown
  );
  context.subscriptions.push(dropDownCommand);
}
