import CustomProjectTemplateForm from "./CustomProjectTemplateForm";
import CustomProjectTemplateList from "./CustomProjectTemplateList";
import ProjectPackForm from "./ProjectPackForm";
import ProjectSummaryCard from "./ProjectSummaryCard";

function ProjectsView({
  contextLabels,
  templateLibrary,
  showProjectPackForm,
  onOpenProjectPackForm,
  onOpenNewTemplateForm,
  selectedTemplateId,
  selectedTemplate,
  projectName,
  projectDeadline,
  projectPriority,
  isWorking,
  onCreateProjectPack,
  onSelectedTemplateIdChange,
  onProjectNameChange,
  onProjectDeadlineChange,
  onProjectPriorityChange,
  showCustomTemplateForm,
  customTemplateDraft,
  editingTemplateId,
  templateClientOptions,
  taskTypes,
  onSaveCustomProjectTemplate,
  onCancelCustomTemplateForm,
  onUpdateCustomTemplateDraft,
  onUpdateCustomTemplateStep,
  onAddCustomTemplateStep,
  onRemoveCustomTemplateStep,
  getStepXp,
  onOpenEditTemplateForm,
  onDeleteCustomProjectTemplate,
  projectSummaries,
  expandedProjectIds,
  onToggleProjectDetails,
  onOpenProjectFocus,
  canOpenProjectFocus = true,
  onCancelProject,
}) {
  return (
    <>
      <aside className="panel taskPanel projectStartPanel projectsView">
        <div className="taskListHeader projectPackHeader">
          <div>
            <p className="panelLabel">{contextLabels.projectPacks}</p>
            <h2>Start or save repeatable work</h2>
          </div>
          <div className="projectHeaderActions">
            <button
              className="secondaryButton projectToggleButton"
              type="button"
              onClick={onOpenProjectPackForm}
              disabled={templateLibrary.length === 0}
            >
              {showProjectPackForm
                ? `Hide ${contextLabels.projectPacks}`
                : `Start ${contextLabels.projectPacks}`}
            </button>
            <button
              className="secondaryButton projectToggleButton"
              type="button"
              onClick={onOpenNewTemplateForm}
            >
              New Template
            </button>
          </div>
        </div>

        {templateLibrary.length === 0 && (
          <p className="emptyState">
            No templates available. Add a template to start{" "}
            {contextLabels.projectPacks.toLowerCase()}.
          </p>
        )}

        {showProjectPackForm && (
          <ProjectPackForm
            projectTemplates={templateLibrary}
            selectedTemplateId={selectedTemplateId}
            selectedTemplate={selectedTemplate}
            projectName={projectName}
            projectDeadline={projectDeadline}
            projectPriority={projectPriority}
            isWorking={isWorking}
            onSubmit={onCreateProjectPack}
            onSelectedTemplateIdChange={onSelectedTemplateIdChange}
            onProjectNameChange={onProjectNameChange}
            onProjectDeadlineChange={onProjectDeadlineChange}
            onProjectPriorityChange={onProjectPriorityChange}
          />
        )}

        {showCustomTemplateForm && (
          <CustomProjectTemplateForm
            draft={customTemplateDraft}
            submitLabel={editingTemplateId ? "Save Changes" : "Save Template"}
            clients={templateClientOptions}
            taskTypes={taskTypes}
            onSubmit={onSaveCustomProjectTemplate}
            onCancel={onCancelCustomTemplateForm}
            onDraftChange={onUpdateCustomTemplateDraft}
            onStepChange={onUpdateCustomTemplateStep}
            onAddStep={onAddCustomTemplateStep}
            onRemoveStep={onRemoveCustomTemplateStep}
            getStepXp={getStepXp}
          />
        )}
      </aside>

      <section className="panel taskListPanel customTemplatePanel">
        <div className="taskListHeader">
          <div>
            <p className="panelLabel">Template Library</p>
            <h2>{templateLibrary.length} template(s)</h2>
          </div>
        </div>

        <CustomProjectTemplateList
          templates={templateLibrary}
          onEditTemplate={onOpenEditTemplateForm}
          onDeleteTemplate={onDeleteCustomProjectTemplate}
        />
      </section>

      {projectSummaries.length > 0 ? (
        <section className="panel taskListPanel">
          <div className="taskListHeader">
            <div>
              <p className="panelLabel">Active {contextLabels.projectPacks}</p>
              <h2>{projectSummaries.length} project pack(s)</h2>
            </div>
          </div>

          <div className="projectSummaryGrid">
            {projectSummaries.map((project) => (
              <ProjectSummaryCard
                key={project.id}
                project={project}
                isExpanded={expandedProjectIds.includes(project.id)}
                onToggleDetails={() => onToggleProjectDetails(project.id)}
                onOpenFocus={() => onOpenProjectFocus(project.id)}
                canOpenFocus={canOpenProjectFocus}
                projectFocusLabel={contextLabels.projectFocus}
                disabledFocusTitle={`${contextLabels.workdayStart} for ${contextLabels.projectFocus}`}
                onCancelProject={() => onCancelProject(project.id)}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="panel taskListPanel">
          <div className="taskListHeader">
            <div>
              <p className="panelLabel">Active {contextLabels.projectPacks}</p>
              <h2>0 project pack(s)</h2>
            </div>
          </div>
          <p className="emptyState">
            No active {contextLabels.projectPacks.toLowerCase()}.
          </p>
        </section>
      )}
    </>
  );
}

export default ProjectsView;
