import { CHARACTER_IMAGE_SLOTS, getCharacterImageRefs } from "./characters";
import {
  copyDesktopCharacterImageFile,
  createManagedCharacterImageReference,
  desktopCharacterImageExists,
  getAvailableDesktopCharacterImagePath,
  getManagedCharacterImageRelativePath,
  isManagedCharacterImageReference,
  listDesktopCharacterImageFiles,
  moveDesktopCharacterImageFile,
} from "./storage";

const BASE_SLOT_DESTINATIONS = {
  image: "portrait",
  portrait: "portrait",
  dossier: "dossier",
  focus: "focus",
};
const UNUSED_CHARACTER_IMAGE_ARCHIVE_DIR = "_archive-unused";

function createSafePathSegment(value, fallback = "item") {
  return (
    String(value || fallback)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || fallback
  );
}

function getFileExtension(relativePath) {
  const fileName = String(relativePath || "").split("/").pop() || "";
  const dotIndex = fileName.lastIndexOf(".");

  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function createSuffixedRelativePath(relativePath, index) {
  if (index === 0) return relativePath;

  const slashIndex = relativePath.lastIndexOf("/");
  const directory = slashIndex === -1 ? "" : relativePath.slice(0, slashIndex);
  const fileName = slashIndex === -1 ? relativePath : relativePath.slice(slashIndex + 1);
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const extension = dotIndex === -1 ? "" : fileName.slice(dotIndex);
  const suffixedFileName = `${baseName}-${String(index + 1).padStart(2, "0")}${extension}`;

  return directory ? `${directory}/${suffixedFileName}` : suffixedFileName;
}

function isArchivedCharacterImagePath(relativePath) {
  return String(relativePath || "").startsWith(
    `${UNUSED_CHARACTER_IMAGE_ARCHIVE_DIR}/`
  );
}

async function getReservedAvailableDestination(desiredRelativePath, reservedPaths) {
  for (let index = 0; index < 100; index += 1) {
    const candidatePath = createSuffixedRelativePath(desiredRelativePath, index);

    if (reservedPaths.has(candidatePath)) {
      continue;
    }

    const destinationResult = await getAvailableDesktopCharacterImagePath(
      candidatePath
    );

    if (!destinationResult.ok) {
      return destinationResult;
    }

    if (!reservedPaths.has(destinationResult.relativePath)) {
      return destinationResult;
    }
  }

  return { ok: false, status: "collisionLimit", relativePath: "", error: null };
}

function isFlatManagedReference(imageReference) {
  const relativePath = getManagedCharacterImageRelativePath(imageReference);

  return Boolean(relativePath) && !relativePath.includes("/");
}

function getManagedReferenceType(imageReference) {
  if (!isManagedCharacterImageReference(imageReference)) return "external";

  return isFlatManagedReference(imageReference) ? "flat" : "nested";
}

function createCharacterSlugMap(characterLibrary) {
  const baseSlugCounts = new Map();

  characterLibrary.forEach((character) => {
    const baseSlug = createSafePathSegment(
      character?.name || character?.id,
      "character"
    );

    baseSlugCounts.set(baseSlug, (baseSlugCounts.get(baseSlug) || 0) + 1);
  });

  const usedSlugs = new Set();

  return new Map(
    characterLibrary.map((character, index) => {
      const baseSlug = createSafePathSegment(
        character?.name || character?.id,
        "character"
      );
      let slug = baseSlug;

      if (baseSlugCounts.get(baseSlug) > 1) {
        const idSegment = createSafePathSegment(character?.id, `character-${index + 1}`);
        slug = `${baseSlug}-${idSegment}`;
      }

      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${String(usedSlugs.size + 1).padStart(2, "0")}`;
      }

      usedSlugs.add(slug);
      return [character, slug];
    })
  );
}

function createBaseDestination(characterSlug, slot, sourceRelativePath) {
  const destinationSlot = BASE_SLOT_DESTINATIONS[slot] || slot;

  return `${characterSlug}/base/${destinationSlot}${getFileExtension(sourceRelativePath)}`;
}

function createOutfitDestination(
  characterSlug,
  outfit,
  slot,
  sourceRelativePath,
  outfitIndex
) {
  const outfitSlug = createSafePathSegment(
    outfit?.name || outfit?.id,
    `outfit-${outfitIndex + 1}`
  );

  return `${characterSlug}/outfits/${outfitSlug}/${slot}${getFileExtension(sourceRelativePath)}`;
}

function createAssetDestination(
  characterSlug,
  asset,
  sourceRelativePath,
  assetIndex
) {
  const assetSlug = createSafePathSegment(
    asset?.label || "asset",
    `asset-${assetIndex + 1}`
  );
  const assetNumber = String(assetIndex + 1).padStart(2, "0");

  return `${characterSlug}/assets/${assetSlug}-${assetNumber}${getFileExtension(sourceRelativePath)}`;
}

function addReferenceOperation(operations, context) {
  const referenceType = getManagedReferenceType(context.ref);

  if (referenceType !== "flat") {
    operations.push({
      ...context,
      referenceType,
      sourceRelativePath: getManagedCharacterImageRelativePath(context.ref),
      status: "unchanged",
    });
    return;
  }

  const sourceRelativePath = getManagedCharacterImageRelativePath(context.ref);

  operations.push({
    ...context,
    referenceType,
    sourceRelativePath,
    desiredRelativePath: context.createDestination(sourceRelativePath),
    status: "pending",
  });
}

function collectImageReferenceOperations(characterLibrary) {
  const operations = [];
  const characterSlugMap = createCharacterSlugMap(characterLibrary);

  characterLibrary.forEach((character, characterIndex) => {
    const characterSlug = characterSlugMap.get(character);
    const characterLabel = character?.name || `Character ${characterIndex + 1}`;

    addReferenceOperation(operations, {
      id: `character:${characterIndex}:image`,
      ref: character?.image,
      characterIndex,
      field: "image",
      characterLabel,
      slotLabel: "Base portrait",
      createDestination: (sourceRelativePath) =>
        createBaseDestination(characterSlug, "image", sourceRelativePath),
    });

    CHARACTER_IMAGE_SLOTS.forEach((slot) => {
      addReferenceOperation(operations, {
        id: `character:${characterIndex}:imageSlots:${slot}`,
        ref: character?.imageSlots?.[slot],
        characterIndex,
        field: "imageSlot",
        slot,
        characterLabel,
        slotLabel: `Base ${slot}`,
        createDestination: (sourceRelativePath) =>
          createBaseDestination(characterSlug, slot, sourceRelativePath),
      });
    });

    if (Array.isArray(character?.imageAssets)) {
      character.imageAssets.forEach((asset, assetIndex) => {
        addReferenceOperation(operations, {
          id: `character:${characterIndex}:imageAssets:${assetIndex}`,
          ref: asset?.ref,
          characterIndex,
          field: "imageAsset",
          assetIndex,
          characterLabel,
          slotLabel: asset?.label || `Asset ${assetIndex + 1}`,
          createDestination: (sourceRelativePath) =>
            createAssetDestination(characterSlug, asset, sourceRelativePath, assetIndex),
        });
      });
    }

    if (Array.isArray(character?.outfits)) {
      character.outfits.forEach((outfit, outfitIndex) => {
        CHARACTER_IMAGE_SLOTS.forEach((slot) => {
          addReferenceOperation(operations, {
            id: `character:${characterIndex}:outfits:${outfitIndex}:${slot}`,
            ref: outfit?.imageSlots?.[slot],
            characterIndex,
            field: "outfitImageSlot",
            outfitIndex,
            slot,
            characterLabel,
            outfitLabel: outfit?.name || `Outfit ${outfitIndex + 1}`,
            slotLabel: `${outfit?.name || `Outfit ${outfitIndex + 1}`} ${slot}`,
            createDestination: (sourceRelativePath) =>
              createOutfitDestination(
                characterSlug,
                outfit,
                slot,
                sourceRelativePath,
                outfitIndex
              ),
          });
        });
      });
    }
  });

  return operations.filter((operation) => typeof operation.ref === "string" && operation.ref.trim());
}

function summarizeOperations(operations) {
  const sourceRefCounts = new Map();

  operations
    .filter((operation) => operation.referenceType === "flat")
    .forEach((operation) => {
      sourceRefCounts.set(operation.ref, (sourceRefCounts.get(operation.ref) || 0) + 1);
    });

  const duplicateRefs = Array.from(sourceRefCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([ref, count]) => ({ ref, count }));
  const flatRefs = operations.filter((operation) => operation.referenceType === "flat");
  const nestedRefs = operations.filter((operation) => operation.referenceType === "nested");
  const externalRefs = operations.filter((operation) => operation.referenceType === "external");
  const missingSources = operations.filter((operation) => operation.status === "missing");
  const plannedCopies = operations.filter((operation) => operation.status === "planned");
  const copyErrors = operations.filter((operation) => operation.status === "copyError");

  return {
    totalRefs: operations.length,
    flatRefs: flatRefs.length,
    unchangedRefs: nestedRefs.length + externalRefs.length,
    nestedRefs: nestedRefs.length,
    externalRefs: externalRefs.length,
    plannedCopies: plannedCopies.length,
    plannedRewrites: plannedCopies.length,
    missingSources: missingSources.length,
    copyErrors: copyErrors.length,
    duplicateRefs,
    canRun: plannedCopies.length > 0,
  };
}

async function createMigrationPlan(characterLibrary) {
  const operations = collectImageReferenceOperations(characterLibrary);
  const plannedDestinations = new Map();
  const reservedDestinationPaths = new Set();

  for (const operation of operations) {
    if (operation.referenceType !== "flat") {
      continue;
    }

    const sourceResult = await desktopCharacterImageExists(operation.sourceRelativePath);

    if (!sourceResult.exists) {
      operation.status = "missing";
      continue;
    }

    const destinationKey = `${operation.sourceRelativePath}|${operation.desiredRelativePath}`;
    let destinationPath = plannedDestinations.get(destinationKey);

    if (!destinationPath) {
      const destinationResult = await getReservedAvailableDestination(
        operation.desiredRelativePath,
        reservedDestinationPaths
      );

      if (!destinationResult.ok) {
        operation.status = "copyError";
        operation.errorStatus = destinationResult.status;
        continue;
      }

      destinationPath = destinationResult.relativePath;
      plannedDestinations.set(destinationKey, destinationPath);
      reservedDestinationPaths.add(destinationPath);
    }

    operation.status = "planned";
    operation.destinationRelativePath = destinationPath;
    operation.destinationRef = createManagedCharacterImageReference(destinationPath);
  }

  return {
    operations,
    summary: summarizeOperations(operations),
  };
}

function rewriteCharacterImageRefs(characterLibrary, copiedOperations) {
  const nextCharacterLibrary = JSON.parse(JSON.stringify(characterLibrary));

  copiedOperations.forEach((operation) => {
    const nextCharacter = nextCharacterLibrary[operation.characterIndex];

    if (!nextCharacter) return;

    if (operation.field === "image") {
      nextCharacter.image = operation.destinationRef;
      return;
    }

    if (operation.field === "imageSlot") {
      nextCharacter.imageSlots = {
        ...(nextCharacter.imageSlots || {}),
        [operation.slot]: operation.destinationRef,
      };
      return;
    }

    if (operation.field === "imageAsset") {
      if (!Array.isArray(nextCharacter.imageAssets)) return;

      nextCharacter.imageAssets[operation.assetIndex] = {
        ...nextCharacter.imageAssets[operation.assetIndex],
        ref: operation.destinationRef,
      };
      return;
    }

    if (operation.field === "outfitImageSlot") {
      const nextOutfit = nextCharacter.outfits?.[operation.outfitIndex];

      if (!nextOutfit) return;

      nextOutfit.imageSlots = {
        ...(nextOutfit.imageSlots || {}),
        [operation.slot]: operation.destinationRef,
      };
    }
  });

  return nextCharacterLibrary;
}

export async function previewCharacterImageMigration(characterLibrary) {
  const plan = await createMigrationPlan(characterLibrary);

  return {
    status: "preview",
    operations: plan.operations,
    summary: plan.summary,
    nextCharacterLibrary: null,
  };
}

export async function runCharacterImageMigration(characterLibrary) {
  const plan = await createMigrationPlan(characterLibrary);
  const copiedByDestination = new Map();

  for (const operation of plan.operations) {
    if (operation.status !== "planned") {
      continue;
    }

    const destinationKey = `${operation.sourceRelativePath}|${operation.destinationRelativePath}`;
    let copyResult = copiedByDestination.get(destinationKey);

    if (!copyResult) {
      copyResult = await copyDesktopCharacterImageFile(
        operation.sourceRelativePath,
        operation.destinationRelativePath
      );
      copiedByDestination.set(destinationKey, copyResult);
    }

    if (copyResult.ok) {
      operation.status = "copied";
      continue;
    }

    operation.status = "copyError";
    operation.errorStatus = copyResult.status;
  }

  const copiedOperations = plan.operations.filter(
    (operation) => operation.status === "copied"
  );

  return {
    status: "completed",
    operations: plan.operations,
    summary: {
      ...summarizeOperations(plan.operations),
      copied: copiedOperations.length,
      rewritten: copiedOperations.length,
    },
    nextCharacterLibrary: rewriteCharacterImageRefs(
      characterLibrary,
      copiedOperations
    ),
  };
}

export async function scanUnusedCharacterImages(characterLibrary) {
  const referencedManagedImages = Array.from(
    new Set(
      characterLibrary
        .flatMap(getCharacterImageRefs)
        .filter(isManagedCharacterImageReference)
        .map(getManagedCharacterImageRelativePath)
        .filter(Boolean)
    )
  ).sort((firstRef, secondRef) => firstRef.localeCompare(secondRef));
  const scanResult = await listDesktopCharacterImageFiles();

  if (!scanResult.ok) {
    return {
      status: scanResult.status,
      referencedManagedImages,
      files: [],
      unusedFiles: [],
      missingReferencedFiles: referencedManagedImages,
      summary: {
        referencedManagedImages: referencedManagedImages.length,
        filesScanned: 0,
        unusedFiles: 0,
        missingReferencedFiles: referencedManagedImages.length,
      },
      error: scanResult.error,
    };
  }

  const files = Array.from(
    new Set(
      scanResult.files
        .filter(Boolean)
        .filter((file) => !isArchivedCharacterImagePath(file))
    )
  ).sort((firstFile, secondFile) => firstFile.localeCompare(secondFile));
  const referencedImageSet = new Set(referencedManagedImages);
  const fileSet = new Set(files);
  const unusedFiles = files.filter((file) => !referencedImageSet.has(file));
  const missingReferencedFiles = referencedManagedImages.filter(
    (ref) => !fileSet.has(ref)
  );

  return {
    status: scanResult.status,
    referencedManagedImages,
    files,
    unusedFiles,
    missingReferencedFiles,
    summary: {
      referencedManagedImages: referencedManagedImages.length,
      filesScanned: files.length,
      unusedFiles: unusedFiles.length,
      missingReferencedFiles: missingReferencedFiles.length,
    },
    saveLocation: scanResult.saveLocation,
    folderPath: scanResult.folderPath,
    fallback: scanResult.fallback,
    error: null,
  };
}

export async function moveUnusedCharacterImagesToArchive(
  unusedFiles,
  archiveDate
) {
  const archiveDay = String(archiveDate || "undated").trim() || "undated";
  const uniqueUnusedFiles = Array.from(
    new Set(Array.isArray(unusedFiles) ? unusedFiles.filter(Boolean) : [])
  ).sort((firstFile, secondFile) => firstFile.localeCompare(secondFile));
  const movedFiles = [];
  const skippedFiles = [];
  const moveErrors = [];

  for (const file of uniqueUnusedFiles) {
    if (isArchivedCharacterImagePath(file)) {
      skippedFiles.push({
        sourceRelativePath: file,
        status: "alreadyArchived",
      });
      continue;
    }

    const desiredArchivePath = `${UNUSED_CHARACTER_IMAGE_ARCHIVE_DIR}/${archiveDay}/${file}`;
    const destinationResult = await getAvailableDesktopCharacterImagePath(
      desiredArchivePath
    );

    if (!destinationResult.ok) {
      moveErrors.push({
        sourceRelativePath: file,
        status: destinationResult.status,
      });
      continue;
    }

    const moveResult = await moveDesktopCharacterImageFile(
      file,
      destinationResult.relativePath
    );

    if (moveResult.ok) {
      movedFiles.push({
        sourceRelativePath: file,
        destinationRelativePath: moveResult.destinationRelativePath,
      });
      continue;
    }

    const resultEntry = {
      sourceRelativePath: file,
      destinationRelativePath: destinationResult.relativePath,
      status: moveResult.status,
    };

    if (moveResult.status === "missingSource") {
      skippedFiles.push(resultEntry);
      continue;
    }

    moveErrors.push(resultEntry);
  }

  return {
    status: "completed",
    archiveDate: archiveDay,
    archiveDirectory: `${UNUSED_CHARACTER_IMAGE_ARCHIVE_DIR}/${archiveDay}`,
    movedFiles,
    skippedFiles,
    moveErrors,
    summary: {
      filesRequested: uniqueUnusedFiles.length,
      filesMoved: movedFiles.length,
      filesSkipped: skippedFiles.length,
      moveErrors: moveErrors.length,
    },
  };
}
