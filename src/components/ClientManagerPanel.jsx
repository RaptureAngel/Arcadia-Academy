function ClientManagerPanel({
  clients,
  draft,
  isFormOpen,
  isEditing,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onDraftChange,
  onCancel,
  onSubmit,
}) {
  return (
    <section className="panel taskListPanel clientManagerPanel">
      <div className="taskListHeader clientManagerHeader">
        <div>
          <p className="panelLabel">Client Library</p>
          <h2>{clients.length} client(s)</h2>
        </div>

        <button className="secondaryButton" type="button" onClick={onAddClient}>
          Add Client
        </button>
      </div>

      {isFormOpen && (
        <form className="clientManagerForm" onSubmit={onSubmit}>
          <label>
            Client name
            <input
              value={draft.name}
              onChange={(event) => onDraftChange("name", event.target.value)}
              placeholder="e.g. Corporate Voice"
            />
          </label>

          <label>
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) => onDraftChange("notes", event.target.value)}
              placeholder="Optional reference notes"
              rows="3"
            />
          </label>

          <div className="clientColourField">
            <label>
              Client colour
              <div className="clientColourControl">
                <input
                  className="clientColourPicker"
                  type="color"
                  value={draft.accentColor || "#38bdf8"}
                  onChange={(event) =>
                    onDraftChange("accentColor", event.target.value)
                  }
                  aria-label="Client colour"
                />
                <input
                  value={draft.accentColor || ""}
                  onChange={(event) =>
                    onDraftChange("accentColor", event.target.value)
                  }
                  placeholder="#38bdf8"
                />
                {draft.accentColor && (
                  <button
                    className="detailsButton"
                    type="button"
                    onClick={() => onDraftChange("accentColor", "")}
                  >
                    Clear
                  </button>
                )}
              </div>
            </label>
          </div>

          <div className="clientManagerActions">
            <button className="primaryButton" type="submit">
              {isEditing ? "Save Changes" : "Save Client"}
            </button>
            <button className="detailsButton" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {clients.length === 0 ? (
        <p className="emptyState">
          No clients in the library. Add a client before creating tasks or
          templates.
        </p>
      ) : (
        <div className="clientManagerList">
          {clients.map((client) => (
            <article key={client.id} className="clientManagerItem">
              <div className="clientManagerIdentity">
                {client.accentColor && (
                  <span
                    className="clientManagerColourSwatch"
                    style={{ backgroundColor: client.accentColor }}
                    aria-hidden="true"
                  />
                )}
                <div>
                  <h3>{client.name}</h3>
                  {client.notes && <p>{client.notes}</p>}
                </div>
              </div>

              <div className="clientManagerItemActions">
                <button
                  className="detailsButton"
                  type="button"
                  onClick={() => onEditClient(client.id)}
                >
                  Edit
                </button>
                <button
                  className="deleteButton"
                  type="button"
                  onClick={() => onDeleteClient(client.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ClientManagerPanel;
