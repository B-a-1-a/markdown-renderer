import { mkdir, copyFile, cp, rm } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const out = new URL("../dist/", import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const file of [
  "LICENSE",
  "manifest.json",
  "index.html",
  "styles.css",
  "app.js",
  "background.js",
])
  await copyFile(new URL(file, root), new URL(file, out));
for (const dir of ["vendor", "icons"])
  await cp(new URL(dir, root), new URL(dir, out), { recursive: true });
console.log("Chrome extension ready in dist/");
