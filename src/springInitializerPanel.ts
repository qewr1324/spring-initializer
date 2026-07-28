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
	private readonly _targetPath: string;
	private readonly _context: vscode.ExtensionContext;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, targetPath: string, context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If panel already exists, show it
		if (SpringInitializerPanel.currentPanel) {
			SpringInitializerPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Create new panel
		const panel = vscode.window.createWebviewPanel("springInitializer", "🍃 Spring Initializer", column || vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(extensionUri, "res")],
		});

		SpringInitializerPanel.currentPanel = new SpringInitializerPanel(panel, extensionUri, targetPath, context);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, targetPath: string, context: vscode.ExtensionContext) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._targetPath = targetPath;
		this._context = context;

		// Set HTML content
		this._update();

		// Handle panel disposal
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from webview
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "generate":
						await this._generateProject(message.config);
						break;
					case "getMetadata":
						await this._loadMetadata();
						break;
					case "error":
						vscode.window.showErrorMessage(message.text);
						break;
				}
			},
			null,
			this._disposables,
		);

		// Load metadata after panel is ready
		this._loadMetadata();
	}

	private async _loadMetadata() {
		try {
			this._panel.webview.postMessage({
				command: "loading",
				text: "Fetching Spring Boot metadata...",
			});

			const metadata = await SpringApiService.getAvailableVersions();
			this._panel.webview.postMessage({
				command: "metadataLoaded",
				data: metadata,
			});
		} catch (error: any) {
			this._panel.webview.postMessage({
				command: "error",
				text: `Failed to load metadata: ${error.message}`,
			});
		}
	}

	private async _generateProject(config: ProjectConfig) {
		try {
			this._panel.webview.postMessage({
				command: "loading",
				text: "Generating Spring Boot project...",
			});

			const zipData = await SpringApiService.generateProject(config);
			const projectDir = path.join(this._targetPath, config.artifactId);

			// Check if directory already exists
			if (fs.existsSync(projectDir)) {
				const overwrite = await vscode.window.showWarningMessage(`Directory "${config.artifactId}" already exists. Do you want to overwrite it?`, { modal: true }, "Yes", "No");

				if (overwrite !== "Yes") {
					return;
				}

				// Remove existing directory
				fs.rmSync(projectDir, { recursive: true, force: true });
			}

			// Create and extract project
			fs.mkdirSync(projectDir, { recursive: true });
			const zip = new AdmZip(Buffer.from(zipData));
			zip.extractAllTo(projectDir, true);

			const action = await vscode.window.showInformationMessage(`✅ Spring Boot project created at "${config.artifactId}"`, "Open Project", "Open in Current Window");

			// Close the panel
			this._panel.dispose();

			// Open project based on user choice
			if (action === "Open Project") {
				const uri = vscode.Uri.file(projectDir);
				await vscode.commands.executeCommand("vscode.openFolder", uri, true);
			} else if (action === "Open in Current Window") {
				const uri = vscode.Uri.file(projectDir);
				await vscode.commands.executeCommand("vscode.openFolder", uri, false);
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to generate project: ${error.message}`);
			this._panel.webview.postMessage({
				command: "error",
				text: error.message,
			});
		}
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get icon path
		const iconPath = vscode.Uri.joinPath(this._extensionUri, "res", "facet-icon-big.png");
		const iconSrc = webview.asWebviewUri(iconPath);

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spring Initializer</title>
    <style>
        ${this._getStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${iconSrc}" alt="Spring" class="logo" />
            <div>
                <h1>Spring Initializer</h1>
                <p class="subtitle">Bootstrap your Spring Boot application</p>
            </div>
        </div>

        <div id="loading" class="loading" style="display: none;">
            <div class="spinner"></div>
            <p id="loadingText">Loading...</p>
        </div>

        <div class="form-section">
            <h2>📦 Project</h2>
            <div class="form-row">
                <div class="form-group">
                    <label>Project Type</label>
                    <select id="projectType">
                        <option value="gradle-project" selected>Gradle - Groovy</option>
                        <option value="gradle-project-kotlin">Gradle - Kotlin</option>
                        <option value="maven-project">Maven</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Language</label>
                    <select id="language">
                        <option value="java" selected>Java</option>
                        <option value="kotlin">Kotlin</option>
                        <option value="groovy">Groovy</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h2>⚙️ Spring Boot</h2>
            <div class="form-group">
                <label>Spring Boot Version</label>
                <select id="bootVersion">
                    <option value="">Loading versions...</option>
                </select>
            </div>
        </div>

        <div class="form-section">
            <h2>📝 Project Metadata</h2>
            <div class="form-row">
                <div class="form-group">
                    <label>Group</label>
                    <input type="text" id="groupId" value="com.example" />
                </div>
                <div class="form-group">
                    <label>Artifact</label>
                    <input type="text" id="artifactId" value="demo" />
                </div>
            </div>
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="name" value="demo" />
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="description" value="Demo project for Spring Boot" />
            </div>
            <div class="form-group">
                <label>Package Name</label>
                <input type="text" id="packageName" value="com.example.demo" />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Packaging</label>
                    <select id="packaging">
                        <option value="jar" selected>Jar</option>
                        <option value="war">War</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Java Version</label>
                    <select id="javaVersion">
                        <option value="21" selected>21</option>
                        <option value="17">17</option>
                        <option value="11">11</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h2>📚 Dependencies</h2>
            <div class="search-box">
                <input type="text" id="dependencySearch" placeholder="🔍 Search for dependencies..." />
            </div>
            <div id="dependenciesList" class="dependencies-list">
                <p class="placeholder">Loading dependencies...</p>
            </div>
            <div class="selected-count" id="selectedCount" style="display: none;">
                <span id="count">0</span> dependencies selected
            </div>
        </div>

        <div class="action-bar">
            <button id="generateBtn" class="btn-primary">
                🚀 Generate Project
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let allDependencies = [];
        let selectedDependencies = new Set();

        // Event listeners
        document.getElementById('generateBtn').addEventListener('click', generateProject);
        document.getElementById('dependencySearch').addEventListener('input', filterDependencies);
        document.getElementById('groupId').addEventListener('input', updatePackageName);
        document.getElementById('artifactId').addEventListener('input', updatePackageName);
        document.getElementById('name').addEventListener('input', function(e) {
            if (!document.getElementById('artifactId').dataset.manuallyChanged) {
                document.getElementById('artifactId').value = e.target.value;
                updatePackageName();
            }
        });
        document.getElementById('artifactId').addEventListener('input', function() {
            this.dataset.manuallyChanged = 'true';
        });

        function updatePackageName() {
            const groupId = document.getElementById('groupId').value || 'com.example';
            const artifactId = document.getElementById('artifactId').value || 'demo';
            document.getElementById('packageName').value = groupId + '.' + artifactId.replace(/[^a-zA-Z0-9]/g, '');
        }

        function showLoading(text) {
            document.getElementById('loading').style.display = 'flex';
            document.getElementById('loadingText').textContent = text;
        }

        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }

        function generateProject() {
            const groupId = document.getElementById('groupId').value.trim();
            const artifactId = document.getElementById('artifactId').value.trim();

            if (!groupId || !artifactId) {
                vscode.postMessage({ command: 'error', text: 'Group and Artifact are required!' });
                return;
            }

            const config = {
                type: document.getElementById('projectType').value,
                language: document.getElementById('language').value,
                bootVersion: document.getElementById('bootVersion').value,
                groupId: groupId,
                artifactId: artifactId,
                name: document.getElementById('name').value.trim() || artifactId,
                description: document.getElementById('description').value.trim(),
                packageName: document.getElementById('packageName').value.trim(),
                packaging: document.getElementById('packaging').value,
                javaVersion: document.getElementById('javaVersion').value,
                dependencies: Array.from(selectedDependencies)
            };

            showLoading('Generating project...');
            document.getElementById('generateBtn').disabled = true;
            vscode.postMessage({ command: 'generate', config: config });
        }

        function filterDependencies(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allDependencies.filter(dep => 
                dep.name.toLowerCase().includes(searchTerm) || 
                (dep.description && dep.description.toLowerCase().includes(searchTerm))
            );
            renderDependencies(filtered);
        }

        function renderDependencies(dependencies) {
            const container = document.getElementById('dependenciesList');
            container.innerHTML = '';

            if (dependencies.length === 0) {
                container.innerHTML = '<p class="placeholder">No dependencies found</p>';
                return;
            }

            dependencies.forEach(dep => {
                const card = document.createElement('div');
                card.className = 'dependency-card' + (selectedDependencies.has(dep.id) ? ' selected' : '');
                card.innerHTML = \`
                    <div class="dependency-name">\${dep.name}</div>
                    <div class="dependency-desc">\${dep.description || 'No description'}</div>
                \`;
                card.addEventListener('click', () => toggleDependency(dep, card));
                container.appendChild(card);
            });
        }

        function toggleDependency(dep, card) {
            if (selectedDependencies.has(dep.id)) {
                selectedDependencies.delete(dep.id);
                card.classList.remove('selected');
            } else {
                selectedDependencies.add(dep.id);
                card.classList.add('selected');
            }
            updateSelectedCount();
        }

        function updateSelectedCount() {
            const countDiv = document.getElementById('selectedCount');
            const countSpan = document.getElementById('count');
            if (selectedDependencies.size > 0) {
                countDiv.style.display = 'block';
                countSpan.textContent = selectedDependencies.size;
            } else {
                countDiv.style.display = 'none';
            }
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'loading':
                    showLoading(message.text);
                    break;
                case 'metadataLoaded':
                    hideLoading();
                    if (message.data.bootVersion) {
                        const versionSelect = document.getElementById('bootVersion');
                        versionSelect.innerHTML = message.data.bootVersion.values
                            .map(v => \`<option value="\${v.id}">\${v.name}</option>\`)
                            .join('');
                    }
                    if (message.data.dependencies) {
                        allDependencies = message.data.dependencies.values;
                        renderDependencies(allDependencies);
                    }
                    break;
                case 'error':
                    hideLoading();
                    document.getElementById('generateBtn').disabled = false;
                    break;
            }
        });

        // Load metadata on startup
        showLoading('Connecting to Spring Initializr...');
        vscode.postMessage({ command: 'getMetadata' });
    </script>
</body>
</html>`;
	}

	private _getStyles(): string {
		return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .logo {
            width: 48px;
            height: 48px;
            border-radius: 8px;
        }

        h1 {
            font-size: 28px;
            font-weight: 600;
            color: #6DB33F;
            margin-bottom: 5px;
        }

        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 20px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--vscode-panel-border);
            border-top-color: #6DB33F;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .form-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-panel-border);
            transition: border-color 0.2s;
        }

        .form-section:hover {
            border-color: #6DB33F;
        }

        .form-section h2 {
            font-size: 16px;
            margin-bottom: 15px;
            color: #6DB33F;
            font-weight: 600;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-input-placeholderForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
            font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: #6DB33F;
            box-shadow: 0 0 0 2px rgba(109, 179, 63, 0.2);
        }

        .search-box {
            margin-bottom: 15px;
        }

        .search-box input {
            width: 100%;
            padding: 12px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            font-size: 14px;
            transition: border-color 0.2s;
        }

        .search-box input:focus {
            outline: none;
            border-color: #6DB33F;
            box-shadow: 0 0 0 2px rgba(109, 179, 63, 0.2);
        }

        .dependencies-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 10px;
            max-height: 400px;
            overflow-y: auto;
            padding: 5px;
        }

        .dependencies-list::-webkit-scrollbar {
            width: 8px;
        }

        .dependencies-list::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
        }

        .dependencies-list::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 4px;
        }

        .placeholder {
            color: var(--vscode-descriptionForeground);
            text-align: center;
            padding: 20px;
            grid-column: 1 / -1;
        }

        .dependency-card {
            background-color: var(--vscode-editor-background);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .dependency-card:hover {
            border-color: #6DB33F;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .dependency-card.selected {
            background-color: rgba(109, 179, 63, 0.15);
            border-color: #6DB33F;
            box-shadow: 0 0 0 1px rgba(109, 179, 63, 0.3);
        }

        .dependency-name {
            font-weight: 600;
            margin-bottom: 5px;
            font-size: 13px;
            color: var(--vscode-editor-foreground);
        }

        .dependency-card.selected .dependency-name {
            color: #6DB33F;
        }

        .dependency-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }

        .selected-count {
            margin-top: 15px;
            padding: 10px;
            background-color: rgba(109, 179, 63, 0.1);
            border-radius: 6px;
            text-align: center;
            font-size: 13px;
            color: #6DB33F;
            font-weight: 500;
        }

        .action-bar {
            text-align: right;
            padding: 20px 0;
            position: sticky;
            bottom: 0;
            background-color: var(--vscode-editor-background);
            border-top: 2px solid var(--vscode-panel-border);
            margin-top: 20px;
        }

        .btn-primary {
            background-color: #6DB33F;
            color: white;
            border: none;
            padding: 12px 28px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            transition: all 0.2s ease;
            letter-spacing: 0.5px;
        }

        .btn-primary:hover {
            background-color: #5a9a32;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(109, 179, 63, 0.4);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
            
            .dependencies-list {
                grid-template-columns: 1fr;
            }
        }
    `;
	}

	public dispose() {
		SpringInitializerPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}
