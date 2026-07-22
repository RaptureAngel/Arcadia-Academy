function CustomProjectTemplateList({
  templates,
  onEditTemplate,
  onDeleteTemplate,
}) {
  if (templates.length === 0) {
    return (
      <p className="emptyState">
        No templates in the library yet. Add one to start building project packs.
      </p>
    );
  }

  return (
    <div className="customTemplateList">
      {templates.map((template) => {
        const totalXp = template.steps.reduce(
          (total, step) => total + (Number(step.xp) || 0),
          0
        );

        return (
          <article key={template.id} className="customTemplateItem">
            <div>
              <h3>{template.name}</h3>
              <p>
                {template.client} {"\u00b7"} {template.steps.length} step(s){" "}
                {"\u00b7"} {totalXp} XP
              </p>
            </div>

            <div className="customTemplateItemActions">
              <button
                className="detailsButton"
                type="button"
                onClick={() => onEditTemplate(template.id)}
              >
                Edit
              </button>

              <button
                className="deleteButton"
                type="button"
                onClick={() => onDeleteTemplate(template.id)}
              >
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default CustomProjectTemplateList;
