function DataManagementPanel({
  onExportSaveData,
  onImportSaveData,
  onResetAcademyActivity,
  onNewAcademySeason,
  onCreateDesktopSave,
  onChooseDesktopSaveFolder,
  onUseFolderSave,
  onReplaceFolderSave,
  onCancelFolderConflict,
  onPreviewCharacterImageMigration,
  onRunCharacterImageMigration,
  characterImageMigrationReport,
  characterImageMigrationStatus,
  onScanUnusedCharacterImages,
  unusedCharacterImageScanReport,
  unusedCharacterImageScanStatus,
  onMoveUnusedCharacterImagesToArchive,
  unusedCharacterImageArchiveReport,
  unusedCharacterImageArchiveStatus,
  desktopSaveStatus,
  importFileInputRef,
  notice,
  onDismissNotice,
}) {
  const migrationSummary = characterImageMigrationReport?.summary;
  const isMigrationBusy =
    characterImageMigrationStatus === "previewing" ||
    characterImageMigrationStatus === "running";
  const unusedScanSummary = unusedCharacterImageScanReport?.summary;
  const isUnusedScanBusy = unusedCharacterImageScanStatus === "scanning";
  const archiveSummary = unusedCharacterImageArchiveReport?.summary;
  const isArchiveBusy = unusedCharacterImageArchiveStatus === "moving";
  const canArchiveUnusedImages =
    Boolean(onMoveUnusedCharacterImagesToArchive) &&
    !isMigrationBusy &&
    !isUnusedScanBusy &&
    !isArchiveBusy &&
    (unusedCharacterImageScanReport?.unusedFiles?.length || 0) > 0;

  return (
    <section className="panel taskListPanel dataManagementPanel">
      <div className="taskListHeader">
        <div>
          <p className="panelLabel">Data Management</p>
          <h2>Save backup</h2>
        </div>
      </div>

      <p className="emptyState">
        Export or restore your local Arcadia Academy save data, including
        subjects, study projects, sessions, and character progress. Reset
        Academy Activity permanently deletes all subjects, study projects,
        notes, progress, and sessions, while keeping your character roster,
        images, outfits, and XP. New Academy Season does the same and also
        resets every character's XP and level to zero.
      </p>

      {desktopSaveStatus?.isTauri && (
        <div className={`desktopSaveStatus desktopSaveStatus--${desktopSaveStatus.status}`}>
          <div className="desktopSaveStatusText">
            <p className="desktopSaveStatusLabel">{desktopSaveStatus.label}</p>
            <p>{desktopSaveStatus.description}</p>
            {(desktopSaveStatus.folderPath ||
              desktopSaveStatus.configuredFolderPath) && (
              <p className="desktopSavePath">
                {desktopSaveStatus.folderPath ||
                  desktopSaveStatus.configuredFolderPath}
              </p>
            )}
          </div>

          <div className="desktopSaveStatusActions">
            {desktopSaveStatus.canCreate && onCreateDesktopSave && (
              <button
                className="secondaryButton"
                type="button"
                onClick={onCreateDesktopSave}
              >
                Create Desktop Save File
              </button>
            )}

            {desktopSaveStatus.canChooseFolder && onChooseDesktopSaveFolder && (
              <button
                className="secondaryButton"
                type="button"
                onClick={onChooseDesktopSaveFolder}
              >
                Choose Save Folder
              </button>
            )}

            {desktopSaveStatus.hasFolderConflict && (
              <>
                <button
                  className="detailsButton"
                  type="button"
                  onClick={onUseFolderSave}
                >
                  Use Folder Save
                </button>

                <button
                  className="deleteButton"
                  type="button"
                  onClick={onReplaceFolderSave}
                >
                  Replace With Current Save
                </button>

                <button
                  className="detailsButton"
                  type="button"
                  onClick={onCancelFolderConflict}
                >
                  Keep Current Folder
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {desktopSaveStatus?.isTauri && (
        <div className="desktopSaveStatus desktopSaveStatus--active">
          <div className="desktopSaveStatusText">
            <p className="desktopSaveStatusLabel">Character image migration</p>
            <p>
              Copy referenced flat Character Images files into organized
              per-character folders. Old files are left untouched.
            </p>
            <p className="desktopSavePath">
              Before running, copy your active save folder, including
              arcadia-academy-save.json and Character Images/.
            </p>
            {migrationSummary && (
              <p>
                {migrationSummary.plannedCopies} planned copy/rewrite(s),{" "}
                {migrationSummary.unchangedRefs} unchanged ref(s),{" "}
                {migrationSummary.missingSources} missing source file(s),{" "}
                {migrationSummary.copyErrors} copy error(s),{" "}
                {migrationSummary.duplicateRefs.length} duplicate flat ref(s).
              </p>
            )}
            {unusedScanSummary && (
              <>
                <p>
                  {unusedScanSummary.referencedManagedImages} referenced managed
                  image(s), {unusedScanSummary.filesScanned} file(s) scanned,{" "}
                  {unusedScanSummary.unusedFiles} unused file(s),{" "}
                  {unusedScanSummary.missingReferencedFiles} missing referenced
                  file(s).
                </p>

                {unusedCharacterImageScanReport.unusedFiles.length > 0 && (
                  <details>
                    <summary>Unused character image files</summary>
                    <ul>
                      {unusedCharacterImageScanReport.unusedFiles.map((file) => (
                        <li key={file}>{file}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {unusedCharacterImageScanReport.missingReferencedFiles.length > 0 && (
                  <details>
                    <summary>Missing referenced character images</summary>
                    <ul>
                      {unusedCharacterImageScanReport.missingReferencedFiles.map(
                        (file) => (
                          <li key={file}>{file}</li>
                        )
                      )}
                    </ul>
                  </details>
                )}
              </>
            )}
            {archiveSummary && (
              <p>
                Archive result: {archiveSummary.filesMoved} file(s) moved,{" "}
                {archiveSummary.filesSkipped} skipped,{" "}
                {archiveSummary.moveErrors} move error(s).
              </p>
            )}
          </div>

          <div className="desktopSaveStatusActions">
            <button
              className="secondaryButton"
              type="button"
              onClick={onPreviewCharacterImageMigration}
              disabled={isMigrationBusy}
            >
              {characterImageMigrationStatus === "previewing"
                ? "Previewing..."
                : "Preview Character Image Migration"}
            </button>

            {migrationSummary && (
              <button
                className="detailsButton"
                type="button"
                onClick={onRunCharacterImageMigration}
                disabled={isMigrationBusy || !migrationSummary.canRun}
              >
                {characterImageMigrationStatus === "running"
                  ? "Migrating..."
                  : "Run Character Image Migration"}
              </button>
            )}

            <button
              className="secondaryButton"
              type="button"
              onClick={onScanUnusedCharacterImages}
              disabled={isMigrationBusy || isUnusedScanBusy || isArchiveBusy}
            >
              {isUnusedScanBusy
                ? "Scanning..."
                : "Scan Unused Character Images"}
            </button>

            {unusedScanSummary && (
              <button
                className="detailsButton"
                type="button"
                onClick={onMoveUnusedCharacterImagesToArchive}
                disabled={!canArchiveUnusedImages}
              >
                {isArchiveBusy
                  ? "Moving..."
                  : "Move Unused Images to Archive"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="dataManagementActions">
        <button className="secondaryButton" type="button" onClick={onExportSaveData}>
          Export Save
        </button>

        <label className="detailsButton importSaveButton">
          Import Save
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={onImportSaveData}
          />
        </label>

        <button className="deleteButton" type="button" onClick={onResetAcademyActivity}>
          Reset Academy Activity
        </button>

        <button className="deleteButton" type="button" onClick={onNewAcademySeason}>
          New Academy Season
        </button>
      </div>

      {notice && (
        <div className={`dataNotice dataNotice--${notice.type}`} role="status">
          <p>{notice.message}</p>
          {onDismissNotice && (
            <button
              className="dataNoticeDismiss"
              type="button"
              onClick={onDismissNotice}
              aria-label="Dismiss notice"
            >
              {"×"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default DataManagementPanel;
