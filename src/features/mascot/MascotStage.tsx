"use client";

import { useMemo } from "react";
import {
  DEFAULT_TRANSITION,
  poseUrl,
  type CharacterPack,
  type MascotState,
  type Pose,
} from "./types";

type Props = {
  pack: CharacterPack;
  /** 0 → 1 progress of the current phase. Drives the aura, not React renders. */
  charge: number;
  state: MascotState;
};

/**
 * The animation engine every pack shares.
 *
 * Packs ship two still images; everything that makes the transformation feel
 * alive — breathing, the charging aura, the flash, the shake, the sparks — is
 * CSS driven by two custom properties. That is why a contributor can add a
 * mascot without writing a line of code.
 */
export function MascotStage({ pack, charge, state }: Props) {
  const transition = { ...DEFAULT_TRANSITION, ...pack.transition };
  const particles = useMemo(
    () => buildParticles(transition.particles),
    [transition.particles],
  );

  return (
    <div
      className="mascot"
      data-state={state}
      style={
        {
          "--charge": charge.toFixed(3),
          "--shake": `${transition.shake}px`,
          "--transition-ms": `${transition.durationMs}ms`,
        } as React.CSSProperties
      }
    >
      <div className="mascot__aura" aria-hidden />
      <div className="mascot__ring" aria-hidden />

      <div className="mascot__poses">
        <PoseLayer pack={pack} pose={pack.poses.idle} slot="idle" />
        <PoseLayer pack={pack} pose={pack.poses.active} slot="active" />
      </div>

      {transition.flash ? <div className="mascot__flash" aria-hidden /> : null}

      {state === "transforming" && transition.particles > 0 ? (
        <div className="mascot__particles" aria-hidden>
          {particles.map((p, i) => (
            <span
              key={i}
              style={
                {
                  "--angle": `${p.angle}deg`,
                  "--distance": `${p.distance}px`,
                  "--delay": `${p.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PoseLayer({
  pack,
  pose,
  slot,
}: {
  pack: CharacterPack;
  pose: Pose;
  slot: "idle" | "active";
}) {
  const url = poseUrl(pack.id, pose);
  const label = slot === "idle" ? `${pack.name} meditating` : `${pack.name} transformed`;
  const frames = pose.frames ?? 1;

  // Sprite sheets cannot be frame-animated through <img>, so they get a
  // background-position animation instead.
  if (pose.kind === "sprite" && frames > 1) {
    return (
      <span
        className="mascot__pose mascot__pose--sprite"
        data-slot={slot}
        role="img"
        aria-label={label}
        style={
          {
            backgroundImage: `url(${url})`,
            "--frames": frames,
            "--sprite-width": `${frames * 100}%`,
            "--sprite-ms": `${(frames / (pose.fps ?? 8)) * 1000}ms`,
          } as React.CSSProperties
        }
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export has no image loader, and pack art is already optimised
    <img
      className="mascot__pose"
      data-slot={slot}
      data-breathe={pose.breathe ? "" : undefined}
      src={url}
      alt={label}
      draggable={false}
    />
  );
}

/** Deterministic so server and client markup match — no Math.random here. */
function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    angle: Math.round((360 / count) * i),
    distance: 90 + ((i * 37) % 70),
    delay: (i * 23) % 220,
  }));
}
