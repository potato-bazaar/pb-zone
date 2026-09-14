"use client";

/**
 * Painted potato-garden backdrop for the play screen. The image is colour-
 * graded per theme through CSS variables on the play-screen root, so a theme
 * switch re-lights the same scene instead of swapping it.
 */
export function CrushEnvironment() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="crush-garden" />
      <div className="crush-garden-vignette" />
      <div className="crush-garden-motes">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 41 + 7) % 100}%`,
              top: `${(i * 57 + 13) % 100}%`,
              animationDelay: `${-(i * 1.1) % 12}s`,
              animationDuration: `${11 + (i % 5) * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
