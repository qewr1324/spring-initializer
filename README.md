# 🌵 Spring Initializer for VS Code

> **Create Spring Boot projects directly from VS Code — just like IntelliJ IDEA.**

---

<!-- Image & Icon -->
<div align="center"> <a href="https://github.com/qewr1324/spring-initializer"> <img src="./res/spring-icon-big.png" alt="Spring Initializer Icon" width="128" height="128" /> </a> <h3>✨ Bootstrap your Spring Boot application in seconds ✨</h3>

<!-- Static Badges -->

[![Version](https://img.shields.io/github/v/release/qewr1324/spring-initializer)](https://github.com/qewr1324/spring-initializer/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85%2B-blue.svg?logo=visualstudiocode)](https://code.visualstudio.com/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.x-brightgreen.svg?logo=springboot)](https://start.spring.io)

[![GitHub stars](https://img.shields.io/github/stars/qewr1324/spring-initializer?style=social)](https://github.com/qewr1324/spring-initializer/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/qewr1324/spring-initializer?style=social)](https://github.com/qewr1324/spring-initializer/network/members)
[![GitHub watchers](https://img.shields.io/github/watchers/qewr1324/spring-initializer?style=social)](https://github.com/qewr1324/spring-initializer/watchers)

[![GitHub code size](https://img.shields.io/github/languages/code-size/qewr1324/spring-initializer?color=lightgrey)](https://github.com/qewr1324/spring-initializer)
[![GitHub repo size](https://img.shields.io/github/repo-size/qewr1324/spring-initializer?color=lightgrey)](https://github.com/qewr1324/spring-initializer)
[![GitHub file count](https://img.shields.io/github/directory-file-count/qewr1324/spring-initializer?color=lightgrey)](https://github.com/qewr1324/spring-initializer)

</div>

---

## 🎥 Demo

<div align="center">

![Demo](https://github.com/qewr1324/spring-initializer/raw/main/res/review.gif)

</div>

---

## 📖 What is Spring Initializer?

Spring Initializer is a **VS Code extension** that brings the full power of Spring Initializr directly into your editor. Generate complete Spring Boot projects with dependencies, build configuration, and project metadata — all from a beautiful, modern interface that feels just like IntelliJ IDEA.

No more switching to your browser. No more downloading and extracting ZIP files manually. Just configure, click, and start coding.

---

## ✨ Features

- 🎯 **Full Spring Initializr integration** — all versions, all dependencies
- 🎨 **Beautiful modern UI with dark & light theme support**
- 🚀 **One-click project generation** — from form to open project in seconds
- 📦 **All build tools** — Maven, Gradle (Groovy & Kotlin DSL)
- ☕ **All JVM languages** — Java, Kotlin, Groovy
- 📚 **300+ dependencies** — searchable, categorized, with descriptions
- 🔄 **Live theme sync** — automatically matches your VS Code theme
- **⚡ Status bar shortcut** — always one click away
- **📁 Right-click integration** — generate directly into any folder
- **🛡️ Offline-ready validation** — checks ZIP integrity before extracting

<!-- Marketplace Badges -->

[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/qewr1324.spring-initializer?label=vs%20code)](https://marketplace.visualstudio.com/items?itemName=qewr1324.spring-initializer)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/qewr1324.spring-initializer?label=installs)](https://marketplace.visualstudio.com/items?itemName=qewr1324.spring-initializer)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/qewr1324.spring-initializer?label=downloads)](https://marketplace.visualstudio.com/items?itemName=qewr1324.spring-initializer)
[![VS Code Marketplace Rating](https://img.shields.io/visual-studio-marketplace/r/qewr1324.spring-initializer?label=rating)](https://marketplace.visualstudio.com/items?itemName=qewr1324.spring-initializer)

---

## 🚀 Quick Start

### Installation

-   1. Open `VS Code`
-   2. Go to Extensions (`Ctrl+Shift+X`)
-   3. Search for `"Spring Initializer"`
-   4. Click `Install`

- Or install via command line:

```bash
code --install-extension qewr1324.spring-initializer
```

---

## 🚀 Usage

| Method | How |
|--------|-----|
| **Status Bar** | Click `$(project) Spring Initializer` in the bottom bar |
| **Command Palette** | `Ctrl+Shift+P` → `Spring Initializer: New Project` |
| **Right-click** | Right-click any folder → `Spring Initializer: New Project` |

---

## Alternative ways to launch

---

## 📁 Project Structure

```bash
spring-initializer/
├── 📄 package.json              # Extension manifest
├── 📄 tsconfig.json             # TypeScript configuration
├── 📁 src/                      # Extension source code
│   ├── 📄 extension.ts          # Entry point & command registration
│   ├── 📄 apiService.ts         # Spring Initializr API client
│   └── 📄 springInitializerPanel.ts  # Webview panel logic
├── 📁 media/                    # Webview assets
│   ├── 🎨 styles.css            # Complete UI stylesheet (dark + light)
│   └── 📜 main.js               # Frontend logic
├── 📁 res/                      # Icons & images
│   └── 🖼️ spring-icon-big.png    # Extension icon
└── 📁 dist/                     # Compiled output
    └── 📄 extension.cjs
```

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| 📦 Dependencies | 300+ |
| 🎨 UI Themes | Dark + Light (auto-synced) |
| ☕ Languages | Java, Kotlin, Groovy |
| 🔨 Build Tools | Maven, Gradle (Groovy/Kotlin) |
| 📦 Packaging | Jar, War |
| ☕ Java Versions | 11, 17, 21, 25, 26 |

---

## 🔌 API Integration

- This extension uses the official `Spring Initializr API`:

- **Metadata endpoint:** /metadata/config?platform=web
- **Project generation:** /starter.zip
- All requests use `IPv4` for maximum compatibility. Response validation includes ZIP magic number verification (PK signature)

---

## 🛠️ Development

### Prerequisites

- Bun >= 1.0
- VS Code >= 1.85
- Node.js >= 20

```bash
# Clone the repository
git clone https://github.com/qewr1324/spring-initializer.git
cd spring-initializer

# Install dependencies
bun install

# Build the extension
bun run build

# Open in VS Code
code .
```

# 📝 License

- MIT © [GhurbeSABZI](https://github.com/qewr1324)

---

# 🤝 Contributing

[![GitHub issues](https://img.shields.io/github/issues/qewr1324/spring-initializer?color=red)](https://github.com/qewr1324/spring-initializer/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/qewr1324/spring-initializer?color=blueviolet)](https://github.com/qewr1324/spring-initializer/pulls)
[![GitHub closed issues](https://img.shields.io/github/issues-closed/qewr1324/spring-initializer?color=green)](https://github.com/qewr1324/spring-initializer/issues?q=is%3Aissue+is%3Aclosed)
[![GitHub closed PRs](https://img.shields.io/github/issues-pr-closed/qewr1324/spring-initializer?color=brightgreen)](https://github.com/qewr1324/spring-initializer/pulls?q=is%3Apr+is%3Aclosed)

[![GitHub contributors](https://img.shields.io/github/contributors/qewr1324/spring-initializer?color=orange)](https://github.com/qewr1324/spring-initializer/graphs/contributors)
[![GitHub last commit](https://img.shields.io/github/last-commit/qewr1324/spring-initializer?color=blue)](https://github.com/qewr1324/spring-initializer/commits/main)
[![GitHub commit activity](https://img.shields.io/github/commit-activity/m/qewr1324/spring-initializer?color=yellowgreen)](https://github.com/qewr1324/spring-initializer/graphs/commit-activity)
[![GitHub top language](https://img.shields.io/github/languages/top/qewr1324/spring-initializer?color=purple)](https://github.com/qewr1324/spring-initializer)

### Contributions are welcome! Whether it's:

- 🐛 Reporting bugs

- 💡 Suggesting features

- 🔧 Submitting pull requests

- 📝 Improving documentation

## 🙏 Acknowledgments

- **Spring Initializr** — the amazing project generation service
- **VS Code API** — for the powerful extension framework
- **IntelliJ IDEA** — for the UI inspirations

#### Made with ❤️ for Spring Boot developers

[![Repo](https://img.shields.io/badge/Repo-spring--initializer-6DB33F?logo=springboot)](https://github.com/qewr1324/spring-initializer)
