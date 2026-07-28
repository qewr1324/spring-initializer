import * as vscode from "vscode";
import { SpringInitializerPanel } from "./springInitializerPanel.js";

export function activate(context: vscode.ExtensionContext) {
	console.log("🌵 Spring Initializer active!");

	const disposable = vscode.commands.registerCommand("spring-initializer.open", async (uri?: vscode.Uri) => {
		try {
			console.log("🚀 Command executed!");

			const config = vscode.workspace.getConfiguration("springInitializer");
			if (!config.get<boolean>("enable", true)) {
				vscode.window.showWarningMessage("Spring Initializer is disabled in settings");
				return;
			}

			let preSelectedPath: string | undefined;

			if (uri?.fsPath) {
				try {
					const stat = await vscode.workspace.fs.stat(uri);
					if (stat.type === vscode.FileType.Directory) {
						preSelectedPath = uri.fsPath;
					}
				} catch (e) {
					console.error("Error checking path:", e);
				}
			}

			console.log("📦 Creating panel...");
			SpringInitializerPanel.createOrShow(context.extensionUri, preSelectedPath, context);
			console.log("✅ Panel created!");
		} catch (error: any) {
			console.error("❌ Error:", error);
			vscode.window.showErrorMessage(`Spring Initializer: ${error.message}`);
		}
	});

	context.subscriptions.push(disposable);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.command = "spring-initializer.open";
	statusBarItem.text = "$(link-external) SI";
	statusBarItem.tooltip = "🌵 Spring Initializer";
	statusBarItem.backgroundColor = undefined;
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	console.log("✅ Extension activated successfully!");
}

export function deactivate() {
	console.log("🌵 Spring Initializer deactivated");
}
