function ScratchpadPanel({ value, onChange }) {
  return (
    <section className="panel scratchpadPanel">
      <p className="panelLabel">Daily Scratchpad</p>
      <textarea
        className="scratchpadTextarea"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Quick notes, reminders, rough thoughts for today..."
        aria-label="Daily scratchpad"
      />
    </section>
  );
}

export default ScratchpadPanel;
