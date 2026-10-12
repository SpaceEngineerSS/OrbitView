// Copies Cesium's static runtime files (web workers, shaders, textures, CSS)
// from node_modules into public/cesium, so they always match the installed
// Cesium version. Runs on postinstall; public/cesium is not committed.

import { cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "cesium", "Build", "Cesium");
const dest = join(root, "public", "cesium");

if (!existsSync(src)) {
    console.warn("[copy-cesium] cesium is not installed yet, skipping");
    process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const dir of ["Workers", "ThirdParty", "Assets", "Widgets"]) {
    cpSync(join(src, dir), join(dest, dir), { recursive: true });
}
console.log("[copy-cesium] copied Cesium assets to public/cesium");
