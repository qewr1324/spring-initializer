import * as vscode from "vscode";
import { SpringInitializerPanel } from "./springInitializerPanel.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("🍃 Spring Initializer is now active!");

	const disposable = vscode.commands.registerCommand("spring-initializer.open", async (uri?: vscode.Uri) => {
		// Check if extension is enabled
		const config = vscode.workspace.getConfiguration("springInitializer");
		if (!config.get<boolean>("enable", true)) {
			vscode.window.showWarningMessage("Spring Initializer is disabled in settings");
			return;
		}

		let targetPath: string | undefined;

		// If right-clicked on a folder, use that path
		if (uri && uri.fsPath) {
			try {
				const stat = await vscode.workspace.fs.stat(uri);
				targetPath = stat.type === vscode.FileType.Directory ? uri.fsPath : undefined;
			} catch {
				// Ignore errors
			}
		}

		// If no folder selected, ask user to choose
		if (!targetPath) {
			const folderUri = await vscode.window.showOpenDialog({
				canSelectFolders: true,
				canSelectFiles: false,
				canSelectMany: false,
				openLabel: "Select Project Location",
				title: "Choose where to create your Spring Boot project",
			});

			if (folderUri && folderUri[0]) {
				targetPath = folderUri[0].fsPath;
			}
		}

		if (targetPath) {
			SpringInitializerPanel.createOrShow(context.extensionUri, targetPath, context);
		}
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {
	console.log("🍃 Spring Initializer is now deactivated!");
}
