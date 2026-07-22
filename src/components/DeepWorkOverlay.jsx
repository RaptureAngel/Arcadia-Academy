import { useEffect, useState } from "react";

function DeepWorkOverlay({
  task,
  employee,
  timerLabel,
  xpLabel,
  isPaused,
  timerActionLabel,
  timerActionDisabled = false,
  onTimerAction,
  onComplete,
  onExit,
  deepWorkLabel = "Deep Work",
}) {
  const imageSrc =
    employee?.focusDisplayImage ?? employee?.displayImage ?? employee?.image;
  const [imageFailed, setImageFailed] = useState(false);
  const [imageOrientation, setImageOrientation] = useState("unknown");
  const showImage = Boolean(imageSrc) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
    setImageOrientation("unknown");
  }, [imageSrc]);

  if (!task) return null;

  return (
    <div className="deepWorkOverlay" role="presentation">
      <section
        className="deepWorkPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deep-work-title"
      >
        <div className="deepWorkContent">
          <p className="panelLabel">{deepWorkLabel}</p>
          <h2 id="deep-work-title">{task.title}</h2>
          <p className="deepWorkMeta">
            {task.client} {"\u00b7"} {task.taskType}
          </p>

          <div className="deepWorkStats">
            <div>
              <span>Timer</span>
              <strong>{timerLabel}</strong>
            </div>
            <div>
              <span>XP</span>
              <strong>{xpLabel}</strong>
            </div>
            <div>
              <span>Employee</span>
              <strong>{employee?.name || "Unknown Employee"}</strong>
            </div>
          </div>

          <p className={`deepWorkStatus ${isPaused ? "paused" : "running"}`}>
            {isPaused ? "Paused" : "Timer running"}
          </p>

          <div className="deepWorkActions">
            <button
              className="detailsButton"
              type="button"
              disabled={timerActionDisabled}
              onClick={onTimerAction}
            >
              {timerActionLabel}
            </button>
            <button className="completeButton" type="button" onClick={onComplete}>
              Complete
            </button>
            <button className="deleteButton" type="button" onClick={onExit}>
              Exit Focus
            </button>
          </div>
        </div>

        <div className={`deepWorkVisual focusImageFrame--${imageOrientation}`}>
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
            <span className="deepWorkVisualFallback">
              {employee?.name?.slice(0, 1) || "A"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

export default DeepWorkOverlay;
