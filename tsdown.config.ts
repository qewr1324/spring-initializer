import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/extension.ts"],
	format: ["cjs"],
	outDir: "dist",
	external: ["vscode"],
	dts: false,
	clean: true,
	platform: "node",
	target: "node16",
	noExternal: ["adm-zip"],
	onSuccess: () => {
		console.log("✅ Build complete!");
	},
});
