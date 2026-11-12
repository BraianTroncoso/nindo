/*
 * Injects the real build output into the service worker's precache list.
 *
 * Why this exists: a service worker does not intercept the page load that
 * registers it, so the JS and CSS chunks of that first visit never pass through
 * the fetch handler and never land in the cache. Offline then "works" for the
 * HTML and fails for everything it needs. Precaching the actual hashed files at
 * build time is the only way to make the first offline launch honest.
 *
 *   npm run build  →  next build && node scripts/precache.mjs
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = "out";
const SW = path.join(OUT, "sw.js");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return files.flat();
}

const all = await walk(OUT);

const precache = all
  .map((file) => `/${path.relative(OUT, file).split(path.sep).join("/")}`)
  .filter((url) => {
    if (url === "/sw.js") return false; // never cache the worker itself
    if (url.startsWith("/_next/static/")) return /\.(js|css|woff2?)$/.test(url);
    if (url.startsWith("/characters/")) return true;
    if (url.startsWith("/icons/")) return true;
    return url === "/index.html" || url === "/manifest.webmanifest";
  })
  // "/" is the navigation entry; index.html is its file form.
  .concat("/")
  .sort();

const source = await readFile(SW, "utf8");
if (!source.includes("__PRECACHE__")) {
  throw new Error("public/sw.js no longer contains the __PRECACHE__ placeholder");
}

const total = await Promise.all(
  precache
    .filter((url) => url !== "/")
    .map(async (url) => (await readFile(path.join(OUT, url)).catch(() => Buffer.alloc(0))).length),
);
const kb = Math.round(total.reduce((a, b) => a + b, 0) / 1024);

await writeFile(SW, source.replace("__PRECACHE__", JSON.stringify(precache, null, 2)));
console.log(`✓ sw.js precaches ${precache.length} files (~${kb} kB)`);
