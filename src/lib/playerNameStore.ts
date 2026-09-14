import fs from "fs";
import path from "path";
import { isPlaceholderDisplayName } from "@/lib/playerIdentity";

type NameMap = Record<string, string>;

function storePath() {
  return path.join(process.cwd(), ".next", "player-names.json");
}

let memory: NameMap | null = null;

function loadMap(): NameMap {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8")) as unknown;
    memory =
      parsed && typeof parsed === "object" ? (parsed as NameMap) : {};
  } catch {
    memory = {};
  }
  return memory;
}

function saveMap(map: NameMap) {
  memory = map;
  try {
    const file = storePath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(map));
  } catch {
    // Best-effort cache; in-memory map still works for this process.
  }
}

export function rememberPlayerName(userId: string | null | undefined, name: string | null | undefined) {
  const id = userId?.trim();
  const display = name?.trim();
  if (!id || !display || isPlaceholderDisplayName(display)) return;
  const map = loadMap();
  if (map[id] === display) return;
  saveMap({ ...map, [id]: display });
}

export function overlayPlayerNames<T extends { userId: string; playerName: string }>(
  players: T[],
): T[] {
  const map = loadMap();
  return players.map((player) => {
    const remembered = map[player.userId];
    if (!remembered) return player;
    if (!isPlaceholderDisplayName(player.playerName)) return player;
    return { ...player, playerName: remembered };
  });
}
