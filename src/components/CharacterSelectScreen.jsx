import CharacterLibraryPanel from "./CharacterLibraryPanel";
import { getLevel } from "../utils/xp";

function CharacterSelectScreen({
  appTitle,
  appSubtitle,
  characterLibrary,
  characterLibraryForDisplay,
  activeEmployeeId,
  selectedDossierCharacterId,
  dossierCharacterId,
  characterDraft,
  showCharacterForm,
  editingCharacterId,
  characterImageOptions,
  canImportCharacterImage,
  resolveImageReference,
  onImportImage,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onSelectCharacter,
  onSelectDossier,
  onDraftChange,
  onDraftImageSlotChange,
  onSaveImageFraming,
  onDraftDossierChange,
  onAddOutfit,
  onDraftOutfitChange,
  onDraftOutfitImageSlotChange,
  onSaveOutfitImageFraming,
  onSetActiveOutfit,
  onDeleteOutfit,
  onImportOutfitImage,
  onCancel,
  onSubmit,
}) {
  return (
    <main className="selectScreen">
      <section className="selectHero">
        <p className="eyebrow">{appSubtitle}</p>
        <h1>{appTitle}</h1>
        <p className="heroText">
          Select or create a character to begin your studies.
        </p>
      </section>

      {characterLibrary.length > 0 ? (
        <section className="employeeGrid">
          {characterLibraryForDisplay.map((employee) => (
            <button
              key={employee.id}
              className="employeeSelectCard"
              onClick={() => onSelectCharacter(employee.id)}
            >
              <div className="portraitPlaceholder">
                {employee.portraitDisplayImage ? (
                  <img
                    src={employee.portraitDisplayImage}
                    alt={employee.name}
                    className="portraitImage"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{employee.name?.slice(0, 1) || "A"}</span>
                )}
              </div>
              <h2>{employee.name}</h2>
              <p className="role">
                {employee.context === "class" ? "Student" : employee.role || "Study Companion"}
              </p>
              <div className="miniStats">
                <span>Level {getLevel(employee.xp)}</span>
                <span>{employee.xp} XP</span>
              </div>
            </button>
          ))}
        </section>
      ) : (
        <CharacterLibraryPanel
          characters={characterLibraryForDisplay}
          activeCharacterId={activeEmployeeId}
          selectedDossierCharacterId={
            dossierCharacterId ? selectedDossierCharacterId : null
          }
          draft={characterDraft}
          isFormOpen={showCharacterForm}
          isEditing={Boolean(editingCharacterId)}
          imageOptions={characterImageOptions}
          canImportImage={canImportCharacterImage}
          resolveImageReference={resolveImageReference}
          onImportImage={onImportImage}
          onImportDossierImage={() => onImportImage("dossier")}
          onImportFocusImage={() => onImportImage("focus")}
          onAddCharacter={onAddCharacter}
          onEditCharacter={onEditCharacter}
          onDeleteCharacter={onDeleteCharacter}
          onSelectCharacter={onSelectCharacter}
          onSelectDossier={onSelectDossier}
          onDraftChange={onDraftChange}
          onDraftImageSlotChange={onDraftImageSlotChange}
          onSaveImageFraming={onSaveImageFraming}
          onDraftDossierChange={onDraftDossierChange}
          onAddOutfit={onAddOutfit}
          onDraftOutfitChange={onDraftOutfitChange}
          onDraftOutfitImageSlotChange={onDraftOutfitImageSlotChange}
          onSaveOutfitImageFraming={onSaveOutfitImageFraming}
          onSetActiveOutfit={onSetActiveOutfit}
          onDeleteOutfit={onDeleteOutfit}
          onImportOutfitImage={onImportOutfitImage}
          onCancel={onCancel}
          onSubmit={onSubmit}
        />
      )}
    </main>
  );
}

export default CharacterSelectScreen;
