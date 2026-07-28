import * as https from "node:https";
import * as http from "node:http";

export interface SpringDependency {
	name: string;
	id: string;
	description?: string;
	group?: string;
}

export interface SpringInitializrMetadata {
	types: { default: string; values: Array<{ id: string; name: string; description?: string }> };
	languages: { default: string; values: Array<{ id: string; name: string }> };
	bootVersions: { default: string; values: Array<{ id: string; name: string }> };
	packagings: { default: string; values: Array<{ id: string; name: string }> };
	javaVersions: { default: string; values: Array<{ id: string; name: string }> };
	dependencies: { values: SpringDependency[] };
}

export interface ProjectConfig {
	type: string;
	language: string;
	bootVersion: string;
	groupId: string;
	artifactId: string;
	name: string;
	description: string;
	packageName: string;
	packaging: string;
	javaVersion: string;
	dependencies: string[];
}

function httpGet(url: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith("https") ? https : http;

		const options = {
			headers: { "User-Agent": "VSCode-Spring-Initializer/1.0" },
			family: 4,
			timeout: 10000,
		};

		const req = client
			.get(url, options, (res) => {
				if (res.statusCode === 301 || res.statusCode === 302) {
					httpGet(res.headers.location!).then(resolve).catch(reject);
					return;
				}
				if (res.statusCode !== 200) {
					reject(new Error(`HTTP ${res.statusCode}`));
					return;
				}
				let data = "";
				res.on("data", (chunk) => (data += chunk));
				res.on("end", () => resolve(data));
				res.on("error", reject);
			})
			.on("error", reject);

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timeout"));
		});
	});
}

function httpGetBinary(url: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith("https") ? https : http;

		const options = {
			headers: { "User-Agent": "VSCode-Spring-Initializer/1.0" },
			family: 4,
			timeout: 30000,
		};

		const req = client
			.get(url, options, (res) => {
				if (res.statusCode === 301 || res.statusCode === 302) {
					httpGetBinary(res.headers.location!).then(resolve).catch(reject);
					return;
				}
				if (res.statusCode !== 200) {
					let err = "";
					res.on("data", (chunk) => (err += chunk));
					res.on("end", () => reject(new Error(`HTTP ${res.statusCode}: ${err.substring(0, 100)}`)));
					return;
				}
				const chunks: Buffer[] = [];
				res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
				res.on("end", () => resolve(Buffer.concat(chunks)));
				res.on("error", reject);
			})
			.on("error", reject);

		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timeout"));
		});
	});
}

function flattenDependencies(groups: any[]): SpringDependency[] {
	const result: SpringDependency[] = [];
	for (const group of groups) {
		if (group.content && Array.isArray(group.content)) {
			for (const dep of group.content) {
				if (dep.id && dep.name) {
					result.push({
						id: dep.id,
						name: dep.name,
						description: dep.description || "",
						group: group.name || "",
					});
				}
			}
		}
	}
	return result;
}

export class SpringApiService {
	private static readonly BASE_URL = "https://start.spring.io";

	static async getAvailableVersions(): Promise<SpringInitializrMetadata> {
		try {
			const url = `${this.BASE_URL}/metadata/config?platform=web`;
			console.log("📡 Fetching metadata...");

			const data = await httpGet(url);
			const parsed = JSON.parse(data);

			const result: SpringInitializrMetadata = {
				types: {
					default: "gradle-project",
					values: (parsed.types?.content || []).filter((t: any) => t.tags?.format === "project").map((t: any) => ({ id: t.id, name: t.name, description: t.description })),
				},
				languages: {
					default: parsed.languages?.content?.find((l: any) => l.default)?.id || "java",
					values: (parsed.languages?.content || []).map((l: any) => ({ id: l.id, name: l.name })),
				},
				bootVersions: {
					default: parsed.bootVersions?.content?.find((v: any) => v.default)?.id || "",
					values: (parsed.bootVersions?.content || []).map((v: any) => ({ id: v.id, name: v.name })),
				},
				packagings: {
					default: "jar",
					values: (parsed.packagings?.content || []).map((p: any) => ({ id: p.id, name: p.name })),
				},
				javaVersions: {
					default: parsed.javaVersions?.content?.find((j: any) => j.default)?.id || "17",
					values: (parsed.javaVersions?.content || []).map((j: any) => ({ id: j.id, name: j.name })),
				},
				dependencies: {
					values: flattenDependencies(parsed.dependencies?.content || []),
				},
			};

			console.log(`✅ Loaded: ${result.bootVersions.values.length} versions, ${result.dependencies.values.length} dependencies`);
			return result;
		} catch (error: any) {
			console.error("❌ Metadata error:", error);
			throw error;
		}
	}

	static async generateProject(config: ProjectConfig): Promise<Buffer> {
		try {
			const params = new URLSearchParams();
			params.append("type", config.type);
			params.append("language", config.language);
			params.append("bootVersion", config.bootVersion);
			params.append("baseDir", config.artifactId);
			params.append("groupId", config.groupId);
			params.append("artifactId", config.artifactId);
			params.append("name", config.name || config.artifactId);
			params.append("description", config.description || "");
			params.append("packageName", config.packageName);
			params.append("packaging", config.packaging);
			params.append("javaVersion", config.javaVersion);
			config.dependencies.forEach((dep) => params.append("dependencies", dep));

			const url = `${this.BASE_URL}/starter.zip?${params.toString()}`;
			console.log("📥 Generating project...");

			const buffer = await httpGetBinary(url);

			if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
				throw new Error("Invalid ZIP file received");
			}

			console.log(`✅ Downloaded: ${(buffer.length / 1024).toFixed(1)} KB`);
			return buffer;
		} catch (error: any) {
			console.error("❌ Generation error:", error);
			throw error;
		}
	}
}
