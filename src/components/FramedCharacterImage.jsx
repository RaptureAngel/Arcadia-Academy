import { getFramingStyle } from "../utils/imageFraming";

// Centralises how every character image (portrait/dossier/focus, base or
// outfit) is framed and rendered, so the pan/zoom math and the CSS
// technique behind it live in exactly one place instead of being
// hand-copied into each component.
//
// The frame (this component's wrapper span) owns overflow/dimensions/
// radius; the <img> owns object-fit/object-position/transform, computed
// from the same `framing` record via getFramingStyle() — one consistent
// mathematical model for pan and zoom everywhere it's used.
//
// `fill` controls whether the wrapper stretches to 100% of its parent
// (the common case — portrait/focus/roster/outfit-selector/etc., where the
// destination box is a fixed frame) or stays content-sized (the Dossier's
// deliberate natural-size portrait cutout, where only the zoom/pan
// transform from framing should apply, not a forced object-fit box).
function FramedCharacterImage({
  src,
  alt = "",
  framing,
  className = "",
  frameClassName = "",
  fill = true,
  onError,
}) {
  if (!src) return null;

  const appliedStyle = getFramingStyle(framing);

  return (
    <span
      className={[
        "framedCharacterImage",
        fill ? "framedCharacterImage--fill" : "",
        frameClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        src={src}
        alt={alt}
        className={["framedCharacterImageImg", className].filter(Boolean).join(" ")}
        style={appliedStyle}
        onError={onError}
      />
    </span>
  );
}

export default FramedCharacterImage;
