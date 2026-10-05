// Copies the compiled ZK artifacts (keys/, zkir/) of both the DMarket contract and the
// dStorage DataRegistry contract (from the installed dStorage SDK package) into the given
// directory (e.g. public/ or dist/), so they are served alongside the app. The circuits are
// fetched over HTTP from window.location.origin by the DMarket providers and by the
// dStorage MidnightChainAdapter (connector mode).
import { cp } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const guiDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destDir = path.resolve(guiDir, process.argv[2] ?? "public");

const managedDirs = [
  path.resolve(guiDir, "../contract/src/managed/dmarket"),
  path.join(
    path.dirname(require.resolve("@dstorage-tech/dstorage-sdk/package.json")),
    "dist/contracts/dataregistry/managed",
  ),
];

for (const managedDir of managedDirs) {
  for (const dir of ["keys", "zkir"]) {
    const src = path.join(managedDir, dir);
    const dest = path.join(destDir, dir);
    await cp(src, dest, { recursive: true });
    console.log(`Copied ${src} -> ${dest}`);
  }
}
