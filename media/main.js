// ========== Acquire VSCode API ==========
const vscode = acquireVsCodeApi();

// ========== State ==========
let allDeps = [];
let selectedDeps = new Set();
let currentTheme = "dark";

// ========== DOM Elements ==========
const $ = (id) => document.getElementById(id);
const toast = $("toast");
const toastText = $("toastText");
const errorToast = $("errorToast");
const generateBtn = $("generateBtn");
const depGrid = $("depGrid");
const searchInput = $("search");
const selectedBadge = $("selectedBadge");
const selectedCount = $("selectedCount");

const groupId = $("groupId");
const artifactId = $("artifactId");
const nameInput = $("name");
const packageName = $("packageName");
const description = $("description");
const typeSelect = $("type");
const languageSelect = $("language");
const bootVersionSelect = $("bootVersion");
const javaVersionSelect = $("javaVersion");
const packagingSelect = $("packaging");

// ========== Toast Functions ==========
function showToast(text) {
	toast.classList.add("show");
	toastText.textContent = text;
	generateBtn.disabled = true;
}

function hideToast() {
	toast.classList.remove("show");
	generateBtn.disabled = false;
}

function showError(text) {
	errorToast.textContent = "❌ " + text;
	errorToast.classList.add("show");
	hideToast();
	setTimeout(() => errorToast.classList.remove("show"), 6000);
}

// ========== Package Name Update ==========
function updatePackage() {
	const g = groupId.value || "com.example";
	const a = artifactId.value || "demo";
	packageName.value = g + "." + a.replace(/[^a-zA-Z0-9.]/g, "");
}

groupId.addEventListener("input", updatePackage);
artifactId.addEventListener("input", function () {
	this.dataset.changed = "true";
	updatePackage();
});
nameInput.addEventListener("input", function () {
	if (!artifactId.dataset.changed) {
		artifactId.value = this.value;
		updatePackage();
	}
});

// ========== Search Dependencies ==========
searchInput.addEventListener("input", function (e) {
	const term = e.target.value.toLowerCase();
	const filtered = allDeps.filter((d) => d.name.toLowerCase().includes(term) || (d.description && d.description.toLowerCase().includes(term)));
	renderDeps(filtered);
});

// ========== Render Dependencies ==========
function renderDeps(deps) {
	depGrid.innerHTML = "";

	if (!deps.length) {
		depGrid.innerHTML = '<div class="dep-placeholder">No dependencies found</div>';
		return;
	}

	deps.forEach((dep) => {
		const card = document.createElement("div");
		card.className = "dep-card" + (selectedDeps.has(dep.id) ? " selected" : "");
		card.innerHTML = '<div class="check-mark">✓</div>' + '<div class="dep-name">' + dep.name + "</div>" + '<div class="dep-desc">' + (dep.description || "") + "</div>";

		card.addEventListener("click", () => {
			if (selectedDeps.has(dep.id)) {
				selectedDeps.delete(dep.id);
				card.classList.remove("selected");
			} else {
				selectedDeps.add(dep.id);
				card.classList.add("selected");
			}
			updateBadge();
		});

		depGrid.appendChild(card);
	});
}

// ========== Update Badge ==========
function updateBadge() {
	const count = selectedDeps.size;
	if (count > 0) {
		selectedBadge.style.display = "block";
		selectedCount.textContent = count;
	} else {
		selectedBadge.style.display = "none";
	}
}

// ========== Generate Project ==========
generateBtn.addEventListener("click", () => {
	const gid = groupId.value.trim();
	const aid = artifactId.value.trim();
	const bootVersion = bootVersionSelect.value;

	if (!gid || !aid) {
		showError("Group and Artifact are required");
		return;
	}
	if (!bootVersion) {
		showError("Please select a Spring Boot version");
		return;
	}

	const config = {
		type: typeSelect.value,
		language: languageSelect.value,
		bootVersion: bootVersion,
		groupId: gid,
		artifactId: aid,
		name: nameInput.value.trim() || aid,
		description: description.value.trim(),
		packageName: packageName.value.trim(),
		packaging: packagingSelect.value,
		javaVersion: javaVersionSelect.value,
		dependencies: Array.from(selectedDeps),
	};

	showToast("Generating project...");
	vscode.postMessage({ command: "generate", config: config });
});

// ========== Handle Messages from Extension ==========
window.addEventListener("message", (e) => {
	const msg = e.data;

	if (msg.command === "status") {
		if (msg.loading) showToast(msg.text);
		else hideToast();
	} else if (msg.command === "themeChanged") {
		currentTheme = msg.themeKind;
		document.documentElement.className = currentTheme;
		// Update select arrow color
		document.querySelectorAll("select").forEach((s) => {
			s.style.backgroundImage =
				currentTheme === "light"
					? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")"
					: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ca3af' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E\")";
		});
	} else if (msg.command === "metadataLoaded") {
		hideToast();
		populateForm(msg.data);
	} else if (msg.command === "error") {
		showError(msg.text);
	}
});

// ========== Populate Form with Metadata ==========
function populateForm(data) {
	// Types
	if (data.types?.values?.length) {
		typeSelect.innerHTML = data.types.values.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
		if (data.types.default) typeSelect.value = data.types.default;
	}

	// Languages
	if (data.languages?.values?.length) {
		languageSelect.innerHTML = data.languages.values.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
		if (data.languages.default) languageSelect.value = data.languages.default;
	}

	// Boot Versions
	if (data.bootVersions?.values?.length) {
		bootVersionSelect.innerHTML = data.bootVersions.values.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
		if (data.bootVersions.default) bootVersionSelect.value = data.bootVersions.default;
	}

	// Java Versions
	if (data.javaVersions?.values?.length) {
		javaVersionSelect.innerHTML = data.javaVersions.values.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
		if (data.javaVersions.default) javaVersionSelect.value = data.javaVersions.default;
	}

	// Packaging
	if (data.packagings?.values?.length) {
		packagingSelect.innerHTML = data.packagings.values.map((v) => `<option value="${v.id}">${v.name}</option>`).join("");
		if (data.packagings.default) packagingSelect.value = data.packagings.default;
	}

	// Dependencies
	if (data.dependencies?.values?.length) {
		allDeps = data.dependencies.values;
		renderDeps(allDeps);
	}
}

// ========== Init ==========
// Request current theme
vscode.postMessage({ command: "getTheme" });

// Load metadata
showToast("Connecting to Spring Initializr...");
vscode.postMessage({ command: "getMetadata" });
