export interface SpringDependency {
	name: string;
	id: string;
	description?: string;
	group?: string;
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

export class SpringApiService {
	private static readonly BASE_URL = "https://start.spring.io";

	static async getAvailableVersions(): Promise<any> {
		try {
			const response = await fetch(`${this.BASE_URL}/metadata/config`);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return await response.json();
		} catch (error) {
			console.error("Failed to fetch Spring Boot versions:", error);
			throw new Error("Failed to fetch Spring Boot versions. Check your internet connection.");
		}
	}

	static async generateProject(config: ProjectConfig): Promise<ArrayBuffer> {
		try {
			const params = new URLSearchParams({
				type: config.type,
				language: config.language,
				bootVersion: config.bootVersion,
				groupId: config.groupId,
				artifactId: config.artifactId,
				name: config.name,
				description: config.description,
				packageName: config.packageName,
				packaging: config.packaging,
				javaVersion: config.javaVersion,
				dependencies: config.dependencies.join(","),
			});

			const response = await fetch(`${this.BASE_URL}/starter.zip?${params.toString()}`);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return await response.arrayBuffer();
		} catch (error) {
			console.error("Failed to generate project:", error);
			throw new Error("Failed to generate project. Please try again.");
		}
	}
}
