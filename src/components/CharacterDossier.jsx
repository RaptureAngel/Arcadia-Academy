import { useEffect, useState } from "react";
import { getCharacterContext } from "../utils/contextLabels";
import { getFramingStyle } from "../utils/imageFraming";

function DossierRow({ label, value }) {
  return (
    <div className="dossierInfoRow">
      <span>{label}</span>
      <strong>{value || "Unrecorded"}</strong>
    </div>
  );
}

function firstRecordedValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function getProfileParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n|\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const DOSSIER_TABS = [
  { id: "information", label: "Information" },
  { id: "attributes", label: "Attributes" },
  { id: "profile", label: "Profile" },
];

function CharacterDossier({
  character,
  isActive = false,
  onClose,
  onOpenOutfitSelector,
}) {
  const [failedImageKeys, setFailedImageKeys] = useState([]);
  const [activeTab, setActiveTab] = useState("information");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!character) return null;

  const context = getCharacterContext(character);
  const contextLabel = "Academy";
  const roleLabel = context === "class" ? "Student" : character.role || "Study Companion";
  const statusLabel = isActive ? "Active file" : "Standby file";
  const affiliationLabel = "Arcadia Academy";
  const hasOutfits = Array.isArray(character.outfits) && character.outfits.length > 0;
  const canChangeOutfit = Boolean(onOpenOutfitSelector) && hasOutfits;
  const dossierInformation = character.dossier?.information || {};
  const dossierAttributes = character.dossier?.attributes || {};
  const imageSrc =
    character.dossierDisplayImage ?? character.displayImage ?? character.image;
  const fallbackImageSrc =
    character.mainDisplayImage ?? character.displayImage ?? character.image;
  const imageKey = `${character.id || "unknown"}:${imageSrc || ""}`;
  const fallbackImageKey = `${character.id || "unknown"}:${fallbackImageSrc || ""}`;
  const imageFailed = failedImageKeys.includes(imageKey);
  const fallbackImageFailed = failedImageKeys.includes(fallbackImageKey);
  const visibleImageSrc =
    imageFailed && fallbackImageSrc !== imageSrc && !fallbackImageFailed
      ? fallbackImageSrc
      : imageSrc;
  const visibleImageKey = imageFailed ? fallbackImageKey : imageKey;
  const visibleImageFraming =
    imageFailed && fallbackImageSrc !== imageSrc && !fallbackImageFailed
      ? character.portraitFraming
      : character.dossierFraming;
  const profileText =
    firstRecordedValue(character.dossier?.profile, character.bio, character.notes) ||
    "No profile background has been recorded for this character yet.";
  const profileParagraphs = getProfileParagraphs(profileText);

  return (
    <div className="dossierOverlay" role="presentation">
      <section
        className="characterDossierModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="character-dossier-title"
      >
        <button
          className="dossierCloseButton"
          type="button"
          onClick={onClose}
          aria-label="Close character dossier"
        >
          {"\u00d7"}
        </button>

        <div className="dossierInfoPanel">
          <header className="dossierHeader">
            <p className="dossierClassification">Classified</p>
            <div className="dossierTitleRow">
              <div>
                <h2 id="character-dossier-title">{character.name}</h2>
                <p>{roleLabel || "Study Companion"}</p>
              </div>
              {canChangeOutfit && (
                <button
                  className="detailsButton"
                  type="button"
                  onClick={onOpenOutfitSelector}
                >
                  Change Outfit
                </button>
              )}
            </div>
          </header>

          <div className="dossierTabs" role="tablist" aria-label="Dossier tabs">
            {DOSSIER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="dossierTabPanel">
            {activeTab === "information" && (
              <div className="dossierInfoTable">
                <DossierRow
                  label="Real Name"
                  value={firstRecordedValue(
                    dossierInformation.realName,
                    character.name
                  )}
                />
                <DossierRow
                  label="Species"
                  value={dossierInformation.species}
                />
                <DossierRow
                  label="Occupation"
                  value={firstRecordedValue(
                    dossierInformation.occupation,
                    roleLabel,
                    "Study Companion"
                  )}
                />
                <DossierRow
                  label="Based In"
                  value={firstRecordedValue(dossierInformation.basedIn, contextLabel)}
                />
                <DossierRow
                  label="Eye Colour"
                  value={dossierInformation.eyeColour}
                />
                <DossierRow
                  label="Hair Colour"
                  value={dossierInformation.hairColour}
                />
                <DossierRow
                  label="Known Affiliations"
                  value={firstRecordedValue(
                    dossierInformation.knownAffiliations,
                    affiliationLabel
                  )}
                />
                <DossierRow
                  label="Status"
                  value={firstRecordedValue(dossierInformation.status, statusLabel)}
                />
              </div>
            )}

            {activeTab === "attributes" && (
              <div className="dossierInfoTable">
                <DossierRow
                  label="Intelligence"
                  value={dossierAttributes.intelligence}
                />
                <DossierRow
                  label="Skills"
                  value={dossierAttributes.skills}
                />
                <DossierRow
                  label="Personality"
                  value={dossierAttributes.personality}
                />
                <DossierRow
                  label="Weaknesses"
                  value={dossierAttributes.weaknesses}
                />
              </div>
            )}

            {activeTab === "profile" && (
              <section className="dossierProfileBlock">
                {profileParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </section>
            )}
          </div>
        </div>

        <div className="dossierVisualPanel" aria-hidden="true">
          <div className="dossierPortraitFrame">
            {visibleImageSrc && !(imageFailed && fallbackImageFailed) ? (
              <img
                src={visibleImageSrc}
                alt=""
                style={getFramingStyle(visibleImageFraming)}
                onError={() =>
                  setFailedImageKeys((currentKeys) =>
                    currentKeys.includes(visibleImageKey)
                      ? currentKeys
                      : [...currentKeys, visibleImageKey]
                  )
                }
              />
            ) : (
              <span>{character.name?.slice(0, 1) || "A"}</span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default CharacterDossier;
