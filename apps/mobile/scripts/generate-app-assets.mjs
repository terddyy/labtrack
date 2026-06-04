#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const brandDir = path.join(mobileRoot, "assets", "brand");
const androidResDir = path.join(mobileRoot, "android", "app", "src", "main", "res");
const sourceSvg = path.join(brandDir, "labtrack-logo.svg");

const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="panel" x1="240" y1="190" x2="784" y2="854" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2E7EA4"/>
      <stop offset="1" stop-color="#155778"/>
    </linearGradient>
    <linearGradient id="accent" x1="314" y1="342" x2="710" y2="738" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#38B995"/>
      <stop offset="1" stop-color="#1C8A70"/>
    </linearGradient>
  </defs>
  <path fill="url(#panel)" d="M512 124c146 0 264 40 264 90v310c0 196-112 324-264 383-152-59-264-187-264-383V214c0-50 118-90 264-90Z"/>
  <path fill="#FFFFFF" opacity=".16" d="M306 239c0-28 92-57 206-57s206 29 206 57v41c-52 26-124 41-206 41s-154-15-206-41v-41Z"/>
  <path fill="#FFFFFF" d="M430 283h164v57l-39 60v96l123 184c21 32-2 75-40 75H386c-38 0-61-43-40-75l123-184v-96l-39-60v-57Z"/>
  <path fill="url(#accent)" d="M441 621h142l61 91c6 9 0 22-12 22H392c-12 0-18-13-12-22l61-91Z"/>
  <path fill="#A8E6D4" d="M474 439h76v124h-76z"/>
  <path fill="#155778" d="M386 265h252v41H386z"/>
  <path fill="#FFFFFF" d="M667 320h44v44h-44zM724 320h44v44h-44zM667 377h44v44h-44zM724 377h44v44h-44z"/>
  <circle cx="451" cy="664" r="19" fill="#FFFFFF" opacity=".72"/>
  <circle cx="536" cy="695" r="15" fill="#FFFFFF" opacity=".56"/>
</svg>`;

const splashTextSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1242 2436">
  <text x="621" y="1432" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="108" font-weight="800" fill="#155778" letter-spacing="0">LABTRACK</text>
  <text x="621" y="1508" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#2F9D7E" letter-spacing="0">Laboratory lending and inventory</text>
</svg>`;

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

async function pngFromSvg(svgInput, output, size) {
  await sharp(svgInput)
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(output);
}

async function webpFromSvg(svgInput, output, size) {
  await sharp(svgInput)
    .resize(size, size, { fit: "contain" })
    .webp({ quality: 92 })
    .toFile(output);
}

async function main() {
  if (!existsSync(sourceSvg)) {
    throw new Error(`Missing source logo: ${sourceSvg}`);
  }

  ensureDir(brandDir);
  await pngFromSvg(sourceSvg, path.join(brandDir, "labtrack-icon.png"), 1024);
  await pngFromSvg(Buffer.from(foregroundSvg), path.join(brandDir, "labtrack-adaptive-foreground.png"), 1024);

  const splashIcon = await sharp(sourceSvg).resize(536, 536, { fit: "contain" }).png().toBuffer();
  await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: "#F4F7F8",
    },
  })
    .composite([
      { input: splashIcon, left: 353, top: 820 },
      { input: Buffer.from(splashTextSvg), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(brandDir, "labtrack-splash.png"));

  if (existsSync(androidResDir)) {
    const densities = [
      ["mipmap-mdpi", 48],
      ["mipmap-hdpi", 72],
      ["mipmap-xhdpi", 96],
      ["mipmap-xxhdpi", 144],
      ["mipmap-xxxhdpi", 192],
    ];

    for (const [folder, size] of densities) {
      const dir = path.join(androidResDir, folder);
      ensureDir(dir);
      await webpFromSvg(sourceSvg, path.join(dir, "ic_launcher.webp"), size);
      await webpFromSvg(sourceSvg, path.join(dir, "ic_launcher_round.webp"), size);
    }
  }

  console.log("Generated LabTrack app logo assets.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
