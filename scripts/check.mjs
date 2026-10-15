import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
assert.equal(manifest.manifest_version, 3);
for (const permission of [
  "permissions",
  "host_permissions",
  "optional_permissions",
  "optional_host_permissions",
  "content_scripts",
])
  assert.ok(!manifest[permission], `${permission} should not be declared`);
for (const file of [
  manifest.background.service_worker,
  ...Object.values(manifest.icons),
  "vendor/marked.js",
  "vendor/purify.js",
])
  await access(file);
assert.match(
  manifest.content_security_policy.extension_pages,
  /connect-src 'none'/,
);
console.log("Manifest, packaged assets, and zero-permission policy verified.");
