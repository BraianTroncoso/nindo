import { isCharacterPack, type CharacterPack } from "@/features/mascot/types";

// ─────────────────────────────────────────────────────────────────────────────
// Adding a mascot: drop a folder in src/characters/<id>/ with a character.json,
// put its art in public/characters/<id>/, then add two lines here. That is the
// whole contribution. See docs/CHARACTERS.md.
// ─────────────────────────────────────────────────────────────────────────────
import ember from "./ember/character.json";
import naruto from "./naruto/character.json";

const submitted: unknown[] = [ember, naruto];

/** Malformed packs are dropped rather than crashing the app. */
export const characterPacks: CharacterPack[] = submitted.filter(isCharacterPack);

export const NO_MASCOT = "none" as const;

export type MascotChoice = string | typeof NO_MASCOT;

export const DEFAULT_MASCOT: MascotChoice = "naruto";

export function findPack(id: MascotChoice): CharacterPack | null {
  if (id === NO_MASCOT) return null;
  return characterPacks.find((pack) => pack.id === id) ?? null;
}
