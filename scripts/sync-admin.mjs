import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(repo, "admin", "dist");
const dest = join(repo, "public", "admin");

if (!existsSync(dist)) {
  throw new Error("admin/dist is missing. Run npm run build --prefix admin first.");
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(dist, dest, { recursive: true });

const gamesSrc = join(dist, "games");
if (existsSync(gamesSrc)) {
  cpSync(gamesSrc, join(repo, "public", "games"), { recursive: true });
}

const homePng = join(dist, "potato-app-home.png");
if (existsSync(homePng)) {
  cpSync(homePng, join(repo, "public", "potato-app-home.png"));
}

console.log("Synced admin build to public/admin");
