#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parse CLI arguments to get version type
 * Supports: --version=major|minor|patch or defaults to patch
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const versionArg = args.find((arg) => arg.startsWith("--version="));

	if (versionArg) {
		const versionType = versionArg.split("=")[1];
		if (!["major", "minor", "patch"].includes(versionType)) {
			console.error(
				`Invalid version type: ${versionType}. Must be major, minor, or patch.`,
			);
			process.exit(1);
		}
		return versionType;
	}

	return "patch"; // Default to patch
}

/**
 * Get the latest version from NPM registry
 */
function getLatestNpmVersion(packageName) {
	try {
		const version = execSync(`npm view ${packageName} version`, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "ignore"],
		}).trim();
		return version;
	} catch {
		// Package doesn't exist on NPM yet
		return null;
	}
}

/**
 * Parse version string into parts
 */
function parseVersion(version) {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) {
		throw new Error(`Invalid version format: ${version}`);
	}
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
	};
}

/**
 * Bump version based on type
 */
function bumpVersion(version, type) {
	const parts = parseVersion(version);

	switch (type) {
		case "major":
			return `${parts.major + 1}.0.0`;
		case "minor":
			return `${parts.major}.${parts.minor + 1}.0`;
		case "patch":
			return `${parts.major}.${parts.minor}.${parts.patch + 1}`;
		default:
			throw new Error(`Invalid bump type: ${type}`);
	}
}

/**
 * Update version in a JSON file
 */
function updateJsonFile(filePath, newVersion) {
	const content = readFileSync(filePath, "utf8");
	const json = JSON.parse(content);
	const oldVersion = json.version;
	json.version = newVersion;

	// Write with 2-space indentation and newline at end
	writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, "utf8");

	return oldVersion;
}

/**
 * Main execution
 */
function main() {
	const versionType = parseArgs();
	const cwd = process.cwd();

	// Read package.json to get package name and current version
	const packageJsonPath = join(cwd, "package.json");
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
	const packageName = packageJson.name;
	const currentVersion = packageJson.version;

	console.log(`📦 Package: ${packageName}`);
	console.log(`📌 Current version: ${currentVersion}`);
	console.log(`🔧 Bump type: ${versionType}`);

	// Get latest NPM version
	const npmVersion = getLatestNpmVersion(packageName);

	if (npmVersion) {
		console.log(`🌐 NPM version: ${npmVersion}`);
	} else {
		console.log("🌐 NPM version: not published yet");
	}

	// Determine base version for bumping
	// If package is on NPM, use that version. Otherwise use current package.json version.
	const baseVersion = npmVersion || currentVersion;

	// Calculate new version
	const newVersion = bumpVersion(baseVersion, versionType);

	console.log(`✨ New version: ${newVersion}`);

	// Track updated files for git commit
	const updatedFiles = [];

	// Update package.json
	console.log("📝 Updating package.json...");
	updateJsonFile(packageJsonPath, newVersion);
	updatedFiles.push("package.json");

	// Update jsr.json if it exists
	const jsrJsonPath = join(cwd, "jsr.json");
	try {
		console.log("📝 Updating jsr.json...");
		updateJsonFile(jsrJsonPath, newVersion);
		updatedFiles.push("jsr.json");
	} catch {
		console.log("⚠️  jsr.json not found, skipping...");
	}

	console.log("✅ Version bump complete!");
	console.log(`   ${baseVersion} → ${newVersion}`);

	// Git stage and commit
	if (updatedFiles.length > 0) {
		try {
			console.log("📋 Staging changes...");
			execSync(`git add ${updatedFiles.join(" ")}`, {
				cwd,
				stdio: "inherit",
			});

			console.log("💾 Committing changes...");
			execSync('git commit -m "chore: version"', {
				cwd,
				stdio: "inherit",
			});

			console.log("✅ Changes committed successfully!");
		} catch (error) {
			console.error("⚠️  Git commit failed:", error.message);
			console.error("   You may need to commit the changes manually.");
		}
	}
}

main();
