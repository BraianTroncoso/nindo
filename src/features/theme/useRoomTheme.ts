"use client";

import { useEffect } from "react";
import { findPack } from "@/characters/registry";
import { useNindo } from "@/store/useNindo";
import { findPalette } from "./palettes";

/**
 * Resolves the three colours the whole screen is built from and writes them to
 * :root.
 *
 * It has to be :root rather than the app shell, because the page background and
 * the pool of light behind everything live on `body` — a variable scoped to a
 * descendant would never reach them.
 *
 * A chosen palette always beats the mascot's own tone: picking a room and then
 * having a character pack repaint it would make the setting a lie.
 */
export function useApplyRoomTheme() {
  const mascot = useNindo((s) => s.settings.mascot);
  const paletteId = useNindo((s) => s.settings.palette);

  useEffect(() => {
    const palette = findPalette(paletteId);
    const packTheme = findPack(mascot)?.theme;

    const vars: Record<string, string | undefined> = {
      "--bg": palette?.bg ?? packTheme?.bg,
      "--accent": palette?.accent ?? packTheme?.accent,
      "--glow": palette?.glow ?? packTheme?.glow,
    };

    const root = document.documentElement;
    const applied: string[] = [];
    for (const [key, value] of Object.entries(vars)) {
      if (!value) continue;
      root.style.setProperty(key, value);
      applied.push(key);
    }

    return () => {
      for (const key of applied) root.style.removeProperty(key);
    };
  }, [mascot, paletteId]);
}
