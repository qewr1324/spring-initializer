import { execFileSync } from "node:child_process";
import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/extension.ts"],
	format: ["cjs"],
	external: ["vscode"],
	outDir: "dist",
});
