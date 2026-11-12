"use client";

import { useState } from "react";
import { characterPacks, NO_MASCOT } from "@/characters/registry";
import { FOLLOW_MASCOT, PALETTES } from "@/features/theme/palettes";
import { PRESETS } from "@/features/timer/types";
import { requestNotifications } from "@/lib/notify";
import { useNindo } from "@/store/useNindo";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useNindo((s) => s.settings);
  const updateSettings = useNindo((s) => s.updateSettings);
  const [keyDraft, setKeyDraft] = useState(settings.youtubeApiKey);

  const { durations } = settings;

  return (
    <div className="sheet" role="dialog" aria-label="Settings" aria-modal="true">
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2>Settings</h2>
          <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </header>

        <section className="sheet__group">
          <h3>Rhythm</h3>
          <div className="sheet__presets">
            {Object.entries(PRESETS).map(([name, preset]) => (
              <button
                key={name}
                type="button"
                className="chip"
                data-on={
                  preset.focus === durations.focus && preset.shortBreak === durations.shortBreak
                    ? ""
                    : undefined
                }
                onClick={() => updateSettings({ durations: preset })}
              >
                {name} · {preset.focus}/{preset.shortBreak}
              </button>
            ))}
          </div>

          <div className="sheet__fields">
            <Field
              label="Focus"
              value={durations.focus}
              min={1}
              max={180}
              onChange={(focus) => updateSettings({ durations: { ...durations, focus } })}
            />
            <Field
              label="Short break"
              value={durations.shortBreak}
              min={1}
              max={60}
              onChange={(shortBreak) => updateSettings({ durations: { ...durations, shortBreak } })}
            />
            <Field
              label="Long break"
              value={durations.longBreak}
              min={1}
              max={120}
              onChange={(longBreak) => updateSettings({ durations: { ...durations, longBreak } })}
            />
            <Field
              label="Long break every"
              value={durations.longBreakEvery}
              min={1}
              max={12}
              onChange={(longBreakEvery) =>
                updateSettings({ durations: { ...durations, longBreakEvery } })
              }
            />
          </div>
        </section>

        <section className="sheet__group">
          <h3>Mascot</h3>
          <div className="sheet__presets">
            {characterPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className="chip"
                data-on={settings.mascot === pack.id ? "" : undefined}
                onClick={() => updateSettings({ mascot: pack.id })}
                title={pack.credits ?? pack.license}
              >
                {pack.name}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              data-on={settings.mascot === NO_MASCOT ? "" : undefined}
              onClick={() => updateSettings({ mascot: NO_MASCOT })}
            >
              none
            </button>
          </div>
          {characterPacks
            .filter((pack) => pack.id === settings.mascot && pack.credits)
            .map((pack) => (
              <p key={pack.id} className="sheet__note">
                {pack.credits} <span className="sheet__license">{pack.license}</span>
              </p>
            ))}
        </section>

        <section className="sheet__group">
          <h3>Room tone</h3>
          <p className="sheet__note">
            The background you will be looking at all day. Every one of them is dim on purpose.
          </p>
          <div className="swatches">
            <button
              type="button"
              className="swatch swatch--auto"
              data-on={settings.palette === FOLLOW_MASCOT ? "" : undefined}
              onClick={() => updateSettings({ palette: FOLLOW_MASCOT })}
              title="Let the mascot choose"
            >
              <span className="swatch__chip" />
              <span className="swatch__name">auto</span>
            </button>

            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                className="swatch"
                data-on={settings.palette === palette.id ? "" : undefined}
                onClick={() => updateSettings({ palette: palette.id })}
                title={palette.name}
              >
                <span
                  className="swatch__chip"
                  style={
                    {
                      background: palette.bg,
                      "--sw-accent": palette.accent,
                      "--sw-glow": palette.glow,
                    } as React.CSSProperties
                  }
                />
                <span className="swatch__name">{palette.name.toLowerCase()}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="sheet__group">
          <h3>Signals</h3>
          <label className="sheet__toggle">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            />
            Bell when a phase ends
          </label>
          <label className="sheet__toggle">
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={async (e) => {
                if (!e.target.checked) {
                  updateSettings({ notificationsEnabled: false });
                  return;
                }
                const granted = await requestNotifications();
                updateSettings({ notificationsEnabled: granted });
              }}
            />
            Desktop notification
          </label>
          <label className="sheet__toggle">
            <input
              type="checkbox"
              checked={settings.showTasks}
              onChange={(e) => updateSettings({ showTasks: e.target.checked })}
            />
            Show today&rsquo;s tasks
          </label>
          <label className="sheet__toggle">
            <input
              type="checkbox"
              checked={settings.zenShowTrack}
              onChange={(e) => updateSettings({ zenShowTrack: e.target.checked })}
            />
            Name the track in fullscreen
          </label>
        </section>

        <section className="sheet__group">
          <h3>Spotus search</h3>
          <p className="sheet__note">
            Search needs a YouTube Data API key of your own. nindo has no server to keep one on,
            so it stays in this browser and spends your quota. Pasting links works without it.
          </p>
          <div className="sheet__key">
            <input
              className="input"
              type="password"
              value={keyDraft}
              placeholder="YouTube Data API v3 key"
              onChange={(e) => setKeyDraft(e.target.value)}
              aria-label="YouTube API key"
            />
            <button
              type="button"
              className="btn"
              onClick={() => updateSettings({ youtubeApiKey: keyDraft.trim() })}
            >
              Save
            </button>
            {settings.youtubeApiKey ? (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setKeyDraft("");
                  updateSettings({ youtubeApiKey: "" });
                }}
              >
                Forget
              </button>
            ) : null}
          </div>
        </section>

        <footer className="sheet__foot">
          <p>
            Everything above stays in this browser. No account, no server, no analytics.
            Today&rsquo;s tasks clear when the date changes.
          </p>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="sheet__field">
      <span>{label}</span>
      <input
        className="input"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, Math.round(next))));
        }}
      />
    </label>
  );
}
