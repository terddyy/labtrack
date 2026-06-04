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
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

const envDefaults = {
  EXPO_PUBLIC_ENABLE_QUICK_LOGIN: "true",
  EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_EMAIL: "superadmin@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_SUPER_ADMIN_PASSWORD: "demo123",
  EXPO_PUBLIC_QUICK_LOGIN_ADMIN_EMAIL: "custodian@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_ADMIN_PASSWORD: "demo123",
  EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_EMAIL: "faculty@pampangastateu.edu.ph",
  EXPO_PUBLIC_QUICK_LOGIN_INSTRUCTOR_PASSWORD: "demo123",
};

const easEnvKeys = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_ENABLE_QUICK_LOGIN",
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

function run(command, args, options = {}) {
  const needsWindowsShell = process.platform === "win32" && command.endsWith(".cmd");
  const result = spawnSync(command, args, {
    cwd: mobileRoot,
    env: options.env,
    encoding: "utf8",
    shell: needsWindowsShell,
    stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
  });

  if (result.error) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}`);
  }

  return result.stdout ?? "";
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
  const buildEnv = { ...process.env, ...envDefaults, ...dotenv };
  const missing = easEnvKeys.filter((key) => !buildEnv[key]);

  if (missing.length > 0) {
    throw new Error(`Missing mobile build environment variables: ${missing.join(", ")}`);
  }

  run("node", ["./scripts/generate-app-assets.mjs"], { env: buildEnv });

  if (shouldSyncEasEnv) {
    console.log(`Syncing ${easEnvKeys.length} EAS environment variables for ${profile}.`);
    for (const key of easEnvKeys) {
      run(npx, [
        "eas",
        "env:create",
        profile,
        "--name",
        key,
        "--value",
        buildEnv[key],
        "--visibility",
        "plaintext",
        "--scope",
        "project",
        "--force",
        "--non-interactive",
      ]);
    }
  }

  const stdout = run(
    npx,
    ["eas", "build", "-p", "android", "--profile", profile, "--non-interactive", "--wait", "--json"],
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
