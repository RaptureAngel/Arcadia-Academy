import { useEffect, useMemo, useState } from "react";
import FramedCharacterImage from "./FramedCharacterImage";

function getOutfitName(outfit) {
  return outfit?.name || "Untitled Outfit";
}

function OutfitPreviewImage({ imageCandidates, characterName }) {
  const [failedImageSources, setFailedImageSources] = useState([]);
  const candidate = imageCandidates.find(
    (item) => item.src && !failedImageSources.includes(item.src)
  );

  useEffect(() => {
    setFailedImageSources([]);
  }, [imageCandidates.map((item) => item.src).join("|")]);

  if (!candidate) {
    return <span>{characterName?.slice(0, 1) || "A"}</span>;
  }

  return (
    <FramedCharacterImage
      src={candidate.src}
      alt={characterName}
      framing={candidate.framing}
      className="outfitSelectorPreviewImage"
      onError={() =>
        setFailedImageSources((currentSources) =>
          currentSources.includes(candidate.src)
            ? currentSources
            : [...currentSources, candidate.src]
        )
      }
    />
  );
}

function OutfitSelectorModal({
  employee,
  resolveImageReference,
  onSelectOutfit,
  onClose,
}) {
  const outfits = Array.isArray(employee?.outfits) ? employee.outfits : [];
  const outfitOptions = useMemo(
    () => [
      { id: "", name: "Outfit Default", outfit: null },
      ...outfits.map((outfit) => ({
        id: outfit.id,
        name: getOutfitName(outfit),
        outfit,
      })),
    ],
    [outfits]
  );
  const [selectedOutfitId, setSelectedOutfitId] = useState(
    employee?.activeOutfitId || ""
  );

  useEffect(() => {
    setSelectedOutfitId(employee?.activeOutfitId || "");
  }, [employee?.activeOutfitId, employee?.id]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const selectedOutfit =
    outfits.find((outfit) => outfit.id === selectedOutfitId) || null;
  const selectedOption =
    outfitOptions.find((option) => option.id === selectedOutfitId) ||
    outfitOptions[0];
  const selectedIndex = outfitOptions.findIndex(
    (option) => option.id === selectedOption.id
  );
  const hasMultipleOptions = outfitOptions.length > 1;
  const currentOutfit =
    outfits.find((outfit) => outfit.id === employee?.activeOutfitId) || null;
  const currentOutfitName = currentOutfit ? getOutfitName(currentOutfit) : "Outfit Default";
  const showPreviousOutfit = () => {
    if (!hasMultipleOptions) return;

    const previousIndex =
      (selectedIndex - 1 + outfitOptions.length) % outfitOptions.length;
    setSelectedOutfitId(outfitOptions[previousIndex].id);
  };
  const showNextOutfit = () => {
    if (!hasMultipleOptions) return;

    const nextIndex = (selectedIndex + 1) % outfitOptions.length;
    setSelectedOutfitId(outfitOptions[nextIndex].id);
  };
  const previewImageCandidates = useMemo(
    () =>
      [
        {
          src: resolveImageReference?.(selectedOutfit?.imageSlots?.dossier),
          framing: selectedOutfit?.imageFraming?.dossier,
        },
        {
          src: resolveImageReference?.(selectedOutfit?.imageSlots?.portrait),
          framing: selectedOutfit?.imageFraming?.portrait,
        },
        {
          src: resolveImageReference?.(selectedOutfit?.imageSlots?.focus),
          framing: selectedOutfit?.imageFraming?.focus,
        },
        {
          src: resolveImageReference?.(employee?.imageSlots?.dossier),
          framing: employee?.imageFraming?.dossier,
        },
        {
          src: resolveImageReference?.(employee?.imageSlots?.portrait),
          framing: employee?.imageFraming?.portrait,
        },
        {
          src: resolveImageReference?.(employee?.image),
          framing: employee?.imageFraming?.portrait,
        },
        { src: employee?.mainDisplayImage, framing: employee?.portraitFraming },
        { src: employee?.displayImage, framing: employee?.portraitFraming },
      ].filter(
        (candidate, index, candidates) =>
          candidate.src &&
          candidates.findIndex((other) => other.src === candidate.src) === index
      ),
    [employee, resolveImageReference, selectedOutfit]
  );

  return (
    <div className="modalBackdrop" role="presentation">
      <section
        className="outfitSelectorModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="outfit-selector-title"
      >
        <header className="outfitSelectorHeader">
          <div>
            <h2 id="outfit-selector-title">Change Outfit</h2>
            <p>Current outfit: {currentOutfitName}</p>
          </div>
          <button
            className="modalCloseButton"
            type="button"
            onClick={onClose}
            aria-label="Close outfit selector"
          >
            {"\u00d7"}
          </button>
        </header>

        <div className="outfitSelectorStage">
          {hasMultipleOptions && (
            <button
              className="outfitSelectorStep"
              type="button"
              onClick={showPreviousOutfit}
              aria-label="Preview previous outfit"
            >
              {"<"}
            </button>
          )}

          <div className="outfitSelectorBody">
            <div className="outfitSelectorPreview portraitPlaceholder">
              <OutfitPreviewImage
                imageCandidates={previewImageCandidates}
                characterName={employee.name}
              />
            </div>

            <div className="outfitSelectorInfo">
              <p className="panelLabel">Outfit</p>
              <h3>{selectedOption.name}</h3>
              <span>
                {selectedOption.id === employee.activeOutfitId
                  ? "Current outfit"
                  : "Previewing"}
              </span>

              {hasMultipleOptions && (
                <p className="outfitSelectorCount">
                  {selectedIndex + 1} / {outfitOptions.length}
                </p>
              )}
            </div>
          </div>

          {hasMultipleOptions && (
            <button
              className="outfitSelectorStep"
              type="button"
              onClick={showNextOutfit}
              aria-label="Preview next outfit"
            >
              {">"}
            </button>
          )}
        </div>

        <div className="outfitSelectorActions">
          <button
            className="primaryButton"
            type="button"
            onClick={() => {
              onSelectOutfit(selectedOutfitId);
              onClose();
            }}
          >
            Set Outfit
          </button>
          <button className="detailsButton" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

export default OutfitSelectorModal;
