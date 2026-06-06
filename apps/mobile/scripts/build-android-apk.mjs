#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const profile = getArg("--profile") ?? "preview";
const shouldSyncEasEnv = !process.argv.includes("--no-sync-eas-env");
const allowProductionQuickLogin = process.argv.includes("--allow-production-quick-login");
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const easCli = ["--yes", "eas-cli@latest"];

const baseEnvDefaults = {
  EXPO_PUBLIC_ENABLE_QUICK_LOGIN: profile === "production" ? "false" : "true",
};

const quickLoginEnvDefaults = {
  EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL: "superadmin@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD: "demo123",
  EXPO_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL: "custodian@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD: "demo123",
  EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL: "faculty@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD: "demo123",
};

const baseEasEnvKeys = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_ENABLE_QUICK_LOGIN",
];

const quickLoginEasEnvKeys = [
  "EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL",
  "EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD",
  "EXPO_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL",
  "EXPO_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD",
  "EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL",
  "EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD",
];

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        return env;
      }
      const separator = line.indexOf("=");
      if (separator === -1) {
        return env;
      }
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
      return env;
    }, {});
}

function isEnabled(value) {
  return /^(1|true|yes)$/i.test(String(value ?? "").trim());
}

function visibilityForEnvKey(key) {
  return key.includes("PASSWORD") ? "sensitive" : "plaintext";
}

function syncAndroidBuildGradleVersion(appConfig) {
  const buildGradlePath = path.join(mobileRoot, "android", "app", "build.gradle");
  if (!existsSync(buildGradlePath)) {
    return;
  }

  const version = appConfig.version;
  const versionCode = appConfig.android?.versionCode;
  if (!version || !Number.isInteger(versionCode)) {
    throw new Error("apps/mobile/app.json must define expo.version and expo.android.versionCode.");
  }

  const contents = readFileSync(buildGradlePath, "utf8");
  if (!/versionCode\s+\d+/.test(contents) || !/versionName\s+"[^"]+"/.test(contents)) {
    throw new Error("Expected android/app/build.gradle to define versionCode and versionName.");
  }

  const updated = contents
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]+"/, `versionName "${version}"`);

  if (updated !== contents) {
    writeFileSync(buildGradlePath, updated);
    console.log(`Synced native Android version to ${version} (${versionCode}).`);
  }
}

function run(command, args, options = {}) {
  const needsWindowsShell = process.platform === "win32" && command.endsWith(".cmd");
  const capture = options.capture || options.allowFailure;
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    env: options.env,
    encoding: "utf8",
    shell: needsWindowsShell,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (options.allowFailure) {
    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: result.error,
    };
  }

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = result.stderr?.trim() ? `\n${result.stderr.trim()}` : "";
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}${details}`);
  }

  return result.stdout ?? "";
}

function runEas(args, options = {}) {
  return run(npx, [...easCli, ...args], options);
}

function parseBuildResult(stdout) {
  const text = stdout.trim();
  const firstArray = text.indexOf("[");
  const firstObject = text.indexOf("{");
  const starts = [firstArray, firstObject].filter((value) => value >= 0);
  if (starts.length === 0) {
    throw new Error("EAS build did not return JSON output.");
  }

  const start = Math.min(...starts);
  const endArray = text.lastIndexOf("]");
  const endObject = text.lastIndexOf("}");
  const end = Math.max(endArray, endObject) + 1;
  const parsed = JSON.parse(text.slice(start, end));
  return Array.isArray(parsed) ? parsed[0] : parsed;
}

function validateZipEnd(filePath) {
  const stats = statSync(filePath);
  const readLength = Math.min(stats.size, 65557);
  const buffer = Buffer.alloc(readLength);
  const fd = openSync(filePath, "r");
  try {
    readSync(fd, buffer, 0, readLength, stats.size - readLength);
  } finally {
    closeSync(fd);
  }

  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (
      buffer[index] === 0x50 &&
      buffer[index + 1] === 0x4b &&
      buffer[index + 2] === 0x05 &&
      buffer[index + 3] === 0x06
    ) {
      return;
    }
  }

  throw new Error("Downloaded artifact does not look like a complete APK/ZIP.");
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex").toUpperCase();
}

function isMissingEasEnvError(result) {
  const text = `${result.stdout}\n${result.stderr}`.toLowerCase();
  return (
    text.includes("not found") ||
    text.includes("does not exist") ||
    text.includes("no environment variable") ||
    text.includes("couldn't find") ||
    text.includes("could not find")
  );
}

function deleteEasEnvKey(key, buildEnv) {
  const result = runEas([
    "env:delete",
    profile,
    "--variable-name",
    key,
    "--scope",
    "project",
    "--non-interactive",
  ], { env: buildEnv, allowFailure: true });

  if (result.status === 0) {
    console.log(`Deleted stale EAS environment variable ${key}.`);
    return;
  }

  if (isMissingEasEnvError(result)) {
    console.log(`No stale EAS environment variable found for ${key}.`);
    return;
  }

  const details = result.error?.message || result.stderr.trim() || result.stdout.trim() || "unknown error";
  throw new Error(`Failed to delete stale EAS environment variable ${key}: ${details}`);
}

function download(url, targetPath) {
  return new Promise((resolve, reject) => {
    const tempPath = `${targetPath}.download`;

    function fetch(currentUrl, redirectCount = 0) {
      if (redirectCount > 5) {
        reject(new Error("Too many redirects while downloading APK."));
        return;
      }

      request(currentUrl, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
          fetch(new URL(response.headers.location, currentUrl).toString(), redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`APK download failed with HTTP ${response.statusCode}`));
          return;
        }

        const file = createWriteStream(tempPath);
        response.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            try {
              validateZipEnd(tempPath);
              renameSync(tempPath, targetPath);
              resolve();
            } catch (error) {
              if (existsSync(tempPath)) {
                unlinkSync(tempPath);
              }
              reject(error);
            }
          });
        });
      }).on("error", reject);
    }

    fetch(url);
  });
}

async function main() {
  const appConfig = JSON.parse(readFileSync(path.join(mobileRoot, "app.json"), "utf8")).expo;
  const dotenv = readEnvFile(path.join(mobileRoot, ".env"));
  const profileDefaults = profile === "production"
    ? baseEnvDefaults
    : { ...baseEnvDefaults, ...quickLoginEnvDefaults };
  const buildEnv = { ...profileDefaults, ...dotenv, ...process.env };

  if (profile === "production" && !allowProductionQuickLogin) {
    buildEnv.EXPO_PUBLIC_ENABLE_QUICK_LOGIN = "false";
  }

  const quickLoginEnabled = isEnabled(buildEnv.EXPO_PUBLIC_ENABLE_QUICK_LOGIN);
  const easEnvKeys = quickLoginEnabled
    ? [...baseEasEnvKeys, ...quickLoginEasEnvKeys]
    : baseEasEnvKeys;
  const missing = easEnvKeys.filter((key) => !buildEnv[key]);

  if (missing.length > 0) {
    throw new Error(`Missing mobile build environment variables: ${missing.join(", ")}`);
  }

  syncAndroidBuildGradleVersion(appConfig);
  run("node", ["./scripts/generate-app-assets.mjs"], { env: buildEnv });

  if (shouldSyncEasEnv) {
    console.log(`Syncing ${easEnvKeys.length} EAS environment variables for ${profile}.`);
    if (!quickLoginEnabled) {
      console.log("Quick login is disabled for this build profile.");
      if (profile === "production") {
        console.log("Removing stale production quick-login EAS variables if they exist.");
        for (const key of quickLoginEasEnvKeys) {
          deleteEasEnvKey(key, buildEnv);
        }
      }
    }
    for (const key of easEnvKeys) {
      runEas([
        "env:create",
        profile,
        "--name",
        key,
        "--value",
        buildEnv[key],
        "--visibility",
        visibilityForEnvKey(key),
        "--scope",
        "project",
        "--force",
        "--non-interactive",
      ], { env: buildEnv });
    }
  }

  const stdout = runEas(
    ["build", "-p", "android", "--profile", profile, "--non-interactive", "--wait", "--json"],
    { env: buildEnv, capture: true },
  );
  const build = parseBuildResult(stdout);
  const artifactUrl = build.artifacts?.buildUrl ?? build.artifactUrl;
  if (!artifactUrl) {
    throw new Error("EAS build completed but did not return an APK artifact URL.");
  }

  const buildId = build.id ?? "unknown";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const fileName = `LABTRACK-v${appConfig.version}-b${appConfig.android.versionCode}-${profile}-${stamp}-${String(buildId).slice(0, 8)}.apk`;
  const outputDir = path.join(mobileRoot, "builds");
  const outputPath = path.join(outputDir, fileName);
  mkdirSync(outputDir, { recursive: true });

  await download(artifactUrl, outputPath);

  const metadata = {
    app: appConfig.name,
    profile,
    version: appConfig.version,
    androidVersionCode: appConfig.android.versionCode,
    easBuildId: buildId,
    artifactUrl,
    apkPath: outputPath,
    sizeBytes: statSync(outputPath).size,
    sha256: sha256(outputPath),
    createdAt: new Date().toISOString(),
  };
  writeFileSync(`${outputPath}.json`, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(`APK saved: ${outputPath}`);
  console.log(`SHA256: ${metadata.sha256}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
