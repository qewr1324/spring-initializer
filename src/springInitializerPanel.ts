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
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, targetPath: string, _context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor?.viewColumn;

		if (SpringInitializerPanel.currentPanel) {
			SpringInitializerPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel("springInitializer", "🍃 Spring Initializer", column || vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true,
			localResourceRoots: [vscode.Uri.joinPath(extensionUri, "res")],
		});

		SpringInitializerPanel.currentPanel = new SpringInitializerPanel(panel, extensionUri, targetPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, targetPath: string) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._targetPath = targetPath;

		this._update();
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.command) {
					case "generate":
						await this._generateProject(message.config);
						break;
					case "getMetadata":
						await this._loadMetadata();
						break;
				}
			},
			null,
			this._disposables,
		);

		this._loadMetadata();
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

	private async _generateProject(config: ProjectConfig) {
		try {
			this._panel.webview.postMessage({ command: "status", text: "Generating project...", loading: true });
			const zipData = await SpringApiService.generateProject(config);
			const projectDir = path.join(this._targetPath, config.artifactId);

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
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spring Initializer</title>
    <style>
        :root {
            --spring-green: #6DB33F;
            --spring-green-dark: #5a9a32;
            --spring-green-light: rgba(109, 179, 63, 0.1);
            --bg-primary: var(--vscode-editor-background, #1e1e1e);
            --bg-secondary: var(--vscode-editor-inactiveSelectionBackground, #2d2d2d);
            --bg-tertiary: var(--vscode-input-background, #3c3c3c);
            --text-primary: var(--vscode-editor-foreground, #cccccc);
            --text-secondary: var(--vscode-descriptionForeground, #999999);
            --border-color: var(--vscode-panel-border, #404040);
            --input-bg: var(--vscode-input-background, #3c3c3c);
            --input-fg: var(--vscode-input-foreground, #cccccc);
            --input-border: var(--vscode-input-border, #555555);
            --focus-shadow: 0 0 0 3px rgba(109, 179, 63, 0.3);
            --radius: 10px;
            --radius-sm: 6px;
            --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 32px;
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            text-align: center;
            padding: 40px 0 32px;
            position: relative;
        }

        .header-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--spring-green), #4a8a2a);
            border-radius: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 16px;
            box-shadow: 0 8px 32px rgba(109, 179, 63, 0.3);
            animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }

        .header h1 {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, var(--spring-green), #8BC34A);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 4px;
        }

        .header .subtitle {
            color: var(--text-secondary);
            font-size: 15px;
            font-weight: 400;
        }

        /* Status Toast */
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 50px;
            padding: 10px 24px;
            display: none;
            align-items: center;
            gap: 10px;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
        }

        .toast.show { display: flex; }

        .toast-spinner {
            width: 18px; height: 18px;
            border: 2px solid var(--border-color);
            border-top-color: var(--spring-green);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .toast-text { font-size: 13px; color: var(--text-primary); }

        /* Error */
        .error-toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(220, 53, 69, 0.15);
            border: 1px solid rgba(220, 53, 69, 0.4);
            color: #f48771;
            border-radius: 50px;
            padding: 10px 24px;
            display: none;
            z-index: 1001;
            font-size: 13px;
            backdrop-filter: blur(10px);
        }

        .error-toast.show { display: block; }

        /* Card */
        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            padding: 24px;
            margin-bottom: 20px;
            transition: border-color var(--transition);
        }

        .card:hover { border-color: rgba(109, 179, 63, 0.3); }

        .card-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .card-icon {
            width: 36px; height: 36px;
            background: var(--spring-green-light);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: var(--spring-green);
        }

        .card-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
        }

        /* Form Grid */
        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        .form-grid.col-1 { grid-template-columns: 1fr; }

        @media (max-width: 600px) {
            .form-grid { grid-template-columns: 1fr; }
            body { padding: 16px; }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-secondary);
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: 10px 14px;
            background: var(--input-bg);
            color: var(--input-fg);
            border: 1.5px solid var(--input-border);
            border-radius: var(--radius-sm);
            font-size: 14px;
            font-family: inherit;
            transition: all var(--transition);
            outline: none;
        }

        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--spring-green);
            box-shadow: var(--focus-shadow);
        }

        .form-group select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23999' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 12px center;
            padding-right: 36px;
        }

        /* Search */
        .search-wrapper {
            position: relative;
            margin-bottom: 16px;
        }

        .search-wrapper input {
            width: 100%;
            padding: 12px 16px 12px 42px;
            background: var(--input-bg);
            color: var(--input-fg);
            border: 1.5px solid var(--input-border);
            border-radius: 50px;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: all var(--transition);
        }

        .search-wrapper input:focus {
            border-color: var(--spring-green);
            box-shadow: var(--focus-shadow);
        }

        .search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            font-size: 16px;
        }

        /* Dependency Grid */
        .dep-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 10px;
            max-height: 420px;
            overflow-y: auto;
            padding: 4px;
        }

        .dep-grid::-webkit-scrollbar { width: 6px; }
        .dep-grid::-webkit-scrollbar-track { background: transparent; }
        .dep-grid::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }

        .dep-card {
            background: var(--bg-tertiary);
            border: 2px solid transparent;
            border-radius: var(--radius-sm);
            padding: 14px;
            cursor: pointer;
            transition: all var(--transition);
            position: relative;
            overflow: hidden;
        }

        .dep-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: var(--spring-green-light);
            opacity: 0;
            transition: opacity var(--transition);
        }

        .dep-card:hover {
            border-color: var(--spring-green);
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        }

        .dep-card:hover::before { opacity: 0.5; }

        .dep-card.selected {
            border-color: var(--spring-green);
            background: rgba(109, 179, 63, 0.12);
        }

        .dep-card.selected::before { opacity: 1; }

        .dep-card .dep-name {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 6px;
            color: var(--text-primary);
            position: relative;
            z-index: 1;
        }

        .dep-card.selected .dep-name { color: var(--spring-green); }

        .dep-card .dep-desc {
            font-size: 11px;
            color: var(--text-secondary);
            line-height: 1.4;
            position: relative;
            z-index: 1;
        }

        .dep-card .check-mark {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            background: var(--spring-green);
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
            z-index: 2;
        }

        .dep-card.selected .check-mark { display: flex; }

        /* Selected count */
        .selected-badge {
            display: none;
            text-align: center;
            margin-top: 16px;
            padding: 8px 16px;
            background: var(--spring-green-light);
            border-radius: 50px;
            font-size: 13px;
            font-weight: 500;
            color: var(--spring-green);
        }

        .selected-badge.show { display: inline-block; }

        /* Generate Button */
        .btn-generate {
            width: 100%;
            padding: 16px 32px;
            background: linear-gradient(135deg, var(--spring-green), #5a9a32);
            color: white;
            border: none;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all var(--transition);
            letter-spacing: 0.5px;
            margin-top: 8px;
            position: relative;
            overflow: hidden;
        }

        .btn-generate::after {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 0; height: 0;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }

        .btn-generate:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 32px rgba(109, 179, 63, 0.4);
        }

        .btn-generate:hover::after {
            width: 600px;
            height: 600px;
        }

        .btn-generate:active { transform: translateY(0); }

        .btn-generate:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .btn-generate:disabled::after { display: none; }

        /* Pulse animation for button */
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(109, 179, 63, 0.4); }
            50% { box-shadow: 0 0 0 12px rgba(109, 179, 63, 0); }
        }

        .btn-generate:not(:disabled) {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="toast" id="toast">
        <div class="toast-spinner"></div>
        <span class="toast-text" id="toastText">Loading...</span>
    </div>
    <div class="error-toast" id="errorToast"></div>

    <div class="container">
        <div class="header">
            <div class="header-icon">🍃</div>
            <h1>Spring Initializer</h1>
            <p class="subtitle">Bootstrap your Spring Boot application in seconds</p>
        </div>

        <!-- Project Card -->
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

        <!-- Spring Boot Card -->
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

        <!-- Metadata Card -->
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

        <!-- Dependencies Card -->
        <div class="card">
            <div class="card-header">
                <div class="card-icon">📚</div>
                <span class="card-title">Dependencies</span>
            </div>
            <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" id="search" placeholder="Search dependencies...">
            </div>
            <div id="depGrid" class="dep-grid">
                <div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-secondary);">
                    Loading dependencies...
                </div>
            </div>
            <div style="text-align:center;">
                <span id="selectedBadge" class="selected-badge">
                    <span id="selectedCount">0</span> selected
                </span>
            </div>
        </div>

        <!-- Generate Button -->
        <button id="generateBtn" class="btn-generate">
            🚀 Generate Project
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let allDeps = [];
        let selectedDeps = new Set();

        // Toast functions
        function showToast(text) {
            document.getElementById('toast').classList.add('show');
            document.getElementById('toastText').textContent = text;
            document.getElementById('generateBtn').disabled = true;
        }

        function hideToast() {
            document.getElementById('toast').classList.remove('show');
            document.getElementById('generateBtn').disabled = false;
        }

        function showError(text) {
            const el = document.getElementById('errorToast');
            el.textContent = '❌ ' + text;
            el.classList.add('show');
            hideToast();
            setTimeout(function() { el.classList.remove('show'); }, 6000);
        }

        // Update package name
        function updatePackage() {
            const g = document.getElementById('groupId').value || 'com.example';
            const a = document.getElementById('artifactId').value || 'demo';
            document.getElementById('packageName').value = g + '.' + a.replace(/[^a-zA-Z0-9.]/g, '');
        }

        document.getElementById('groupId').addEventListener('input', updatePackage);
        document.getElementById('artifactId').addEventListener('input', function() {
            this.dataset.changed = 'true';
            updatePackage();
        });
        document.getElementById('name').addEventListener('input', function() {
            if (!document.getElementById('artifactId').dataset.changed) {
                document.getElementById('artifactId').value = this.value;
                updatePackage();
            }
        });

        // Search
        document.getElementById('search').addEventListener('input', function(e) {
            const term = e.target.value.toLowerCase();
            const filtered = allDeps.filter(function(d) {
                return d.name.toLowerCase().includes(term) ||
                    (d.description && d.description.toLowerCase().includes(term));
            });
            renderDeps(filtered);
        });

        function renderDeps(deps) {
            const container = document.getElementById('depGrid');
            container.innerHTML = '';

            if (!deps.length) {
                container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-secondary);">No dependencies found</div>';
                return;
            }

            deps.forEach(function(dep) {
                const card = document.createElement('div');
                card.className = 'dep-card' + (selectedDeps.has(dep.id) ? ' selected' : '');
                card.innerHTML =
                    '<div class="check-mark">✓</div>' +
                    '<div class="dep-name">' + dep.name + '</div>' +
                    '<div class="dep-desc">' + (dep.description || '') + '</div>';
                card.onclick = function() {
                    if (selectedDeps.has(dep.id)) {
                        selectedDeps.delete(dep.id);
                        card.classList.remove('selected');
                    } else {
                        selectedDeps.add(dep.id);
                        card.classList.add('selected');
                    }
                    updateBadge();
                };
                container.appendChild(card);
            });
        }

        function updateBadge() {
            const count = selectedDeps.size;
            const badge = document.getElementById('selectedBadge');
            if (count > 0) {
                badge.classList.add('show');
                document.getElementById('selectedCount').textContent = count;
            } else {
                badge.classList.remove('show');
            }
        }

        // Generate
        document.getElementById('generateBtn').addEventListener('click', function() {
            const groupId = document.getElementById('groupId').value.trim();
            const artifactId = document.getElementById('artifactId').value.trim();
            const bootVersion = document.getElementById('bootVersion').value;

            if (!groupId || !artifactId) {
                showError('Group and Artifact are required');
                return;
            }
            if (!bootVersion) {
                showError('Please select a Spring Boot version');
                return;
            }

            const config = {
                type: document.getElementById('type').value,
                language: document.getElementById('language').value,
                bootVersion: bootVersion,
                groupId: groupId,
                artifactId: artifactId,
                name: document.getElementById('name').value.trim() || artifactId,
                description: document.getElementById('description').value.trim(),
                packageName: document.getElementById('packageName').value.trim(),
                packaging: document.getElementById('packaging').value,
                javaVersion: document.getElementById('javaVersion').value,
                dependencies: Array.from(selectedDeps)
            };

            showToast('Generating project...');
            vscode.postMessage({ command: 'generate', config: config });
        });

        // Handle messages from extension
        window.addEventListener('message', function(e) {
            const msg = e.data;

            if (msg.command === 'status') {
                if (msg.loading) showToast(msg.text);
                else hideToast();
            }
            else if (msg.command === 'metadataLoaded') {
                hideToast();

                const data = msg.data;

                // Types
                if (data.types && data.types.values.length) {
                    const sel = document.getElementById('type');
                    sel.innerHTML = data.types.values.map(function(v) {
                        return '<option value="' + v.id + '">' + v.name + '</option>';
                    }).join('');
                    if (data.types.default) sel.value = data.types.default;
                }

                // Languages
                if (data.languages && data.languages.values.length) {
                    const sel = document.getElementById('language');
                    sel.innerHTML = data.languages.values.map(function(v) {
                        return '<option value="' + v.id + '">' + v.name + '</option>';
                    }).join('');
                    if (data.languages.default) sel.value = data.languages.default;
                }

                // Boot Versions
                if (data.bootVersions && data.bootVersions.values.length) {
                    const sel = document.getElementById('bootVersion');
                    sel.innerHTML = data.bootVersions.values.map(function(v) {
                        return '<option value="' + v.id + '">' + v.name + '</option>';
                    }).join('');
                    if (data.bootVersions.default) sel.value = data.bootVersions.default;
                }

                // Java Versions
                if (data.javaVersions && data.javaVersions.values.length) {
                    const sel = document.getElementById('javaVersion');
                    sel.innerHTML = data.javaVersions.values.map(function(v) {
                        return '<option value="' + v.id + '">' + v.name + '</option>';
                    }).join('');
                    if (data.javaVersions.default) sel.value = data.javaVersions.default;
                }

                // Packaging
                if (data.packagings && data.packagings.values.length) {
                    const sel = document.getElementById('packaging');
                    sel.innerHTML = data.packagings.values.map(function(v) {
                        return '<option value="' + v.id + '">' + v.name + '</option>';
                    }).join('');
                    if (data.packagings.default) sel.value = data.packagings.default;
                }

                // Dependencies
                if (data.dependencies && data.dependencies.values.length) {
                    allDeps = data.dependencies.values;
                    renderDeps(allDeps);
                }
            }
            else if (msg.command === 'error') {
                showError(msg.text);
            }
        });

        // Start loading
        showToast('Connecting to Spring Initializr...');
        vscode.postMessage({ command: 'getMetadata' });
    </script>
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
