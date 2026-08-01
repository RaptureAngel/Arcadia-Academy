import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHARACTER_CONTEXTS,
  getCharacterImageFraming,
  getCharacterImageRef,
  getCharacterImageRefs,
  normalizeCharacter,
  normalizeCharacterDossier,
} from "../utils/characters";
import { normalizeImageFramingSlots } from "../utils/imageFraming";
import {
  importDesktopCharacterImage,
  isManagedCharacterImageReference,
  readDesktopCharacterImage,
} from "../utils/storage";
import { getLevelProgress } from "../utils/appStats";

function createCharacterId(name) {
  return `character-${String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || crypto.randomUUID()}`;
}

function createBlankCharacterDraft(defaultImage = "/characters/reagan.png") {
  return {
    name: "",
    role: "",
    context: "class",
    image: defaultImage,
    imageSlots: {
      dossier: "",
      focus: "",
    },
    outfits: [],
    activeOutfitId: "",
    imageFraming: normalizeImageFramingSlots(null),
    dossier: normalizeCharacterDossier(),
    bio: "",
    notes: "",
  };
}

function createOutfitId(name) {
  return `outfit-${String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || crypto.randomUUID()}`;
}

function createBlankOutfitDraft(name = "New Outfit") {
  const now = new Date().toISOString();

  return {
    id: createOutfitId(`${name}-${crypto.randomUUID()}`),
    name,
    imageSlots: {
      portrait: "",
      dossier: "",
      focus: "",
    },
    imageFraming: normalizeImageFramingSlots(null),
    createdAt: now,
    updatedAt: now,
  };
}

function createCharacterDraftFromCharacter(character) {
  const context = CHARACTER_CONTEXTS.includes(character.context)
    ? character.context
    : "class";

  return {
    name: character.name || "",
    role: context === "class" ? "Student" : character.role || "",
    context,
    image: character.image || "",
    imageSlots: {
      dossier: character.imageSlots?.dossier || "",
      focus: character.imageSlots?.focus || "",
    },
    outfits: Array.isArray(character.outfits)
      ? character.outfits.map((outfit) => ({
          ...outfit,
          imageSlots: {
            portrait: outfit.imageSlots?.portrait || "",
            dossier: outfit.imageSlots?.dossier || "",
            focus: outfit.imageSlots?.focus || "",
          },
          imageFraming: normalizeImageFramingSlots(outfit.imageFraming),
        }))
      : [],
    activeOutfitId: character.activeOutfitId || "",
    imageFraming: normalizeImageFramingSlots(character.imageFraming),
    dossier: normalizeCharacterDossier(character.dossier),
    bio: character.bio || "",
    notes: character.notes || "",
  };
}

function trimCharacterDossier(dossier) {
  const normalizedDossier = normalizeCharacterDossier(dossier);

  return {
    information: Object.fromEntries(
      Object.entries(normalizedDossier.information).map(([field, value]) => [
        field,
        value.trim(),
      ])
    ),
    attributes: Object.fromEntries(
      Object.entries(normalizedDossier.attributes).map(([field, value]) => [
        field,
        value.trim(),
      ])
    ),
    profile: normalizedDossier.profile.trim(),
  };
}

function getCharacterImageOptions(characterLibrary, selectedImage) {
  const imageOptions = [
    "/characters/reagan.png",
    "/characters/lola.png",
    "/characters/gadget.png",
    ...characterLibrary.flatMap(getCharacterImageRefs),
  ];
  const uniqueOptions = Array.from(new Set(imageOptions));
  const selectedImages = Array.isArray(selectedImage)
    ? selectedImage.filter(Boolean)
    : [selectedImage].filter(Boolean);
  const missingSelectedImages = selectedImages.filter(
    (imagePath) => !uniqueOptions.includes(imagePath)
  );

  if (missingSelectedImages.length > 0) {
    return [...missingSelectedImages, ...uniqueOptions];
  }

  return uniqueOptions;
}

export function useCharacterLibrary({
  characterLibrary,
  setCharacterLibrary,
  desktopSaveState,
  activeEmployeeId,
  setActiveEmployeeId,
  dossierCharacterId,
  setDossierCharacterId,
  openConfirmDialog,
} = {}) {
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState(null);
  const [characterDraft, setCharacterDraft] = useState(() =>
    createBlankCharacterDraft()
  );
  const [managedCharacterImageUrls, setManagedCharacterImageUrls] = useState(
    {}
  );
  const managedCharacterImageUrlsRef = useRef({});

  function getDisplayImageUrl(imageReference) {
    if (!isManagedCharacterImageReference(imageReference)) {
      return imageReference || "";
    }

    return managedCharacterImageUrls[imageReference] || "";
  }

  const characterLibraryForDisplay = useMemo(
    () => {
      return characterLibrary.map((character) => {
        const portraitImage = getCharacterImageRef(character, "portrait");
        const dossierImage = getCharacterImageRef(character, "dossier");
        const focusImage = getCharacterImageRef(character, "focus");
        const mainDisplayImage =
          getDisplayImageUrl(portraitImage) || getDisplayImageUrl(character.image);

        return {
          ...character,
          mainDisplayImage,
          portraitDisplayImage: getDisplayImageUrl(portraitImage) || mainDisplayImage,
          dossierDisplayImage: getDisplayImageUrl(dossierImage) || mainDisplayImage,
          focusDisplayImage: getDisplayImageUrl(focusImage) || mainDisplayImage,
          portraitFraming: getCharacterImageFraming(character, "portrait"),
          dossierFraming: getCharacterImageFraming(character, "dossier"),
          focusFraming: getCharacterImageFraming(character, "focus"),
        };
      });
    },
    [characterLibrary, managedCharacterImageUrls]
  );

  const activeEmployee = characterLibraryForDisplay.find(
    (employee) => employee.id === activeEmployeeId
  );
  const selectedDossierCharacter =
    characterLibraryForDisplay.find(
      (character) => character.id === dossierCharacterId
    ) ||
    activeEmployee ||
    characterLibraryForDisplay[0] ||
    null;
  const selectedDossierCharacterId = selectedDossierCharacter?.id || null;
  const activeEmployeeLevelProgress = activeEmployee
    ? getLevelProgress(activeEmployee.xp)
    : null;
  const canImportCharacterImage = desktopSaveState?.isTauri ?? false;
  const characterImageOptions = getCharacterImageOptions(
    characterLibrary,
    [
      characterDraft.image,
      characterDraft.imageSlots?.dossier,
      characterDraft.imageSlots?.focus,
      ...(Array.isArray(characterDraft.outfits)
        ? characterDraft.outfits.flatMap((outfit) => [
            outfit.imageSlots?.portrait,
            outfit.imageSlots?.dossier,
            outfit.imageSlots?.focus,
          ])
        : []),
    ]
  );

  useEffect(() => {
    const managedImageReferences = Array.from(
      new Set(
        characterLibrary
          .flatMap(getCharacterImageRefs)
          .filter(isManagedCharacterImageReference)
      )
    );

    if (!desktopSaveState?.isTauri || managedImageReferences.length === 0) {
      Object.values(managedCharacterImageUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      managedCharacterImageUrlsRef.current = {};
      setManagedCharacterImageUrls({});
      return undefined;
    }

    let isCancelled = false;

    async function loadManagedCharacterImages() {
      const resolvedEntries = await Promise.all(
        managedImageReferences.map(async (imageReference) => {
          const result = await readDesktopCharacterImage(imageReference);

          if (!result.ok) {
            return null;
          }

          return [imageReference, result.url];
        })
      );
      const nextImageUrls = Object.fromEntries(
        resolvedEntries.filter(Boolean)
      );

      if (isCancelled) {
        Object.values(nextImageUrls).forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      Object.values(managedCharacterImageUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
      managedCharacterImageUrlsRef.current = nextImageUrls;
      setManagedCharacterImageUrls(nextImageUrls);
    }

    loadManagedCharacterImages();

    return () => {
      isCancelled = true;
    };
  }, [
    characterLibrary,
    desktopSaveState?.isTauri,
    desktopSaveState?.saveLocation,
    desktopSaveState?.folderPath,
    desktopSaveState?.configuredFolderPath,
  ]);

  useEffect(
    () => () => {
      Object.values(managedCharacterImageUrlsRef.current).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    []
  );

  function openNewCharacterForm() {
    setCharacterDraft(createBlankCharacterDraft());
    setEditingCharacterId(null);
    setShowCharacterForm(true);
  }

  function openEditCharacterForm(characterId) {
    const characterToEdit = characterLibrary.find(
      (character) => character.id === characterId
    );

    if (!characterToEdit) return;

    setCharacterDraft(createCharacterDraftFromCharacter(characterToEdit));
    setEditingCharacterId(characterToEdit.id);
    setShowCharacterForm(true);
  }

  function cancelCharacterForm() {
    setCharacterDraft(createBlankCharacterDraft());
    setEditingCharacterId(null);
    setShowCharacterForm(false);
  }

  function updateCharacterDraft(field, value) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      role:
        field === "context" && value === "class"
          ? "Student"
          : field === "context" && value === "office" && currentDraft.role === "Student"
            ? ""
            : currentDraft.role,
      [field]: value,
    }));
  }

  function updateCharacterDraftImageSlot(slot, value) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      imageSlots: {
        ...currentDraft.imageSlots,
        [slot]: value,
      },
    }));
  }

  function updateCharacterDraftImageFraming(slot, framing) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      imageFraming: {
        ...normalizeImageFramingSlots(currentDraft.imageFraming),
        [slot]: normalizeImageFramingSlots({ [slot]: framing })[slot],
      },
    }));
  }

  // "Save Framing" must be a complete action on its own — it cannot leave the
  // change stranded in the draft where only a later, separate "Save Changes"
  // would surface it (that was the bug: every render site reads from
  // characterLibrary, never from characterDraft). So this updates the draft
  // (so an in-progress "Save Changes" doesn't revert it with stale data) and,
  // when editing an already-saved character, writes straight into
  // characterLibrary too, so every view reflects it immediately. For a
  // brand-new character that hasn't been created yet, there is no library
  // record to update — it stays draft-only until the character is created.
  function saveCharacterImageFraming(slot, framing) {
    const normalizedFraming = normalizeImageFramingSlots({ [slot]: framing })[slot];

    updateCharacterDraftImageFraming(slot, normalizedFraming);

    if (!editingCharacterId) return;

    setCharacterLibrary((currentCharacters) =>
      currentCharacters.map((character) =>
        character.id === editingCharacterId
          ? normalizeCharacter({
              ...character,
              imageFraming: {
                ...normalizeImageFramingSlots(character.imageFraming),
                [slot]: normalizedFraming,
              },
              updatedAt: new Date().toISOString(),
            })
          : character
      )
    );
  }

  function updateCharacterDraftDossier(section, field, value) {
    setCharacterDraft((currentDraft) => {
      const currentDossier = normalizeCharacterDossier(currentDraft.dossier);

      if (section === "profile") {
        return {
          ...currentDraft,
          dossier: {
            ...currentDossier,
            profile: value,
          },
        };
      }

      return {
        ...currentDraft,
        dossier: {
          ...currentDossier,
          [section]: {
            ...currentDossier[section],
            [field]: value,
          },
        },
      };
    });
  }

  function addCharacterDraftOutfit() {
    setCharacterDraft((currentDraft) => {
      const outfit = createBlankOutfitDraft(
        `Outfit ${(currentDraft.outfits?.length || 0) + 1}`
      );

      return {
        ...currentDraft,
        outfits: [...(currentDraft.outfits || []), outfit],
        activeOutfitId: currentDraft.activeOutfitId || outfit.id,
      };
    });
  }

  function updateCharacterDraftOutfit(outfitId, field, value) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      outfits: (currentDraft.outfits || []).map((outfit) =>
        outfit.id === outfitId
          ? {
              ...outfit,
              [field]: value,
              updatedAt: new Date().toISOString(),
            }
          : outfit
      ),
    }));
  }

  function updateCharacterDraftOutfitImageSlot(outfitId, slot, value) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      outfits: (currentDraft.outfits || []).map((outfit) =>
        outfit.id === outfitId
          ? {
              ...outfit,
              imageSlots: {
                ...(outfit.imageSlots || {}),
                [slot]: value,
              },
              updatedAt: new Date().toISOString(),
            }
          : outfit
      ),
    }));
  }

  function updateCharacterDraftOutfitImageFraming(outfitId, slot, framing) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      outfits: (currentDraft.outfits || []).map((outfit) =>
        outfit.id === outfitId
          ? {
              ...outfit,
              imageFraming: {
                ...normalizeImageFramingSlots(outfit.imageFraming),
                [slot]: normalizeImageFramingSlots({ [slot]: framing })[slot],
              },
              updatedAt: new Date().toISOString(),
            }
          : outfit
      ),
    }));
  }

  // Mirrors saveCharacterImageFraming for an outfit-specific slot: keeps the
  // draft in sync and, when the outfit already exists on a saved character,
  // writes straight into characterLibrary so it's visible immediately. If
  // the outfit itself is new and unsaved, the library has no matching outfit
  // to update yet, so this is a safe no-op there — the draft update carries
  // it through to the eventual "Save Changes".
  function saveCharacterOutfitImageFraming(outfitId, slot, framing) {
    const normalizedFraming = normalizeImageFramingSlots({ [slot]: framing })[slot];

    updateCharacterDraftOutfitImageFraming(outfitId, slot, normalizedFraming);

    if (!editingCharacterId) return;

    setCharacterLibrary((currentCharacters) =>
      currentCharacters.map((character) => {
        if (character.id !== editingCharacterId) return character;
        if (!character.outfits?.some((outfit) => outfit.id === outfitId)) {
          return character;
        }

        return normalizeCharacter({
          ...character,
          outfits: character.outfits.map((outfit) =>
            outfit.id === outfitId
              ? {
                  ...outfit,
                  imageFraming: {
                    ...normalizeImageFramingSlots(outfit.imageFraming),
                    [slot]: normalizedFraming,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : outfit
          ),
          updatedAt: new Date().toISOString(),
        });
      })
    );
  }

  function setCharacterDraftActiveOutfit(outfitId) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      activeOutfitId: outfitId,
    }));
  }

  function deleteCharacterDraftOutfit(outfitId) {
    setCharacterDraft((currentDraft) => ({
      ...currentDraft,
      outfits: (currentDraft.outfits || []).filter(
        (outfit) => outfit.id !== outfitId
      ),
      activeOutfitId:
        currentDraft.activeOutfitId === outfitId ? "" : currentDraft.activeOutfitId,
    }));
  }

  async function importCharacterImage(slot = "main", options = {}) {
    if (!desktopSaveState?.isTauri) {
      window.alert("Image import is available in the Tauri desktop app.");
      return;
    }

    const existingCharacter = editingCharacterId
      ? characterLibrary.find((character) => character.id === editingCharacterId)
      : null;
    const result = await importDesktopCharacterImage({
      characterName:
        characterDraft.name.trim() ||
        existingCharacter?.name ||
        "character",
      scope: options.outfitId ? "outfit" : "base",
      outfitName:
        options.outfitName ||
        characterDraft.outfits?.find((outfit) => outfit.id === options.outfitId)
          ?.name,
      slot: slot === "main" ? "portrait" : slot,
    });

    if (result.status === "cancelled") {
      return;
    }

    if (!result.ok) {
      window.alert(
        result.status === "unsupportedType"
          ? "Choose a PNG, JPG, JPEG, or WebP image."
          : "Arcadia Academy could not import that image."
      );
      return;
    }

    setCharacterDraft((currentDraft) => {
      if (options.outfitId) {
        return {
          ...currentDraft,
          outfits: (currentDraft.outfits || []).map((outfit) =>
            outfit.id === options.outfitId
              ? {
                  ...outfit,
                  imageSlots: {
                    ...(outfit.imageSlots || {}),
                    [slot === "main" ? "portrait" : slot]: result.imageReference,
                  },
                  updatedAt: new Date().toISOString(),
                }
              : outfit
          ),
        };
      }

      return {
        ...currentDraft,
        ...(slot === "main"
          ? { image: result.imageReference }
          : {
              imageSlots: {
                ...currentDraft.imageSlots,
                [slot]: result.imageReference,
              },
            }),
      };
    });
  }

  function selectActiveCharacter(characterId) {
    setActiveEmployeeId(characterId);
  }

  function saveCharacter(event) {
    event.preventDefault();

    const name = characterDraft.name.trim();
    const context = CHARACTER_CONTEXTS.includes(characterDraft.context)
      ? characterDraft.context
      : "class";
    const image = characterDraft.image.trim();
    const dossierImage = characterDraft.imageSlots?.dossier?.trim() || "";
    const focusImage = characterDraft.imageSlots?.focus?.trim() || "";
    const outfits = (characterDraft.outfits || [])
      .map((outfit) => ({
        ...outfit,
        name: outfit.name.trim(),
        imageSlots: {
          portrait: outfit.imageSlots?.portrait?.trim() || "",
          dossier: outfit.imageSlots?.dossier?.trim() || "",
          focus: outfit.imageSlots?.focus?.trim() || "",
        },
        imageFraming: normalizeImageFramingSlots(outfit.imageFraming),
      }))
      .filter((outfit) => outfit.name);
    const activeOutfitId = outfits.some(
      (outfit) => outfit.id === characterDraft.activeOutfitId
    )
      ? characterDraft.activeOutfitId
      : "";
    const dossier = trimCharacterDossier(characterDraft.dossier);
    const existingCharacter = editingCharacterId
      ? characterLibrary.find((character) => character.id === editingCharacterId)
      : null;
    const role =
      context === "class"
        ? "Student"
        : dossier.information.occupation ||
          characterDraft.role.trim() ||
          existingCharacter?.role ||
          "Study Companion";
    const bio = characterDraft.bio.trim();
    const notes = characterDraft.notes.trim();

    if (!name) {
      window.alert("Character name is required.");
      return;
    }

    const matchingCharacter = characterLibrary.find(
      (character) =>
        character.name.toLowerCase() === name.toLowerCase() &&
        character.id !== editingCharacterId
    );

    if (matchingCharacter) {
      window.alert("A character with that name already exists.");
      return;
    }

    const savedAt = new Date().toISOString();
    const characterToSave = normalizeCharacter(
      {
        ...(existingCharacter || {}),
        id: existingCharacter?.id || createCharacterId(name),
        name,
        role,
        context: existingCharacter?.context || context,
        image,
        imageSlots: {
          ...(existingCharacter?.imageSlots || {}),
          dossier: dossierImage,
          focus: focusImage,
        },
        imageFraming: normalizeImageFramingSlots(characterDraft.imageFraming),
        outfits,
        activeOutfitId,
        dossier,
        bio,
        notes,
        source: existingCharacter?.source || "user",
        createdAt: existingCharacter?.createdAt || savedAt,
        updatedAt: savedAt,
      },
      {
        xp: 0,
        unlocks: [],
        storyState: {},
        context: "class",
        notes: "",
      }
    );

    setCharacterLibrary((currentCharacters) =>
      existingCharacter
        ? currentCharacters.map((character) =>
            character.id === existingCharacter.id ? characterToSave : character
          )
        : [characterToSave, ...currentCharacters]
    );

    if (!activeEmployeeId) {
      setActiveEmployeeId(characterToSave.id);
    }

    cancelCharacterForm();
  }

  function deleteCharacter(characterId) {
    const characterToDelete = characterLibrary.find(
      (character) => character.id === characterId
    );

    if (!characterToDelete) return;

    openConfirmDialog({
      title: "Delete Character",
      message: `Delete character "${characterToDelete.name}"? Study projects and sessions already logged with this character will not be changed.`,
      confirmLabel: "Delete",
      isDangerous: true,
      onConfirm: () => {
        setCharacterLibrary((currentCharacters) =>
          currentCharacters.filter((character) => character.id !== characterId)
        );

        if (activeEmployeeId === characterId) {
          setActiveEmployeeId(null);
        }

        if (dossierCharacterId === characterId) {
          setDossierCharacterId(null);
        }

        if (editingCharacterId === characterId) {
          cancelCharacterForm();
        }
      },
    });
  }

  function updateActiveEmployeeOutfit(outfitId) {
    if (!activeEmployeeId) return;

    setCharacterLibrary((currentCharacters) =>
      currentCharacters.map((character) => {
        if (character.id !== activeEmployeeId) {
          return character;
        }

        const nextActiveOutfitId = character.outfits?.some(
          (outfit) => outfit.id === outfitId
        )
          ? outfitId
          : "";

        return {
          ...character,
          activeOutfitId: nextActiveOutfitId,
        };
      })
    );
  }

  return {
    characterLibraryForDisplay,
    activeEmployee,
    selectedDossierCharacter,
    selectedDossierCharacterId,
    activeEmployeeLevelProgress,
    canImportCharacterImage,
    getDisplayImageUrl,
    characterImageOptions,
    showCharacterForm,
    editingCharacterId,
    characterDraft,
    openNewCharacterForm,
    openEditCharacterForm,
    cancelCharacterForm,
    updateCharacterDraft,
    updateCharacterDraftImageSlot,
    saveCharacterImageFraming,
    updateCharacterDraftDossier,
    addCharacterDraftOutfit,
    updateCharacterDraftOutfit,
    updateCharacterDraftOutfitImageSlot,
    saveCharacterOutfitImageFraming,
    setCharacterDraftActiveOutfit,
    deleteCharacterDraftOutfit,
    importCharacterImage,
    selectActiveCharacter,
    saveCharacter,
    deleteCharacter,
    updateActiveEmployeeOutfit,
  };
}
