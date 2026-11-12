/**
 * A character pack is pure data. Adding a mascot means dropping a folder with a
 * manifest plus two images — never writing code. That contract is the public
 * API of this project, so keep it boring and stable.
 */

export type PoseKind = "image" | "sprite" | "sequence";

export type Pose = {
  kind: PoseKind;
  /**
   * Path under /characters/<id>/.
   * For `sequence`, `##` is replaced by the 1-based frame number, zero padded to
   * the width of the placeholder — e.g. "seq/##.webp" → "seq/01.webp".
   */
  src: string;
  /** Gentle breathing loop. Leave off for poses that already animate themselves. */
  breathe?: boolean;
  /** Frame count for `sprite` (one horizontal strip) and `sequence` (separate files). */
  frames?: number;
  fps?: number;
};

export type CharacterPack = {
  id: string;
  name: string;
  author: string;
  /** SPDX id, "CC0-1.0", or "fan-art" for unlicensed fan work. */
  license: string;
  /** Shown in the credits drawer. Required for fan-art packs. */
  credits?: string;
  /** Overrides the warm default theme while this mascot is active. */
  theme?: { bg?: string; accent?: string; glow?: string };
  poses: {
    /** Resting state during focus — the meditation pose. */
    idle: Pose;
    /** Reached when the focus session completes — the transformed pose. */
    active: Pose;
    /**
     * Optional: played once, between idle and active, when the session
     * completes. Packs without it get the crossfade, which is plenty.
     */
    transform?: Pose;
  };
  transition?: {
    flash?: boolean;
    /** Shake amplitude in px. 0 disables it. */
    shake?: number;
    particles?: number;
    durationMs?: number;
  };
};

export type MascotState = "idle" | "transforming" | "active";

export const DEFAULT_TRANSITION = {
  flash: true,
  shake: 6,
  particles: 24,
  durationMs: 900,
} as const;

/**
 * Validates a community pack at runtime. A broken manifest must degrade to "no
 * mascot", never to a blank screen.
 */
export function isCharacterPack(value: unknown): value is CharacterPack {
  if (typeof value !== "object" || value === null) return false;
  const pack = value as Partial<CharacterPack>;
  if (!pack.id || typeof pack.id !== "string") return false;
  if (!pack.name || typeof pack.name !== "string") return false;
  if (!pack.license || typeof pack.license !== "string") return false;
  return isPose(pack.poses?.idle) && isPose(pack.poses?.active);
}

function isPose(value: unknown): value is Pose {
  if (typeof value !== "object" || value === null) return false;
  const pose = value as Partial<Pose>;
  return (
    typeof pose.src === "string" &&
    pose.src.length > 0 &&
    (pose.kind === "image" || pose.kind === "sprite")
  );
}

export function poseUrl(packId: string, pose: Pose): string {
  return `/characters/${packId}/${pose.src}`;
}

/** Expands a `sequence` pose into one URL per frame. */
export function sequenceUrls(packId: string, pose: Pose): string[] {
  const count = pose.frames ?? 0;
  const match = pose.src.match(/#+/);
  if (count < 1 || !match) return [];
  const pad = match[0].length;
  return Array.from({ length: count }, (_, i) =>
    `/characters/${packId}/${pose.src.replace(/#+/, `${i + 1}`.padStart(pad, "0"))}`,
  );
}
