/*
 * Generates the PNG app icons from a text-free vector mark.
 *
 * The mark is deliberately glyph-free: rasterising 忍 would depend on a CJK
 * font being installed wherever this script runs. The SVG icon in the manifest
 * keeps the kanji for browsers that render SVG directly.
 *
 *   npm run icons
 */
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const mark = ({ padding }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx=".5" cy=".46" r=".54">
      <stop offset="0" stop-color="#ffb062"/>
      <stop offset=".6" stop-color="#8a3f10"/>
      <stop offset="1" stop-color="#171109"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${padding ? 0 : 96}" fill="#171109"/>
  <g transform="translate(256 256) scale(${padding ? 0.78 : 1}) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="url(#g)" opacity=".6"/>
    <!-- enso: a circle left deliberately open -->
    <path d="M256 106a150 150 0 1 1-106 44" fill="none" stroke="#ffd27a" stroke-width="22"
          stroke-linecap="round" opacity=".92"/>
    <!-- the ember at the centre -->
    <path d="M256 196c26 26 40 48 40 66a40 40 0 0 1-80 0c0-18 14-40 40-66z" fill="#ffe3b0"/>
    <path d="M256 236c13 15 20 27 20 37a20 20 0 0 1-40 0c0-10 7-22 20-37z" fill="#ff8a3d"/>
  </g>
</svg>`;

const targets = [
  { file: "icon-192.png", size: 192, padding: false },
  { file: "icon-512.png", size: 512, padding: false },
  { file: "icon-maskable-512.png", size: 512, padding: true },
  { file: "apple-touch-icon.png", size: 180, padding: false },
];

await mkdir("public/icons", { recursive: true });

for (const { file, size, padding } of targets) {
  const png = await sharp(Buffer.from(mark({ padding })))
    .resize(size, size)
    .png()
    .toBuffer();
  await writeFile(`public/icons/${file}`, png);
  console.log(`✓ public/icons/${file} (${size}×${size})`);
}
