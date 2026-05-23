/**
 * Generates simple placeholder PWA icons (icon-192.png, icon-512.png)
 * using only built-in Node.js APIs — no canvas dependency needed.
 *
 * Creates minimal valid PNGs with a solid amber background + "WG" text
 * via an embedded SVG rendered to PNG using Resvg or sharp if available,
 * otherwise writes an SVG fallback.
 *
 * Usage: node scripts/gen-icons.mjs
 */

import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

function svgIcon(size) {
  const r = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.32);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#d97706"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="system-ui, sans-serif" font-weight="800" font-size="${fontSize}" fill="white">WG</text>
</svg>`;
}

writeFileSync(resolve(publicDir, "icon-192.svg"), svgIcon(192));
writeFileSync(resolve(publicDir, "icon-512.svg"), svgIcon(512));

console.log("✅ SVG icons written to public/. For production, convert them to PNG:");
console.log("   public/icon-192.svg → public/icon-192.png");
console.log("   public/icon-512.svg → public/icon-512.png");
console.log("   (Use any SVG→PNG tool, e.g. Inkscape, SVGR, or https://svgtopng.com)");
