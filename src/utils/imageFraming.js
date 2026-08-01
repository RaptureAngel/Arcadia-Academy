export const IMAGE_FRAMING_SLOTS = ["portrait", "dossier", "focus"];

export const DEFAULT_IMAGE_FRAMING = Object.freeze({
  fit: "cover",
  positionX: 50,
  positionY: 50,
  zoom: 1,
});

// Representative destination aspect ratios used by the framing preview.
// Real usage varies slightly by context (see report), these are the closest
// fixed-ratio frame for each slot.
export const IMAGE_FRAMING_ASPECT_RATIOS = {
  portrait: "1 / 1",
  dossier: "3 / 4",
  focus: "3 / 4",
};

function clampNumber(value, min, max, fallback) {
  const num = Number(value);

  return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback;
}

export function normalizeImageFraming(raw) {
  return {
    fit: raw?.fit === "contain" ? "contain" : "cover",
    positionX: clampNumber(raw?.positionX, 0, 100, DEFAULT_IMAGE_FRAMING.positionX),
    positionY: clampNumber(raw?.positionY, 0, 100, DEFAULT_IMAGE_FRAMING.positionY),
    zoom: clampNumber(raw?.zoom, 1, 3, DEFAULT_IMAGE_FRAMING.zoom),
  };
}

export function normalizeImageFramingSlots(raw) {
  return {
    portrait: normalizeImageFraming(raw?.portrait),
    dossier: normalizeImageFraming(raw?.dossier),
    focus: normalizeImageFraming(raw?.focus),
  };
}

// Produces the inline style for an <img> so a saved framing renders
// consistently anywhere: object-fit/object-position place the image, and a
// matching-origin scale() provides the "zoom" control without needing a
// background-image swap or re-encoding the source file.
export function getFramingStyle(framing) {
  const f = framing ? normalizeImageFraming(framing) : DEFAULT_IMAGE_FRAMING;
  const position = `${f.positionX}% ${f.positionY}%`;
  const style = {
    objectFit: f.fit,
    objectPosition: position,
  };

  if (f.zoom !== 1) {
    style.transform = `scale(${f.zoom})`;
    style.transformOrigin = position;
  }

  return style;
}
