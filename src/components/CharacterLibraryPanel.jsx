import { useMemo, useState } from "react";
import { getLevel } from "../utils/xp";

function CharacterPortrait({ character }) {
  const imageSrc =
    character?.portraitDisplayImage ?? character?.displayImage ?? character?.image;

  if (!imageSrc) {
    return <span>{character?.name?.slice(0, 1) || "A"}</span>;
  }

  return (
    <img
      src={imageSrc}
      alt={character.name}
      className="portraitImage"
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function CharacterFeaturedImage({ character }) {
  const [failedImageSources, setFailedImageSources] = useState([]);
  const imageSources = [
    character?.dossierDisplayImage,
    character?.mainDisplayImage,
    character?.displayImage,
    character?.image,
  ].filter((imageSrc, index, sources) => imageSrc && sources.indexOf(imageSrc) === index);
  const imageSrc = imageSources.find(
    (candidate) => !failedImageSources.includes(candidate)
  );

  if (!imageSrc) {
    return <span>{character?.name?.slice(0, 1) || "A"}</span>;
  }

  return (
    <img
      src={imageSrc}
      alt={character.name}
      className="featuredCharacterImage"
      onError={() =>
        setFailedImageSources((currentSources) =>
          currentSources.includes(imageSrc)
            ? currentSources
            : [...currentSources, imageSrc]
        )
      }
    />
  );
}

const DOSSIER_INFORMATION_FIELDS = [
  ["realName", "Real Name"],
  ["species", "Species"],
  ["occupation", "Occupation"],
  ["basedIn", "Based In"],
  ["eyeColour", "Eye Colour"],
  ["hairColour", "Hair Colour"],
  ["knownAffiliations", "Known Affiliations"],
  ["status", "Status"],
];

const DOSSIER_ATTRIBUTE_FIELDS = [
  ["intelligence", "Intelligence"],
  ["skills", "Skills"],
  ["personality", "Personality"],
  ["weaknesses", "Weaknesses"],
];

function firstRecordedValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function getCharacterRoleLabel(character) {
  return firstRecordedValue(
    character?.dossier?.information?.occupation,
    character?.title,
    character?.role,
    "Student"
  );
}

function getCharacterFlavourLine(character) {
  return firstRecordedValue(character?.dossier?.attributes?.skills, character?.bio);
}

function CharacterLibraryPanel({
  characters,
  activeCharacterId,
  selectedDossierCharacterId,
  draft,
  isFormOpen,
  isEditing,
  imageOptions,
  canImportImage = false,
  onImportImage,
  onImportDossierImage,
  onImportFocusImage,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onSelectCharacter,
  onSelectDossier,
  onDraftChange,
  onDraftImageSlotChange,
  onDraftDossierChange,
  onAddOutfit,
  onDraftOutfitChange,
  onDraftOutfitImageSlotChange,
  onSetActiveOutfit,
  onDeleteOutfit,
  onImportOutfitImage,
  onCancel,
  onSubmit,
}) {
  const dossierImage = draft.imageSlots?.dossier || "";
  const focusImage = draft.imageSlots?.focus || "";
  const outfits = Array.isArray(draft.outfits) ? draft.outfits : [];
  const dossier = draft.dossier || {};
  const dossierInformation = dossier.information || {};
  const dossierAttributes = dossier.attributes || {};
  const [previewCharacterId, setPreviewCharacterId] = useState(null);
  const previewCharacter = useMemo(
    () =>
      characters.find((character) => character.id === previewCharacterId) ||
      characters.find((character) => character.id === activeCharacterId) ||
      characters[0] ||
      null,
    [activeCharacterId, characters, previewCharacterId]
  );
  const previewRoleLabel = getCharacterRoleLabel(previewCharacter);
  const previewFlavourLine = getCharacterFlavourLine(previewCharacter);
  const previewCharacterIndex = previewCharacter
    ? characters.findIndex((character) => character.id === previewCharacter.id)
    : -1;
  const previousCharacter =
    characters.length > 1 && previewCharacterIndex >= 0
      ? characters[
          (previewCharacterIndex - 1 + characters.length) % characters.length
        ]
      : null;
  const nextCharacter =
    characters.length > 1 && previewCharacterIndex >= 0
      ? characters[(previewCharacterIndex + 1) % characters.length]
      : null;
  const showCharacterPreview = (character) => {
    if (character) {
      setPreviewCharacterId(character.id);
    }
  };

  return (
    <section className="panel characterRosterPanel">
      <div className="taskListHeader characterLibraryHeader">
        <div>
          <p className="panelLabel">Character Library</p>
          <h2>{characters.length} character(s)</h2>
        </div>

        <button
          className="secondaryButton"
          type="button"
          onClick={onAddCharacter}
        >
          New Character
        </button>
      </div>

      {isFormOpen && (
        <form className="characterLibraryForm" onSubmit={onSubmit}>
          <details className="characterEditorSection" open>
            <summary className="characterEditorSectionHeader">
              <span className="panelLabel">Core Identity</span>
            </summary>

            <div className="characterDossierFieldGrid">
              <label>
                Display Name
                <input
                  value={draft.name}
                  onChange={(event) => onDraftChange("name", event.target.value)}
                  placeholder="e.g. Reagan Ridley"
                />
              </label>
            </div>
          </details>

          <details className="characterEditorSection">
            <summary className="characterEditorSectionHeader">
              <span className="panelLabel">Images</span>
            </summary>

            <div className="characterImageField">
              <label>
                Main image path
                <input
                  list="character-image-options"
                  value={draft.image}
                  onChange={(event) =>
                    onDraftChange("image", event.target.value)
                  }
                  placeholder="/characters/reagan.png"
                />
                <datalist id="character-image-options">
                  {imageOptions.map((imagePath) => (
                    <option key={imagePath} value={imagePath} />
                  ))}
                </datalist>
              </label>

              {canImportImage && (
                <button
                  className="detailsButton"
                  type="button"
                  onClick={() => onImportImage?.()}
                >
                  Import Image
                </button>
              )}
            </div>

            <div className="characterImageField">
              <label>
                Dossier image path
                <input
                  list="character-image-options"
                  value={dossierImage}
                  onChange={(event) =>
                    onDraftImageSlotChange("dossier", event.target.value)
                  }
                  placeholder="Falls back to main image"
                />
              </label>

              {canImportImage && (
                <button
                  className="detailsButton"
                  type="button"
                  onClick={() => onImportDossierImage?.()}
                >
                  Import Dossier Image
                </button>
              )}
            </div>

            <div className="characterImageField">
              <label>
                Focus image path
                <input
                  list="character-image-options"
                  value={focusImage}
                  onChange={(event) =>
                    onDraftImageSlotChange("focus", event.target.value)
                  }
                  placeholder="Falls back to main image"
                />
              </label>

              {canImportImage && (
                <button
                  className="detailsButton"
                  type="button"
                  onClick={() => onImportFocusImage?.()}
                >
                  Import Focus Image
                </button>
              )}
            </div>
          </details>

          <details className="characterEditorSection characterOutfitFields">
            <summary className="characterEditorSectionHeader">
              <span className="panelLabel">Outfits</span>
            </summary>

            <div className="characterOutfitToolbar">
              <label>
                Active outfit
                <select
                  value={draft.activeOutfitId || ""}
                  onChange={(event) => onSetActiveOutfit(event.target.value)}
                >
                  <option value="">Base images</option>
                  {outfits.map((outfit) => (
                    <option key={outfit.id} value={outfit.id}>
                      {outfit.name || "Untitled Outfit"}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="detailsButton"
                type="button"
                onClick={() => onAddOutfit?.()}
              >
                Add Outfit
              </button>
            </div>

            {outfits.length === 0 ? (
              <p className="emptyState">
                No outfits yet. Add an outfit to override portrait, dossier, or
                focus images without changing the base character setup.
              </p>
            ) : (
              <div className="characterOutfitList">
                {outfits.map((outfit) => (
                  <article className="characterOutfitItem" key={outfit.id}>
                    <div className="characterOutfitHeader">
                      <label>
                        Outfit name
                        <input
                          value={outfit.name || ""}
                          onChange={(event) =>
                            onDraftOutfitChange?.(
                              outfit.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="e.g. Labcoat"
                        />
                      </label>

                      <div className="characterOutfitActions">
                        <button
                          className="detailsButton"
                          type="button"
                          onClick={() => onSetActiveOutfit?.(outfit.id)}
                          disabled={draft.activeOutfitId === outfit.id}
                        >
                          {draft.activeOutfitId === outfit.id ? "Active" : "Set Active"}
                        </button>
                        <button
                          className="deleteButton"
                          type="button"
                          onClick={() => onDeleteOutfit?.(outfit.id)}
                          title="Image files are left in Character Images for safety."
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="characterDossierFieldGrid">
                      {[
                        ["portrait", "Portrait override"],
                        ["dossier", "Dossier override"],
                        ["focus", "Focus override"],
                      ].map(([slot, label]) => (
                        <div className="characterOutfitImageField" key={slot}>
                          <label>
                            {label}
                            <input
                              list="character-image-options"
                              value={outfit.imageSlots?.[slot] || ""}
                              onChange={(event) =>
                                onDraftOutfitImageSlotChange?.(
                                  outfit.id,
                                  slot,
                                  event.target.value
                                )
                              }
                              placeholder="Falls back to base image"
                            />
                          </label>

                          {canImportImage && (
                            <button
                              className="detailsButton"
                              type="button"
                              onClick={() => onImportOutfitImage?.(outfit.id, slot)}
                            >
                              Import
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </details>

          <details className="characterEditorSection">
            <summary className="characterEditorSectionHeader">
              <span className="panelLabel">Dossier</span>
            </summary>

            <div className="characterDossierFieldsHeader">
              <h3>Information</h3>
            </div>

            <div className="characterDossierFieldGrid">
              {DOSSIER_INFORMATION_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    value={dossierInformation[field] || ""}
                    onChange={(event) =>
                      onDraftDossierChange("information", field, event.target.value)
                    }
                    placeholder="Unrecorded"
                  />
                </label>
              ))}
            </div>

            <div className="characterDossierFieldsHeader">
              <h3>Attributes</h3>
            </div>

            <div className="characterDossierFieldGrid">
              {DOSSIER_ATTRIBUTE_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <textarea
                    value={dossierAttributes[field] || ""}
                    onChange={(event) =>
                      onDraftDossierChange("attributes", field, event.target.value)
                    }
                    placeholder="Unrecorded"
                    rows="2"
                  />
                </label>
              ))}
            </div>

            <label>
              Profile
              <textarea
                value={dossier.profile || ""}
                onChange={(event) =>
                  onDraftDossierChange("profile", "profile", event.target.value)
                }
                placeholder="Long dossier profile/background"
                rows="7"
              />
            </label>
          </details>

          <div className="characterLibraryActions">
            <button className="primaryButton" type="submit">
              {isEditing ? "Save Changes" : "Save Character"}
            </button>
            <button className="detailsButton" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {characters.length === 0 ? (
        <p className="emptyState">
          No characters in the library. Add a character to start tracking work.
        </p>
      ) : (
        <div className="characterLibraryShowcase">
          {previewCharacter && (
            <div className="characterShowcaseStage">
              <button
                className="characterShowcaseStep"
                type="button"
                disabled={!previousCharacter}
                onClick={() => showCharacterPreview(previousCharacter)}
                aria-label="Preview previous character"
              >
                <span>{"<"}</span>
                {previousCharacter && (
                  <>
                    <span className="showcaseStepPortrait portraitPlaceholder">
                      <CharacterPortrait character={previousCharacter} />
                    </span>
                    <strong>{previousCharacter.name}</strong>
                  </>
                )}
              </button>

              <aside className="characterPreviewPanel" aria-live="polite">
                <div className="characterPreviewPortrait portraitPlaceholder">
                  <CharacterFeaturedImage
                    key={`${previewCharacter.id}-${previewCharacter.dossierDisplayImage || ""}`}
                    character={previewCharacter}
                  />
                </div>

                <div className="characterPreviewHeader">
                  <p className="panelLabel">Character</p>
                  <h2>{previewCharacter.name}</h2>
                  <p className="role">{previewRoleLabel}</p>
                </div>

                {previewFlavourLine && (
                  <p className="characterPreviewSkills">{previewFlavourLine}</p>
                )}

                <div className="miniStats characterPreviewStats">
                  <span>Level {getLevel(previewCharacter.xp)}</span>
                  <span>{previewCharacter.xp} XP</span>
                </div>

                <div className="characterLibraryCardActions characterPreviewActions">
                  <button
                    className="detailsButton"
                    type="button"
                    onClick={() => onSelectDossier?.(previewCharacter.id)}
                  >
                    {previewCharacter.id === selectedDossierCharacterId
                      ? "Viewing"
                      : "Dossier"}
                  </button>
                  <button
                    className="detailsButton"
                    type="button"
                    disabled={previewCharacter.id === activeCharacterId}
                    onClick={() => onSelectCharacter(previewCharacter.id)}
                  >
                    {previewCharacter.id === activeCharacterId
                      ? "Active"
                      : "Select"}
                  </button>
                  <button
                    className="detailsButton"
                    type="button"
                    onClick={() => onEditCharacter(previewCharacter.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="deleteButton"
                    type="button"
                    onClick={() => onDeleteCharacter(previewCharacter.id)}
                  >
                    Delete
                  </button>
                </div>
              </aside>

              <button
                className="characterShowcaseStep"
                type="button"
                disabled={!nextCharacter}
                onClick={() => showCharacterPreview(nextCharacter)}
                aria-label="Preview next character"
              >
                <span>{">"}</span>
                {nextCharacter && (
                  <>
                    <span className="showcaseStepPortrait portraitPlaceholder">
                      <CharacterPortrait character={nextCharacter} />
                    </span>
                    <strong>{nextCharacter.name}</strong>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="characterRosterStrip" aria-label="Character roster">
            {characters.map((character) => {
              const isActive = character.id === activeCharacterId;
              const isDossierTarget = character.id === selectedDossierCharacterId;
              const isPreviewTarget = character.id === previewCharacter?.id;

              return (
                <button
                  key={character.id}
                  className={`compactCharacterTile ${
                    isPreviewTarget ? "selectedCharacterTile" : ""
                  } ${isActive ? "activeCharacterCard" : ""} ${
                    isDossierTarget ? "dossierCharacterCard" : ""
                  }`}
                  type="button"
                  aria-pressed={isPreviewTarget}
                  onClick={() => showCharacterPreview(character)}
                >
                  <span className="compactCharacterPortrait portraitPlaceholder">
                    <CharacterPortrait character={character} />
                  </span>
                  <strong>{character.name}</strong>
                  <span className="compactCharacterContext">
                    Level {getLevel(character.xp)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default CharacterLibraryPanel;
