import { useEffect, useState } from "react";
import { formatDeadline } from "../utils/dates";

function ProjectFocusOverlay({
  project,
  employee,
  projectFocusLabel = "Project Focus",
  completeDisabled = false,
  onCompleteStep,
  onExit,
}) {
  const steps = Array.isArray(project?.steps) ? project.steps : [];
  const currentStep = steps[project?.currentStepIndex];
  const imageSrc =
    employee?.focusDisplayImage ?? employee?.displayImage ?? employee?.image;
  const [imageFailed, setImageFailed] = useState(false);
  const [imageOrientation, setImageOrientation] = useState("unknown");
  const showImage = Boolean(imageSrc) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
    setImageOrientation("unknown");
  }, [imageSrc]);

  if (!project || !currentStep) return null;

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;
  const stepNumber = currentStep.stepNumber || project.currentStepIndex + 1;
  const progress =
    totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
  const deadlineLabel = formatDeadline(project.deadline);
  const templateLabel = project.templateName || project.templateId || "Project";
  const inlineMeta = [
    project.priority ? "Priority" : null,
    deadlineLabel ? `Deadline ${deadlineLabel}` : null,
  ].filter(Boolean);

  return (
    <div className="projectFocusOverlay" role="presentation">
      <section
        className="projectFocusPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-focus-title"
      >
        <div className="projectFocusContent">
          <div className="projectFocusHeader">
            <div>
              <p className="panelLabel">{projectFocusLabel}</p>
              <h2 id="project-focus-title">{currentStep.title}</h2>
            </div>
            <button
              className="projectFocusCloseButton"
              type="button"
              onClick={onExit}
              aria-label="Close Project Focus"
            >
              {"\u00d7"}
            </button>
          </div>

          <div className="projectFocusMetaBlock">
            <p className="projectFocusMeta">
              {project.name} {"\u00b7"} {templateLabel}
              {project.client ? ` \u00b7 ${project.client}` : ""}
            </p>

            {inlineMeta.length > 0 && (
              <p className="projectFocusInlineMeta">{inlineMeta.join(" \u00b7 ")}</p>
            )}
          </div>

          <div className="projectFocusProgressBlock">
            <div className="projectFocusProgressText">
              <span>
                Step {stepNumber}/{totalSteps}
              </span>
              <strong>
                {completedSteps}/{totalSteps} complete {"\u00b7"} {progress}%
              </strong>
            </div>
            <div className="projectFocusProgressBar">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="projectFocusEmployee">
            <span>Employee</span>
            <strong>{employee?.name || "Unknown Employee"}</strong>
          </div>

          <div className="projectFocusActions">
            <button
              className="completeButton"
              type="button"
              disabled={completeDisabled}
              onClick={onCompleteStep}
              title={completeDisabled ? "Start the workday to complete steps" : ""}
            >
              Complete Step
            </button>
            <button className="deleteButton" type="button" onClick={onExit}>
              Exit Focus
            </button>
          </div>
        </div>

        <div className="projectFocusVisual">
          <div
            className={`projectFocusPortrait focusImageFrame--${imageOrientation}`}
          >
            {showImage ? (
              <img
                src={imageSrc}
                alt={employee?.name || "Focus image"}
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;

                  setImageOrientation(
                    naturalWidth >= naturalHeight ? "landscape" : "portrait"
                  );
                }}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="projectFocusVisualFallback">
                {employee?.name?.slice(0, 1) || "A"}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProjectFocusOverlay;
