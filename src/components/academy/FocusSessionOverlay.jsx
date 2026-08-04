import { useEffect, useState } from "react";
import { getActivityVerb, getSubjectDisplay } from "../../utils/academyDisplay";
import FramedCharacterImage from "../FramedCharacterImage";
import ProjectNotesEditor from "./ProjectNotesEditor";
import SessionEndForm from "./SessionEndForm";

function formatTimer(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(remainingSeconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

function FocusSessionOverlay({
  project,
  character,
  subjects,
  startedAt,
  onSaveNotes,
  onEndSession,
  onDiscard,
  onClose,
}) {
  const [step, setStep] = useState("active");
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (!project || step !== "active") return undefined;

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [project, step]);

  if (!project) return null;

  const imageSrc = character?.focusDisplayImage ?? character?.displayImage ?? character?.image;
  const subject = getSubjectDisplay(project.subjectId, subjects);
  const elapsedSeconds = Math.max(
    0,
    Math.round((now - new Date(startedAt).getTime()) / 1000)
  );

  function handleEndFormSubmit(formValues) {
    const outcome = onEndSession(formValues);

    if (!outcome.ok) {
      setError(outcome.error || "Could not save this session.");
      return;
    }

    setResult(outcome);
    setStep("result");
  }

  return (
    <div className="focusSessionOverlay" role="presentation">
      <section
        className="focusSessionPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="focus-session-title"
      >
        <div className="focusSessionContent">
          {step === "active" && (
            <>
              <p className="panelLabel">
                {getActivityVerb(project.projectType)} · {subject.name}
              </p>
              <h2 id="focus-session-title">{project.title}</h2>

              <div className="focusSessionTimer">{formatTimer(elapsedSeconds)}</div>

              <ProjectNotesEditor
                notes={project.notes}
                onSave={(notes) => onSaveNotes(project.id, notes)}
                compact
              />

              <div className="focusSessionActions">
                <button
                  className="primaryButton"
                  type="button"
                  onClick={() => setStep("ending")}
                >
                  End Session
                </button>
                <button
                  className="detailsButton"
                  type="button"
                  onClick={() => setConfirmingDiscard(true)}
                >
                  Discard
                </button>
              </div>

              {confirmingDiscard && (
                <div className="focusSessionDiscardConfirm">
                  <p>Discard this session? No time or XP will be recorded.</p>
                  <div className="academyFormActions">
                    <button
                      className="detailsButton"
                      type="button"
                      onClick={() => setConfirmingDiscard(false)}
                    >
                      Keep Going
                    </button>
                    <button className="deleteButton" type="button" onClick={onDiscard}>
                      Discard Session
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {step === "ending" && (
            <>
              <p className="panelLabel">End Session · {project.title}</p>
              <h2 id="focus-session-title">How did it go?</h2>

              <SessionEndForm
                project={project}
                focusedSeconds={elapsedSeconds}
                onSubmit={handleEndFormSubmit}
                onCancel={() => setStep("active")}
              />

              {error && <p className="academyFormNotice academyFormNotice--error">{error}</p>}
            </>
          )}

          {step === "result" && result && (
            <div className="focusSessionResult">
              <p className="panelLabel">Session complete</p>
              <h2>
                {result.xpAwarded > 0 ? `+${result.xpAwarded} XP` : "Session recorded"}
              </h2>
              {result.leveledUp && (
                <p className="focusSessionLevelUp">Level up! Now level {result.newLevel}.</p>
              )}
              <p>Nice work — your progress has been saved.</p>
              <div className="academyFormActions">
                <button className="primaryButton" type="button" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="focusSessionVisual">
          {imageSrc ? (
            <FramedCharacterImage
              src={imageSrc}
              alt={character?.name || "Focus companion"}
            />
          ) : (
            <span className="focusSessionVisualFallback">
              {character?.name?.slice(0, 1) || "A"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

export default FocusSessionOverlay;
