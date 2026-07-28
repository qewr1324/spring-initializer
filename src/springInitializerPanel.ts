import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import { SpringApiService } from "./apiService.js";
import type { ProjectConfig } from "./apiService.js";
import AdmZip from "adm-zip";

export class SpringInitializerPanel {
	public static currentPanel: SpringInitializerPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _targetPath: string | undefined;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, preSelectedPath: string | undefined, _context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor?.viewColumn;

		if (SpringInitializerPanel.currentPanel) {
			SpringInitializerPanel.currentPanel._panel.reveal(column);
			if (preSelectedPath) {
				SpringInitializerPanel.currentPanel._targetPath = preSelectedPath;
			}
			return;
		}

		const panel = vscode.window.createWebviewPanel("springInitializer", "🌵 Spring Initializer", column || vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
		});

		SpringInitializerPanel.currentPanel = new SpringInitializerPanel(panel, extensionUri, preSelectedPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, preSelectedPath: string | undefined) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._targetPath = preSelectedPath;

		this._update();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "generate":
						await this._handleGenerate(message.config);
						break;
					case "getMetadata":
						await this._loadMetadata();
						break;
					case "getTheme":
						this._sendTheme();
						break;
				}
			},
			null,
			this._disposables,
		);

		vscode.window.onDidChangeActiveColorTheme(
			() => {
				this._sendTheme();
			},
			null,
			this._disposables,
		);

		this._loadMetadata();
	}

	private _sendTheme() {
		const theme = vscode.window.activeColorTheme;
		const isDark = theme.kind === vscode.ColorThemeKind.Dark || theme.kind === vscode.ColorThemeKind.HighContrast;
		this._panel.webview.postMessage({
			command: "themeChanged",
			isDark: isDark,
			themeKind: isDark ? "dark" : "light",
		});
	}

	private async _loadMetadata() {
		try {
			this._panel.webview.postMessage({ command: "status", text: "Connecting to Spring Initializr...", loading: true });
			const metadata = await SpringApiService.getAvailableVersions();
			this._panel.webview.postMessage({ command: "metadataLoaded", data: metadata });
		} catch (error: any) {
			this._panel.webview.postMessage({ command: "error", text: error.message });
			vscode.window.showErrorMessage(`Spring Initializer: ${error.message}`);
		}
	}

	private async _handleGenerate(config: ProjectConfig) {
		try {
			let targetPath = this._targetPath;

			if (!targetPath) {
				const folderUri = await vscode.window.showOpenDialog({
					canSelectFolders: true,
					canSelectFiles: false,
					canSelectMany: false,
					openLabel: "Select Project Location",
					title: `Choose where to create "${config.artifactId}"`,
				});

				if (!folderUri?.[0]) {
					this._panel.webview.postMessage({ command: "status", text: "", loading: false });
					return;
				}

				targetPath = folderUri[0].fsPath;
				this._targetPath = targetPath;
			}

			await this._generateProject(config, targetPath);
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed: ${error.message}`);
			this._panel.webview.postMessage({ command: "error", text: error.message });
		}
	}

	private async _generateProject(config: ProjectConfig, targetPath: string) {
		try {
			this._panel.webview.postMessage({ command: "status", text: "Generating project...", loading: true });
			const zipData = await SpringApiService.generateProject(config);
			const projectDir = path.join(targetPath, config.artifactId);

			if (fs.existsSync(projectDir)) {
				const overwrite = await vscode.window.showWarningMessage(`Directory "${config.artifactId}" already exists. Overwrite?`, { modal: true }, "Yes");
				if (overwrite !== "Yes") {
					this._panel.webview.postMessage({ command: "status", text: "", loading: false });
					return;
				}
				fs.rmSync(projectDir, { recursive: true, force: true });
			}

			fs.mkdirSync(projectDir, { recursive: true });
			const zip = new AdmZip(zipData);
			zip.extractAllTo(projectDir, true);

			this._panel.dispose();

			const action = await vscode.window.showInformationMessage(`✅ Project "${config.artifactId}" created successfully!`, "Open Project", "Open in Current Window");

			if (action === "Open Project") {
				await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectDir), true);
			} else if (action === "Open in Current Window") {
				await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectDir), false);
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed: ${error.message}`);
			this._panel.webview.postMessage({ command: "error", text: error.message });
		}
	}

	private _update() {
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview(): string {
		const webview = this._panel.webview;

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "styles.css"));
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.js"));

		const theme = vscode.window.activeColorTheme;
		const isDark = theme.kind === vscode.ColorThemeKind.Dark || theme.kind === vscode.ColorThemeKind.HighContrast;
		const themeClass = isDark ? "dark" : "light";

		return `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spring Initializer</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div class="toast" id="toast">
        <div class="toast-spinner"></div>
        <span class="toast-text" id="toastText">Loading...</span>
    </div>
    <div class="error-toast" id="errorToast"></div>

    <div class="container">
        <div class="header">
            <div class="header-icon">🌵</div>
            <h1>Spring Initializer</h1>
            <p class="subtitle">Bootstrap your Spring Boot application in seconds</p>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">📦</div>
                <span class="card-title">Project</span>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Type</label>
                    <select id="type"></select>
                </div>
                <div class="form-group">
                    <label>Language</label>
                    <select id="language"></select>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">⚙️</div>
                <span class="card-title">Spring Boot</span>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Version</label>
                    <select id="bootVersion"><option value="">Loading...</option></select>
                </div>
                <div class="form-group">
                    <label>Java</label>
                    <select id="javaVersion"><option value="">Loading...</option></select>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">📝</div>
                <span class="card-title">Project Metadata</span>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label>Group</label>
                    <input type="text" id="groupId" value="com.example" placeholder="com.example">
                </div>
                <div class="form-group">
                    <label>Artifact</label>
                    <input type="text" id="artifactId" value="demo" placeholder="demo">
                </div>
            </div>
            <div class="form-grid" style="margin-top: 16px;">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="name" value="demo" placeholder="demo">
                </div>
                <div class="form-group">
                    <label>Package Name</label>
                    <input type="text" id="packageName" value="com.example.demo" placeholder="com.example.demo">
                </div>
            </div>
            <div class="form-grid" style="margin-top: 16px;">
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="description" value="Demo project for Spring Boot" placeholder="Project description">
                </div>
                <div class="form-group">
                    <label>Packaging</label>
                    <select id="packaging"><option value="jar">Jar</option><option value="war">War</option></select>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-icon">📚</div>
                <span class="card-title">Dependencies</span>
            </div>
            <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" id="search" placeholder="Search dependencies...">
            </div>
            <div id="selectedBadge" class="selected-badge" style="display:none; margin-bottom: 12px; text-align: center;">
                <span id="selectedCount">0</span> dependencies selected
            </div>
            <div id="depGrid" class="dep-grid">
                <div class="dep-placeholder">Loading dependencies...</div>
            </div>
        </div>

        <button id="generateBtn" class="btn-generate">
            🚀 Generate Project
        </button>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
	}

	public dispose() {
		SpringInitializerPanel.currentPanel = undefined;
		this._panel.dispose();
		while (this._disposables.length) {
			this._disposables.pop()?.dispose();
		}
	}
}
