import { useEffect, useState } from "react";
import "./styles/index.css";

import AppTabs from "./components/AppTabs";
import CharacterDossier from "./components/CharacterDossier";
import ConfirmDialog from "./components/ConfirmDialog";
import ResetConfirmDialog from "./components/ResetConfirmDialog";
import CharacterLibraryPanel from "./components/CharacterLibraryPanel";
import CharacterSelectScreen from "./components/CharacterSelectScreen";
import SettingsView from "./components/SettingsView";
import OutfitSelectorModal from "./components/OutfitSelectorModal";
import AcademyDashboardView from "./components/academy/AcademyDashboardView";
import SubjectsView from "./components/academy/SubjectsView";
import SubjectForm from "./components/academy/SubjectForm";
import ProjectForm from "./components/academy/ProjectForm";
import ProjectDetailPanel from "./components/academy/ProjectDetailPanel";
import FocusSessionOverlay from "./components/academy/FocusSessionOverlay";
import ArchiveView from "./components/academy/ArchiveView";
import { employees } from "./data/employees";

import {
  createCharacterLibraryFromSavedEmployees,
  createCharacterLibraryFromStarterCharacters,
  createCharacterLibraryRecord,
  normalizeCharacterLibrary,
} from "./utils/characters";
import { useCharacterLibrary } from "./hooks/useCharacterLibrary";
import { useDataManagement } from "./hooks/useDataManagement";
import { useSubjects } from "./hooks/useSubjects";
import { useStudyProjects } from "./hooks/useStudyProjects";
import { useFocusSession } from "./hooks/useFocusSession";
import {
  STORAGE_KEYS,
  loadSavedData,
  saveData,
} from "./utils/storage";
import { normalizeSubjectList } from "./utils/subjects";
import { normalizeStudyProjectList } from "./utils/studyProjects";
import { getProjectProgressPercent } from "./utils/academyDisplay";
import {
  normalizeStudySessionList,
  calculateTotalFocusedSeconds,
} from "./utils/studySessions";

const APP_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "subjects", label: "Subjects" },
  { id: "archive", label: "Archive" },
  { id: "characters", label: "Characters" },
  { id: "settings", label: "Settings" },
];

function loadCharacterLibrary() {
  const savedCharacterLibrary = loadSavedData(
    STORAGE_KEYS.characterLibrary,
    null
  );
  const normalizedCharacterLibrary =
    normalizeCharacterLibrary(savedCharacterLibrary);

  if (normalizedCharacterLibrary) {
    return normalizedCharacterLibrary;
  }

  const savedEmployees = loadSavedData(STORAGE_KEYS.employees, null);

  if (savedEmployees) {
    return createCharacterLibraryFromSavedEmployees(employees, savedEmployees);
  }

  return createCharacterLibraryFromStarterCharacters(employees);
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeView, setActiveView] = useState("dashboard");
  const [dossierCharacterId, setDossierCharacterId] = useState(null);
  const [isOutfitSelectorOpen, setIsOutfitSelectorOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [dataNotice, setDataNotice] = useState(null);

  const [activeEmployeeId, setActiveEmployeeId] = useState(() =>
    loadSavedData(STORAGE_KEYS.activeEmployeeId, null)
  );

  const [characterLibrary, setCharacterLibrary] = useState(() =>
    loadCharacterLibrary()
  );

  const [subjects, setSubjects] = useState(() =>
    normalizeSubjectList(loadSavedData(STORAGE_KEYS.subjects, []))
  );
  const [studyProjects, setStudyProjects] = useState(() =>
    normalizeStudyProjectList(loadSavedData(STORAGE_KEYS.studyProjects, []))
  );
  const [studySessions, setStudySessions] = useState(() =>
    normalizeStudySessionList(loadSavedData(STORAGE_KEYS.studySessions, []))
  );

  const {
    desktopSaveState,
    desktopSaveStatus,
    resetConfirmConfig,
    resetConfirmType,
    setResetConfirmType,
    exportSaveData,
    importSaveData,
    persistDesktopSavePayload,
    createDesktopSaveFile,
    chooseDesktopSaveLocation,
    useFolderSave,
    replaceFolderSave,
    cancelFolderConflict,
    characterImageMigrationReport,
    characterImageMigrationStatus,
    previewCharacterImageMigration,
    runCharacterImageMigration,
    unusedCharacterImageScanReport,
    unusedCharacterImageScanStatus,
    scanUnusedCharacterImages,
    unusedCharacterImageArchiveReport,
    unusedCharacterImageArchiveStatus,
    moveUnusedCharacterImagesToArchive,
    performResetAcademyActivity,
    performNewAcademySeason,
    openResetAcademyActivityConfirm,
    openNewAcademySeasonConfirm,
  } = useDataManagement({
    activeEmployeeId,
    characterLibrary,
    setCharacterLibrary,
    subjects,
    studyProjects,
    studySessions,
    setDataNotice,
    hydrateFromStorage,
    hydrateAfterReset,
    openConfirmDialog,
  });

  const {
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
    updateCharacterDraftDossier,
    addCharacterDraftOutfit,
    updateCharacterDraftOutfit,
    updateCharacterDraftOutfitImageSlot,
    setCharacterDraftActiveOutfit,
    deleteCharacterDraftOutfit,
    importCharacterImage,
    selectActiveCharacter,
    saveCharacter,
    deleteCharacter,
    updateActiveEmployeeOutfit,
  } = useCharacterLibrary({
    characterLibrary,
    setCharacterLibrary,
    desktopSaveState,
    activeEmployeeId,
    setActiveEmployeeId,
    dossierCharacterId,
    setDossierCharacterId,
    openConfirmDialog,
  });

  // Arcadia Academy is a standalone, single-theme app: the presentation
  // theme no longer depends on a character's (legacy) context field.
  const presentationTheme = "academy";

  useEffect(() => {
    document.documentElement.dataset.theme = presentationTheme;
    document.body.dataset.theme = presentationTheme;

    return () => {
      delete document.documentElement.dataset.theme;
      delete document.body.dataset.theme;
    };
  }, [presentationTheme]);

  const {
    activeSubjects,
    archivedSubjects,
    addSubject,
    editSubject,
    archiveSubject,
    restoreSubject,
  } = useSubjects({ subjects, setSubjects });

  const {
    activeProjects: activeStudyProjects,
    shelvedProjects: shelvedStudyProjects,
    completedProjects: completedStudyProjects,
    retiredProjects: retiredStudyProjects,
    canCreateActive: canCreateActiveStudyProject,
    maxActiveSlots: maxActiveStudySlots,
    getProjectById: getStudyProjectById,
    createProject: createStudyProjectRecord,
    updateProject: updateStudyProjectRecord,
    updateNotes: updateStudyProjectNotesRecord,
    changeStatus: changeStudyProjectStatusRecord,
    deleteProject: deleteStudyProjectRecord,
  } = useStudyProjects({ studyProjects, setStudyProjects });

  const {
    activeSession: activeFocusSession,
    canStartSession: canStartFocusSession,
    startSession: startFocusSession,
    discardSession: discardFocusSession,
    endSession: endFocusSession,
  } = useFocusSession({
    setStudyProjects,
    setStudySessions,
    characterLibrary,
    setCharacterLibrary,
    getProjectById: getStudyProjectById,
  });

  const [subjectFormState, setSubjectFormState] = useState(null);
  const [projectFormState, setProjectFormState] = useState(null);
  const [projectDetailId, setProjectDetailId] = useState(null);

  const archivedStudyProjectList = [
    ...shelvedStudyProjects,
    ...completedStudyProjects,
    ...retiredStudyProjects,
  ];
  const totalAcademySessionCount = studySessions.length;
  const totalAcademyFocusedSeconds = calculateTotalFocusedSeconds(studySessions);

  function openCreateSubjectForm() {
    setSubjectFormState({ mode: "create" });
  }

  function openEditSubjectForm(subject) {
    setSubjectFormState({ mode: "edit", subject });
  }

  function closeSubjectForm() {
    setSubjectFormState(null);
  }

  function submitSubjectForm(values) {
    if (subjectFormState?.mode === "edit") {
      editSubject(subjectFormState.subject.id, values);
    } else {
      addSubject(values);
    }

    closeSubjectForm();
  }

  function openCreateProjectForm() {
    setProjectFormState({ mode: "create" });
  }

  function openEditProjectForm(projectId) {
    const project = getStudyProjectById(projectId);

    if (!project) return;

    setProjectFormState({ mode: "edit", project });
  }

  function closeProjectForm() {
    setProjectFormState(null);
  }

  function submitProjectForm(values) {
    const result =
      projectFormState?.mode === "edit"
        ? updateStudyProjectRecord(projectFormState.project.id, values)
        : createStudyProjectRecord(values);

    if (result.ok) {
      closeProjectForm();
    }

    return result;
  }

  function openProjectDetail(projectId) {
    setProjectDetailId(projectId);
  }

  function closeProjectDetail() {
    setProjectDetailId(null);
  }

  function guardProjectStatusChange(projectId, action) {
    if (activeFocusSession?.projectId === projectId) {
      setDataNotice({
        type: "error",
        message: "End the focus session before changing this project's status.",
      });
      return;
    }

    action();
  }

  function handleShelveProject(projectId) {
    guardProjectStatusChange(projectId, () =>
      changeStudyProjectStatusRecord(projectId, "shelved")
    );
  }

  function handleCompleteProject(projectId) {
    guardProjectStatusChange(projectId, () => {
      const project = getStudyProjectById(projectId);
      const percent = project ? getProjectProgressPercent(project) : null;

      if (percent !== null && percent < 100) {
        openConfirmDialog({
          title: "Complete Project",
          message: `"${project.title}" is at ${percent}% progress. Mark it complete anyway? Its progress and history will be preserved as-is.`,
          confirmLabel: "Mark Complete",
          isDangerous: false,
          onConfirm: () => changeStudyProjectStatusRecord(projectId, "completed"),
        });
        return;
      }

      changeStudyProjectStatusRecord(projectId, "completed");
    });
  }

  function handleRetireProject(projectId) {
    guardProjectStatusChange(projectId, () =>
      changeStudyProjectStatusRecord(projectId, "retired")
    );
  }

  function handleRestoreProject(projectId) {
    guardProjectStatusChange(projectId, () => {
      const result = changeStudyProjectStatusRecord(projectId, "active");

      if (!result.ok) {
        setDataNotice({ type: "error", message: result.error });
      }
    });
  }

  function handleDeleteProject(projectId) {
    const project = getStudyProjectById(projectId);

    openConfirmDialog({
      title: "Delete Project",
      message: `Delete "${project?.title || "this project"}"? This permanently removes its progress, notes, and sessions.`,
      confirmLabel: "Delete Project",
      isDangerous: true,
      onConfirm: () => {
        if (activeFocusSession?.projectId === projectId) {
          discardFocusSession();
        }

        deleteStudyProjectRecord(projectId);
        setStudySessions((currentSessions) =>
          currentSessions.filter((session) => session.projectId !== projectId)
        );

        if (projectDetailId === projectId) {
          setProjectDetailId(null);
        }
      },
    });
  }

  function handleSaveProjectNotes(projectId, notes) {
    updateStudyProjectNotesRecord(projectId, notes);
  }

  function handleStartFocusSession(projectId) {
    if (!activeEmployee) return;

    const result = startFocusSession(projectId, activeEmployee.id);

    if (!result.ok) {
      setDataNotice({ type: "error", message: result.error });
    }
  }

  function handleFocusFromDetail(projectId) {
    handleStartFocusSession(projectId);
    closeProjectDetail();
  }

  function handleSelectActiveCharacterGuarded(characterId) {
    if (activeFocusSession) {
      setDataNotice({
        type: "error",
        message: "End the current focus session before switching characters.",
      });
      return;
    }

    selectActiveCharacter(characterId);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveData(STORAGE_KEYS.activeEmployeeId, activeEmployeeId);
  }, [activeEmployeeId]);

  useEffect(() => {
    saveData(
      STORAGE_KEYS.characterLibrary,
      createCharacterLibraryRecord(characterLibrary)
    );
    saveData(STORAGE_KEYS.employees, characterLibrary);
  }, [characterLibrary]);

  useEffect(() => {
    saveData(STORAGE_KEYS.subjects, subjects);
  }, [subjects]);

  useEffect(() => {
    saveData(STORAGE_KEYS.studyProjects, studyProjects);
  }, [studyProjects]);

  useEffect(() => {
    saveData(STORAGE_KEYS.studySessions, studySessions);
  }, [studySessions]);

  useEffect(() => {
    if (activeEmployeeId && !activeEmployee) {
      setActiveEmployeeId(null);
    }
  }, [activeEmployee, activeEmployeeId]);

  const headerLogoSrc = "/branding/arcadia-academy-logo-black.png";
  const appTabs = APP_TABS;

  const todayDate = currentTime.toLocaleDateString("en-ZA", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const currentClock = currentTime.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  function openConfirmDialog(config) {
    setConfirmDialog(config);
  }

  function closeConfirmDialog() {
    setConfirmDialog(null);
  }

  function handleConfirmDialogAction() {
    if (confirmDialog?.onConfirm) {
      confirmDialog.onConfirm();
    }

    closeConfirmDialog();
  }

  function closeStaleUiState() {
    setActiveView("dashboard");
    setDossierCharacterId(null);
    setConfirmDialog(null);
    setResetConfirmType(null);
    cancelCharacterForm();
    setIsOutfitSelectorOpen(false);
    setSubjectFormState(null);
    setProjectFormState(null);
    setProjectDetailId(null);
    discardFocusSession();
  }

  function hydrateAfterReset({
    nextCharacterLibrary = null,
    message = "Academy activity has been reset.",
  } = {}) {
    setSubjects([]);
    setStudyProjects([]);
    setStudySessions([]);
    if (nextCharacterLibrary) {
      setCharacterLibrary(nextCharacterLibrary);
    }
    closeStaleUiState();
    setDataNotice({ type: "success", message });
  }

  function hydrateFromStorage(successMessage = "Save imported successfully.") {
    setCharacterLibrary(loadCharacterLibrary());
    setActiveEmployeeId(loadSavedData(STORAGE_KEYS.activeEmployeeId, null));
    setSubjects(normalizeSubjectList(loadSavedData(STORAGE_KEYS.subjects, [])));
    setStudyProjects(
      normalizeStudyProjectList(loadSavedData(STORAGE_KEYS.studyProjects, []))
    );
    setStudySessions(
      normalizeStudySessionList(loadSavedData(STORAGE_KEYS.studySessions, []))
    );
    closeStaleUiState();
    if (successMessage) {
      setDataNotice({ type: "success", message: successMessage });
    }
  }

  if (!activeEmployee) {
    return (
      <div className="app" data-theme={presentationTheme}>
        <CharacterSelectScreen
          appTitle="Arcadia Academy"
          appSubtitle="Academy Progress System"
          characterLibrary={characterLibrary}
          characterLibraryForDisplay={characterLibraryForDisplay}
          activeEmployeeId={activeEmployeeId}
          selectedDossierCharacterId={selectedDossierCharacterId}
          dossierCharacterId={dossierCharacterId}
          characterDraft={characterDraft}
          showCharacterForm={showCharacterForm}
          editingCharacterId={editingCharacterId}
          characterImageOptions={characterImageOptions}
          canImportCharacterImage={canImportCharacterImage}
          onImportImage={importCharacterImage}
          onAddCharacter={openNewCharacterForm}
          onEditCharacter={openEditCharacterForm}
          onDeleteCharacter={deleteCharacter}
          onSelectCharacter={selectActiveCharacter}
          onSelectDossier={setDossierCharacterId}
          onDraftChange={updateCharacterDraft}
          onDraftImageSlotChange={updateCharacterDraftImageSlot}
          onDraftDossierChange={updateCharacterDraftDossier}
          onAddOutfit={addCharacterDraftOutfit}
          onDraftOutfitChange={updateCharacterDraftOutfit}
          onDraftOutfitImageSlotChange={updateCharacterDraftOutfitImageSlot}
          onSetActiveOutfit={setCharacterDraftActiveOutfit}
          onDeleteOutfit={deleteCharacterDraftOutfit}
          onImportOutfitImage={(outfitId, slot) =>
            importCharacterImage(slot, { outfitId })
          }
          onCancel={cancelCharacterForm}
          onSubmit={saveCharacter}
        />
      </div>
    );
  }

  return (
    <main className="app appShell" data-theme={presentationTheme}>
      <header className="topBar">
        <div className="appIdentity">
          <img className="appLogo" src={headerLogoSrc} alt="Arcadia Academy" />
        </div>

        <AppTabs
          tabs={appTabs}
          activeView={activeView}
          onChangeView={setActiveView}
          ariaLabel="Arcadia Academy views"
        />

        <div className="topStats">
          <span>{todayDate}</span>
          <span>{currentClock}</span>
        </div>
      </header>

      {dataNotice && (
        <div className={`dataNotice dataNotice--${dataNotice.type}`} role="status">
          <p>{dataNotice.message}</p>
          <button
            className="dataNoticeDismiss"
            type="button"
            onClick={() => setDataNotice(null)}
            aria-label="Dismiss notice"
          >
            {"×"}
          </button>
        </div>
      )}

      {activeView === "dashboard" && (
        <AcademyDashboardView
          character={activeEmployee}
          levelProgress={activeEmployeeLevelProgress}
          onSwitchCharacter={() => {
            setIsOutfitSelectorOpen(false);
            setActiveEmployeeId(null);
          }}
          onOpenDossier={() => setDossierCharacterId(activeEmployee.id)}
          onOpenOutfitSelector={() => setIsOutfitSelectorOpen(true)}
          switchCharacterDisabled={Boolean(activeFocusSession)}
          activeSubjectCount={activeSubjects.length}
          activeProjects={activeStudyProjects}
          maxActiveSlots={maxActiveStudySlots}
          subjects={subjects}
          totalSessions={totalAcademySessionCount}
          totalFocusedSeconds={totalAcademyFocusedSeconds}
          activeSessionProjectId={activeFocusSession?.projectId || null}
          canFocus={canStartFocusSession()}
          focusDisabledReason="End the current focus session before starting another."
          onFocus={handleStartFocusSession}
          onOpenDetail={openProjectDetail}
          onShelve={handleShelveProject}
          onComplete={handleCompleteProject}
          onRetire={handleRetireProject}
          onEdit={openEditProjectForm}
          onDelete={handleDeleteProject}
          onAddProject={openCreateProjectForm}
        />
      )}

      {activeView === "subjects" && (
        <SubjectsView
          activeSubjects={activeSubjects}
          archivedSubjects={archivedSubjects}
          studyProjects={studyProjects}
          onAddSubject={openCreateSubjectForm}
          onEditSubject={openEditSubjectForm}
          onArchiveSubject={archiveSubject}
          onRestoreSubject={restoreSubject}
        />
      )}

      {activeView === "archive" && (
        <ArchiveView
          archivedProjects={archivedStudyProjectList}
          subjects={subjects}
          onOpenDetail={openProjectDetail}
          onRestore={handleRestoreProject}
          canRestore={canCreateActiveStudyProject}
        />
      )}

      {activeView === "characters" && (
        <section className="viewShell charactersView">
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
            onImportImage={importCharacterImage}
            onImportDossierImage={() => importCharacterImage("dossier")}
            onImportFocusImage={() => importCharacterImage("focus")}
            onAddCharacter={openNewCharacterForm}
            onEditCharacter={openEditCharacterForm}
            onDeleteCharacter={deleteCharacter}
            onSelectCharacter={handleSelectActiveCharacterGuarded}
            onSelectDossier={setDossierCharacterId}
            onDraftChange={updateCharacterDraft}
            onDraftImageSlotChange={updateCharacterDraftImageSlot}
            onDraftDossierChange={updateCharacterDraftDossier}
            onAddOutfit={addCharacterDraftOutfit}
            onDraftOutfitChange={updateCharacterDraftOutfit}
            onDraftOutfitImageSlotChange={updateCharacterDraftOutfitImageSlot}
            onSetActiveOutfit={setCharacterDraftActiveOutfit}
            onDeleteOutfit={deleteCharacterDraftOutfit}
            onImportOutfitImage={(outfitId, slot) =>
              importCharacterImage(slot, { outfitId })
            }
            onCancel={cancelCharacterForm}
            onSubmit={saveCharacter}
          />
        </section>
      )}

      {activeView === "settings" && (
        <SettingsView
          dataManagementProps={{
            onExportSaveData: exportSaveData,
            onImportSaveData: importSaveData,
            onResetAcademyActivity: openResetAcademyActivityConfirm,
            onNewAcademySeason: openNewAcademySeasonConfirm,
            onCreateDesktopSave: createDesktopSaveFile,
            onChooseDesktopSaveFolder: chooseDesktopSaveLocation,
            onUseFolderSave: useFolderSave,
            onReplaceFolderSave: replaceFolderSave,
            onCancelFolderConflict: cancelFolderConflict,
            onPreviewCharacterImageMigration: previewCharacterImageMigration,
            onRunCharacterImageMigration: runCharacterImageMigration,
            characterImageMigrationReport,
            characterImageMigrationStatus,
            onScanUnusedCharacterImages: scanUnusedCharacterImages,
            unusedCharacterImageScanReport,
            unusedCharacterImageScanStatus,
            onMoveUnusedCharacterImagesToArchive:
              moveUnusedCharacterImagesToArchive,
            unusedCharacterImageArchiveReport,
            unusedCharacterImageArchiveStatus,
            desktopSaveStatus,
            importFileInputRef: null,
            notice: dataNotice,
            onDismissNotice: () => setDataNotice(null),
          }}
        />
      )}

      {activeFocusSession && (
        <FocusSessionOverlay
          project={getStudyProjectById(activeFocusSession.projectId)}
          character={characterLibraryForDisplay.find(
            (character) => character.id === activeFocusSession.characterId
          )}
          subjects={subjects}
          startedAt={activeFocusSession.startedAt}
          onSaveNotes={handleSaveProjectNotes}
          onEndSession={endFocusSession}
          onDiscard={discardFocusSession}
          onClose={discardFocusSession}
        />
      )}

      {projectFormState && (
        <ProjectForm
          mode={projectFormState.mode}
          project={projectFormState.mode === "edit" ? projectFormState.project : null}
          subjects={subjects}
          slotsAvailable={canCreateActiveStudyProject}
          onSubmit={submitProjectForm}
          onCancel={closeProjectForm}
        />
      )}

      {subjectFormState && (
        <SubjectForm
          subject={subjectFormState.mode === "edit" ? subjectFormState.subject : null}
          onSubmit={submitSubjectForm}
          onCancel={closeSubjectForm}
        />
      )}

      {projectDetailId && getStudyProjectById(projectDetailId) && (
        <ProjectDetailPanel
          project={getStudyProjectById(projectDetailId)}
          subjects={subjects}
          sessions={studySessions}
          characterLibrary={characterLibraryForDisplay}
          canFocus={canStartFocusSession()}
          slotAvailable={canCreateActiveStudyProject}
          onClose={closeProjectDetail}
          onSaveNotes={handleSaveProjectNotes}
          onEdit={(projectId) => {
            closeProjectDetail();
            openEditProjectForm(projectId);
          }}
          onFocus={handleFocusFromDetail}
          onShelve={handleShelveProject}
          onComplete={handleCompleteProject}
          onRetire={handleRetireProject}
          onRestore={handleRestoreProject}
          onDelete={handleDeleteProject}
        />
      )}

      {dossierCharacterId && (
        <CharacterDossier
          key={selectedDossierCharacterId}
          character={selectedDossierCharacter}
          isActive={selectedDossierCharacterId === activeEmployeeId}
          onClose={() => setDossierCharacterId(null)}
          onOpenOutfitSelector={
            selectedDossierCharacterId === activeEmployeeId
              ? () => setIsOutfitSelectorOpen(true)
              : null
          }
        />
      )}

      {isOutfitSelectorOpen && activeEmployee && (
        <OutfitSelectorModal
          employee={activeEmployee}
          resolveImageReference={getDisplayImageUrl}
          onSelectOutfit={updateActiveEmployeeOutfit}
          onClose={() => setIsOutfitSelectorOpen(false)}
        />
      )}

      <ConfirmDialog
        config={confirmDialog}
        onConfirm={handleConfirmDialogAction}
        onCancel={closeConfirmDialog}
      />

      <ResetConfirmDialog
        isOpen={Boolean(resetConfirmConfig)}
        {...(resetConfirmConfig || {})}
        onConfirm={() => {
          const confirmedResetType = resetConfirmType;

          setResetConfirmType(null);

          if (confirmedResetType === "season") {
            performNewAcademySeason();
            return;
          }

          performResetAcademyActivity();
        }}
        onCancel={() => setResetConfirmType(null)}
      />

    </main>
  );
}

export default App;
