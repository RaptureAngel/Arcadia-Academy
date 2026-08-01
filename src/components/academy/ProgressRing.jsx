const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Short dash + long gap, scaled from the same ratio as a 12px-stroke/60px-radius
// reference ring, so a full circle reads as separate rounded beads rather than
// a solid ring — used for open-ended/output progress instead of a percentage arc.
const BEAD_DASHARRAY = "1 4";

function ProgressRing({
  percent = null,
  label,
  size = 64,
  strokeWidth = 6,
  centerValue,
  centerLabel,
  centerContent,
  beaded = false,
}) {
  const hasPercent = Number.isFinite(percent);
  const clampedPercent = hasPercent ? Math.min(100, Math.max(0, percent)) : 0;
  const offset = CIRCUMFERENCE * (1 - clampedPercent / 100);
  const displayValue = centerValue ?? (hasPercent ? `${Math.round(clampedPercent)}%` : "∞");
  const valueFontSize = Math.max(13, Math.round(size * 0.22));
  const labelFontSize = Math.max(8, Math.round(size * 0.075));

  return (
    <div
      className="progressRing"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle
          className="progressRingTrack"
          cx="32"
          cy="32"
          r={RADIUS}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {(hasPercent || centerValue !== undefined) && (
          <circle
            className={`progressRingFill ${beaded ? "progressRingFill--beaded" : ""}`}
            cx="32"
            cy="32"
            r={RADIUS}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={beaded ? BEAD_DASHARRAY : CIRCUMFERENCE}
            strokeDashoffset={beaded ? 0 : hasPercent ? offset : 0}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        )}
      </svg>
      <div className="progressRingCenter" aria-hidden="true">
        {centerContent ?? (
          <>
            <span className="progressRingValue" style={{ fontSize: valueFontSize }}>
              {displayValue}
            </span>
            {centerLabel && (
              <span className="progressRingCenterLabel" style={{ fontSize: labelFontSize }}>
                {centerLabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProgressRing;
