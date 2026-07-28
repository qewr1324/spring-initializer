import * as vscode from "vscode";
import { SpringInitializerPanel } from "./springInitializerPanel.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("🌵 Spring Initializer active!");

	const disposable = vscode.commands.registerCommand("spring-initializer.open", async (uri?: vscode.Uri) => {
		try {
			const config = vscode.workspace.getConfiguration("springInitializer");
			if (!config.get<boolean>("enable", true)) {
				vscode.window.showWarningMessage("Spring Initializer is disabled in settings");
				return;
			}

			let preSelectedPath: string | any;

			if (uri?.fsPath) {
				try {
					const stat = await vscode.workspace.fs.stat(uri);
					if (stat.type === vscode.FileType.Directory) {
						preSelectedPath = uri.fsPath;
					}
				} catch {}
			}

			SpringInitializerPanel.createOrShow(context.extensionUri, preSelectedPath, context);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Spring Initializer: ${error.message}`);
		}
	});

	context.subscriptions.push(disposable);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = "spring-initializer.open";
	// statusBarItem.text = "$(link-external) Spring Initializer";
	statusBarItem.text = "$(link-external) SI";
	statusBarItem.tooltip = "🌵 Spring Initializer";
	statusBarItem.backgroundColor = undefined;
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

export function deactivate() {}
