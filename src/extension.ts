import * as vscode from "vscode";
import { SpringInitializerPanel } from "./springInitializerPanel.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("🍃 Spring Initializer active!");

	const disposable = vscode.commands.registerCommand("spring-initializer.open", async (uri?: vscode.Uri) => {
		try {
			const config = vscode.workspace.getConfiguration("springInitializer");
			if (!config.get<boolean>("enable", true)) {
				vscode.window.showWarningMessage("Spring Initializer is disabled in settings");
				return;
			}

			let targetPath: string | undefined;

			if (uri?.fsPath) {
				try {
					const stat = await vscode.workspace.fs.stat(uri);
					targetPath = stat.type === vscode.FileType.Directory ? uri.fsPath : undefined;
				} catch {}
			}

			if (!targetPath) {
				const folderUri = await vscode.window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false,
					openLabel: "Select Project Location",
					title: "Choose where to create your Spring Boot project",
				});
				if (folderUri?.[0]) {
					targetPath = folderUri[0].fsPath;
				}
			}

			if (targetPath) {
				SpringInitializerPanel.createOrShow(context.extensionUri, targetPath, context);
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Spring Initializer: ${error.message}`);
		}
	});

	context.subscriptions.push(disposable);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = "spring-initializer.open";
	statusBarItem.text = "$(project) Spring Initializer";
	statusBarItem.tooltip = "Create New Spring Boot Project";
	statusBarItem.backgroundColor = undefined;
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
