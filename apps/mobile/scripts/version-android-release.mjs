#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "..", "..");

const appConfigPath = path.join(mobileRoot, "app.json");
const packagePath = path.join(mobileRoot, "package.json");
const lockfilePath = path.join(repoRoot, "package-lock.json");
const androidBuildGradlePath = path.join(mobileRoot, "android", "app", "build.gradle");

const bump = getArg("--bump");
const requestedVersion = getArg("--version");
const requestedVersionCode = getArg("--version-code");
const dryRun = process.argv.includes("--dry-run");

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function updateAndroidBuildGradle(contents, version, versionCode) {
  if (!/versionCode\s+\d+/.test(contents) || !/versionName\s+"[^"]+"/.test(contents)) {
    throw new Error("Expected android/app/build.gradle to define versionCode and versionName.");
  }

  let updated = contents.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  updated = updated.replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  return updated;
}

function assertSemver(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Expected a numeric semver version like 0.1.1, received "${version}".`);
  }
}

function bumpVersion(version, releaseType) {
  assertSemver(version);
  const [major, minor, patch] = version.split(".").map(Number);

  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error("Use --bump patch|minor|major or pass --version <x.y.z>.");
  }
}

function compareSemver(left, right) {
  assertSemver(left);
  assertSemver(right);

  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }

  return 0;
}

function nextVersion(currentVersion) {
  if (requestedVersion) {
    assertSemver(requestedVersion);
    if (compareSemver(requestedVersion, currentVersion) <= 0) {
      throw new Error(`App version must increase. Current ${currentVersion}, requested ${requestedVersion}.`);
    }
    return requestedVersion;
  }

  if (bump) {
    return bumpVersion(currentVersion, bump);
  }

  throw new Error("Missing version change. Use --bump patch|minor|major or --version <x.y.z>.");
}

function nextVersionCode(currentVersionCode) {
  if (requestedVersionCode) {
    const parsed = Number(requestedVersionCode);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`Expected a positive integer --version-code, received "${requestedVersionCode}".`);
    }

    if (parsed <= currentVersionCode) {
      throw new Error(`Android versionCode must increase. Current ${currentVersionCode}, requested ${parsed}.`);
    }

    return parsed;
  }

  return currentVersionCode + 1;
}

const appConfig = readJson(appConfigPath);
const packageJson = readJson(packagePath);
const lockfile = readJson(lockfilePath);
const androidBuildGradle = existsSync(androidBuildGradlePath)
  ? readFileSync(androidBuildGradlePath, "utf8")
  : undefined;

const currentVersion = appConfig.expo?.version;
const currentVersionCode = appConfig.expo?.android?.versionCode;

if (!currentVersion || !Number.isInteger(currentVersionCode)) {
  throw new Error("apps/mobile/app.json must define expo.version and expo.android.versionCode.");
}

const version = nextVersion(currentVersion);
const versionCode = nextVersionCode(currentVersionCode);

appConfig.expo.version = version;
appConfig.expo.android.versionCode = versionCode;
packageJson.version = version;

if (lockfile.packages?.["apps/mobile"]) {
  lockfile.packages["apps/mobile"].version = version;
}

const updatedAndroidBuildGradle = androidBuildGradle
  ? updateAndroidBuildGradle(androidBuildGradle, version, versionCode)
  : undefined;

const summary = `LABTRACK Android ${currentVersion} (${currentVersionCode}) -> ${version} (${versionCode})`;

if (dryRun) {
  console.log(`[dry-run] ${summary}`);
} else {
  writeJson(appConfigPath, appConfig);
  writeJson(packagePath, packageJson);
  writeJson(lockfilePath, lockfile);
  if (updatedAndroidBuildGradle) {
    writeFileSync(androidBuildGradlePath, updatedAndroidBuildGradle);
  }
  console.log(summary);
}
