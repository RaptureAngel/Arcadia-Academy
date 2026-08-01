import { normalizeImageFramingSlots } from "./imageFraming";

// v3 adds per-slot image framing metadata (imageFraming); older saves
// normalize to safe defaults via normalizeImageFramingSlots below.
const CHARACTER_SCHEMA_VERSION = 3;
export const CHARACTER_LIBRARY_VERSION = 1;
export const CHARACTER_CONTEXTS = ["office", "class"];
export const CHARACTER_IMAGE_SLOTS = ["portrait", "dossier", "focus"];

const DOSSIER_INFORMATION_FIELDS = [
  "realName",
  "species",
  "occupation",
  "basedIn",
  "eyeColour",
  "hairColour",
  "knownAffiliations",
  "status",
];
const DOSSIER_ATTRIBUTE_FIELDS = [
  "intelligence",
  "skills",
  "personality",
  "weaknesses",
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeImageSlots(characterSlots, fallbackSlots) {
  const slots = {};

  CHARACTER_IMAGE_SLOTS.forEach((slot) => {
    slots[slot] =
      typeof characterSlots?.[slot] === "string"
        ? characterSlots[slot]
        : typeof fallbackSlots?.[slot] === "string"
        ? fallbackSlots[slot]
        : "";
  });

  return slots;
}

function normalizeImageAssets(characterAssets, fallbackAssets) {
  const assets = Array.isArray(characterAssets)
    ? characterAssets
    : Array.isArray(fallbackAssets)
    ? fallbackAssets
    : [];

  return assets
    .filter((asset) => isPlainObject(asset) && typeof asset.ref === "string")
    .map((asset) => ({
      ref: asset.ref,
      label: typeof asset.label === "string" ? asset.label : "",
      source: typeof asset.source === "string" ? asset.source : "external",
      addedAt: typeof asset.addedAt === "string" ? asset.addedAt : null,
    }));
}

function normalizeOutfits(characterOutfits, fallbackOutfits) {
  const outfits = Array.isArray(characterOutfits)
    ? characterOutfits
    : Array.isArray(fallbackOutfits)
    ? fallbackOutfits
    : [];

  return outfits
    .filter((outfit) => isPlainObject(outfit))
    .map((outfit, index) => ({
      id:
        typeof outfit.id === "string" && outfit.id.trim()
          ? outfit.id
          : `outfit-${index + 1}`,
      name:
        typeof outfit.name === "string" && outfit.name.trim()
          ? outfit.name
          : `Outfit ${index + 1}`,
      imageSlots: normalizeImageSlots(outfit.imageSlots),
      imageFraming: normalizeImageFramingSlots(outfit.imageFraming),
      createdAt: typeof outfit.createdAt === "string" ? outfit.createdAt : null,
      updatedAt: typeof outfit.updatedAt === "string" ? outfit.updatedAt : null,
    }));
}

function normalizeDossierFields(characterFields, fallbackFields, fields) {
  return fields.reduce((normalizedFields, field) => {
    normalizedFields[field] =
      typeof characterFields?.[field] === "string"
        ? characterFields[field]
        : typeof fallbackFields?.[field] === "string"
        ? fallbackFields[field]
        : "";

    return normalizedFields;
  }, {});
}

export function normalizeCharacterDossier(characterDossier, fallbackDossier) {
  return {
    information: normalizeDossierFields(
      characterDossier?.information,
      fallbackDossier?.information,
      DOSSIER_INFORMATION_FIELDS
    ),
    attributes: normalizeDossierFields(
      characterDossier?.attributes,
      fallbackDossier?.attributes,
      DOSSIER_ATTRIBUTE_FIELDS
    ),
    profile:
      typeof characterDossier?.profile === "string"
        ? characterDossier.profile
        : typeof fallbackDossier?.profile === "string"
        ? fallbackDossier.profile
        : "",
  };
}

export function normalizeCharacter(character = {}, fallback = {}) {
  const source = character.source ?? fallback.source ?? "custom";
  const numericXp = Number(character.xp ?? fallback.xp ?? 0);
  const numericVersion = Number(
    character.version ?? fallback.version ?? CHARACTER_SCHEMA_VERSION
  );
  const context = CHARACTER_CONTEXTS.includes(character.context)
    ? character.context
    : CHARACTER_CONTEXTS.includes(fallback.context)
    ? fallback.context
      : "class";
  const outfits = normalizeOutfits(character.outfits, fallback.outfits);
  const requestedActiveOutfitId =
    typeof character.activeOutfitId === "string"
      ? character.activeOutfitId
      : typeof fallback.activeOutfitId === "string"
      ? fallback.activeOutfitId
      : "";
  const activeOutfitId = outfits.some(
    (outfit) => outfit.id === requestedActiveOutfitId
  )
    ? requestedActiveOutfitId
    : "";

  return {
    ...fallback,
    ...character,
    id: character.id ?? fallback.id,
    name: character.name ?? fallback.name ?? "Untitled Character",
    role: character.role ?? fallback.role ?? "Study Companion",
    context,
    image: character.image ?? fallback.image ?? "",
    imageSlots: normalizeImageSlots(character.imageSlots, fallback.imageSlots),
    imageFraming: normalizeImageFramingSlots(
      character.imageFraming ?? fallback.imageFraming
    ),
    imageAssets: normalizeImageAssets(character.imageAssets, fallback.imageAssets),
    outfits,
    activeOutfitId,
    dossier: normalizeCharacterDossier(character.dossier, fallback.dossier),
    bio: character.bio ?? fallback.bio ?? "",
    notes: character.notes ?? fallback.notes ?? "",
    source,
    xp: Number.isFinite(numericXp) ? Math.max(0, numericXp) : 0,
    unlocks: Array.isArray(character.unlocks)
      ? character.unlocks
      : fallback.unlocks ?? [],
    storyState: isPlainObject(character.storyState)
      ? character.storyState
      : fallback.storyState ?? {},
    createdAt: character.createdAt ?? fallback.createdAt ?? null,
    updatedAt: character.updatedAt ?? fallback.updatedAt ?? null,
    version: Number.isFinite(numericVersion)
      ? Math.max(numericVersion, CHARACTER_SCHEMA_VERSION)
      : CHARACTER_SCHEMA_VERSION,
  };
}

export function getActiveOutfit(character) {
  if (!character?.activeOutfitId || !Array.isArray(character.outfits)) {
    return null;
  }

  return (
    character.outfits.find((outfit) => outfit.id === character.activeOutfitId) ||
    null
  );
}

export function getCharacterImageRef(character, slot = "portrait") {
  const activeOutfit = getActiveOutfit(character);
  const outfitSlotRef = CHARACTER_IMAGE_SLOTS.includes(slot)
    ? activeOutfit?.imageSlots?.[slot]
    : "";
  const slotRef = CHARACTER_IMAGE_SLOTS.includes(slot)
    ? character?.imageSlots?.[slot]
    : "";

  return outfitSlotRef || slotRef || character?.image || "";
}

// Framing follows whichever level (outfit vs character) actually supplies
// the image for this slot, so it stays paired with the image the user is
// really seeing rather than always preferring the outfit's own framing.
export function getCharacterImageFraming(character, slot = "portrait") {
  if (!CHARACTER_IMAGE_SLOTS.includes(slot)) {
    return normalizeImageFramingSlots(null).portrait;
  }

  const activeOutfit = getActiveOutfit(character);
  const usesOutfitImage = Boolean(activeOutfit?.imageSlots?.[slot]);
  const source = usesOutfitImage ? activeOutfit : character;

  return source?.imageFraming?.[slot] || normalizeImageFramingSlots(null)[slot];
}

export function getCharacterImageRefs(character) {
  const outfitRefs = Array.isArray(character?.outfits)
    ? character.outfits.flatMap((outfit) =>
        CHARACTER_IMAGE_SLOTS.map((slot) => outfit?.imageSlots?.[slot])
      )
    : [];
  const refs = [
    character?.image,
    ...CHARACTER_IMAGE_SLOTS.map((slot) => character?.imageSlots?.[slot]),
    ...outfitRefs,
    ...(Array.isArray(character?.imageAssets)
      ? character.imageAssets.map((asset) => asset?.ref)
      : []),
  ];

  return Array.from(
    new Set(refs.filter((ref) => typeof ref === "string" && ref.trim()))
  );
}

export function createStarterRoster(starterCharacters) {
  return starterCharacters.map((character) =>
    normalizeCharacter(
      {
        ...character,
        source: "starter",
      },
      {
        source: "starter",
        xp: 0,
        unlocks: [],
        storyState: {},
        createdAt: null,
        updatedAt: null,
        version: CHARACTER_SCHEMA_VERSION,
      }
    )
  );
}

export function mergeStarterAndSavedCharacters(starterCharacters, savedCharacters) {
  const starterRoster = createStarterRoster(starterCharacters);
  const savedRoster = Array.isArray(savedCharacters) ? savedCharacters : [];
  const starterIds = new Set(starterRoster.map((character) => character.id));

  const mergedStarters = starterRoster.map((starterCharacter) => {
    const savedCharacter = savedRoster.find(
      (character) =>
        isPlainObject(character) && character.id === starterCharacter.id
    );

    const mergedCharacter = normalizeCharacter(savedCharacter ?? starterCharacter, {
      ...starterCharacter,
      image: starterCharacter.image,
      source: "starter",
    });

    return {
      ...mergedCharacter,
      image: starterCharacter.image,
      source: "starter",
    };
  });

  const customCharacters = savedRoster
    .filter(
      (character) =>
        isPlainObject(character) && character.id && !starterIds.has(character.id)
    )
    .map((character) =>
      normalizeCharacter(character, {
        source: character.source ?? "custom",
        xp: 0,
        unlocks: [],
        storyState: {},
        createdAt: null,
        updatedAt: null,
        version: CHARACTER_SCHEMA_VERSION,
      })
    );

  return [...mergedStarters, ...customCharacters];
}

export function createCharacterLibraryRecord(characters) {
  return {
    version: CHARACTER_LIBRARY_VERSION,
    characters,
  };
}

export function createCharacterLibraryFromStarterCharacters(starterCharacters) {
  return createStarterRoster(starterCharacters).map((character) =>
    normalizeCharacter(character, {
      context: "class",
      notes: "",
    })
  );
}

export function createCharacterLibraryFromSavedEmployees(
  starterCharacters,
  savedCharacters
) {
  return mergeStarterAndSavedCharacters(starterCharacters, savedCharacters).map(
    (character) =>
      normalizeCharacter(character, {
        context: "class",
        notes: "",
      })
  );
}

export function normalizeCharacterLibrary(savedCharacterData) {
  if (
    isPlainObject(savedCharacterData) &&
    Array.isArray(savedCharacterData.characters)
  ) {
    return savedCharacterData.characters.map((character) =>
      normalizeCharacter(character, {
        context: "class",
        notes: "",
      })
    );
  }

  if (Array.isArray(savedCharacterData)) {
    return savedCharacterData.map((character) =>
      normalizeCharacter(character, {
        context: "class",
        notes: "",
      })
    );
  }

  return null;
}
