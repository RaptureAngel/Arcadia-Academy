import { useState } from "react";
import { SESSION_OUTCOMES, SESSION_OUTCOME_LABELS } from "../../utils/studySessions";

function SessionEndForm({ project, focusedSeconds, onSubmit, onCancel }) {
  const [pageOrChapter, setPageOrChapter] = useState(String(project.progressCurrent));
  const [outputCount, setOutputCount] = useState("0");
  const [outcome, setOutcome] = useState("successful");
  const [note, setNote] = useState("");

  const minutesFocused = Math.floor(focusedSeconds / 60);

  function handleSubmit(event) {
    event.preventDefault();

    if (project.progressMethod === "pages" || project.progressMethod === "chapters") {
      onSubmit({ progressAfter: Number(pageOrChapter), note });
      return;
    }

    if (project.progressMethod === "outputs") {
      onSubmit({ outputCount: Number(outputCount) || 0, outcome, note });
      return;
    }

    onSubmit({ note });
  }

  return (
    <form className="academyForm sessionEndForm" onSubmit={handleSubmit}>
      <p className="academyFormHint">
        {minutesFocused} minute{minutesFocused === 1 ? "" : "s"} focused this session.
      </p>

      {(project.progressMethod === "pages" || project.progressMethod === "chapters") && (
        <label className="academyFormField">
          <span>
            New current {project.progressMethod === "pages" ? "page" : "chapter"} (was{" "}
            {project.progressCurrent})
          </span>
          <input
            type="number"
            min="0"
            max={project.progressTarget ?? undefined}
            value={pageOrChapter}
            onChange={(event) => setPageOrChapter(event.target.value)}
          />
        </label>
      )}

      {project.progressMethod === "sessions" && (
        <p className="academyFormHint">
          This session will be counted automatically
          {project.progressTarget ? ` toward your target of ${project.progressTarget}.` : "."}
        </p>
      )}

      {project.progressMethod === "outputs" && (
        <>
          <label className="academyFormField">
            <span>
              {outputCount === "1"
                ? project.outputUnitSingular || "Output"
                : project.outputUnitPlural || "Outputs"}{" "}
              completed this session
            </span>
            <input
              type="number"
              min="0"
              value={outputCount}
              onChange={(event) => setOutputCount(event.target.value)}
            />
          </label>

          <fieldset className="academyFormFieldset">
            <legend>Outcome</legend>
            {SESSION_OUTCOMES.map((value) => (
              <label key={value} className="academyRadioOption">
                <input
                  type="radio"
                  name="outcome"
                  value={value}
                  checked={outcome === value}
                  onChange={() => setOutcome(value)}
                />
                {SESSION_OUTCOME_LABELS[value]}
              </label>
            ))}
          </fieldset>
        </>
      )}

      {project.progressMethod === "open-ended" && (
        <p className="academyFormHint">
          This project is open-ended — no numeric progress is required.
        </p>
      )}

      <label className="academyFormField">
        <span>Session note (optional)</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What next time?"
        />
      </label>

      <div className="academyFormActions">
        <button className="detailsButton" type="button" onClick={onCancel}>
          Back
        </button>
        <button className="primaryButton" type="submit">
          Save Session
        </button>
      </div>
    </form>
  );
}

export default SessionEndForm;
