/**
 * Room tones.
 *
 * All of them are low-light and low-saturation on purpose: this screen sits in
 * your peripheral vision for hours, so the background's job is to stay out of
 * the way. `accent` drives the clock glow and the buttons, `glow` drives the
 * mascot's aura.
 */
export type Palette = {
  id: string;
  name: string;
  bg: string;
  accent: string;
  glow: string;
};

export const FOLLOW_MASCOT = "auto" as const;

// Names must not collide with any mascot pack: both live in the same settings
// dialog, and "Ember the character" next to "Ember the background" is a riddle.
export const PALETTES: Palette[] = [
  { id: "hearth", name: "Hearth", bg: "#171109", accent: "#ff8a3d", glow: "#ffd27a" },
  { id: "ink", name: "Ink", bg: "#0a0e15", accent: "#6f9fd8", glow: "#bcd8f5" },
  { id: "moss", name: "Moss", bg: "#0c1310", accent: "#6fae8a", glow: "#bfe3cd" },
  { id: "plum", name: "Plum", bg: "#120d17", accent: "#a98ad1", glow: "#dcc9f2" },
  { id: "clay", name: "Clay", bg: "#1a1310", accent: "#c98a6b", glow: "#efcbb4" },
  { id: "slate", name: "Slate", bg: "#101113", accent: "#8f9aa6", glow: "#d3dae1" },
  { id: "sumi", name: "Sumi", bg: "#0b0b0c", accent: "#9c8f7a", glow: "#e0d6c6" },
];

/** `auto` means the active mascot pack picks the tone, which is the default. */
export type PaletteChoice = string | typeof FOLLOW_MASCOT;

export function findPalette(id: PaletteChoice): Palette | null {
  if (id === FOLLOW_MASCOT) return null;
  return PALETTES.find((p) => p.id === id) ?? null;
}
