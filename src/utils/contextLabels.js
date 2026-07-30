// Characters carry a legacy "office"/"class" context field from the old
// Arcadia Desk dual-flavour system. Academy no longer branches UI copy on
// it, but it still distinguishes the dossier's default role label.
export function getCharacterContext(characterOrContext) {
  const context =
    typeof characterOrContext === "string"
      ? characterOrContext
      : characterOrContext?.context;

  return context === "class" ? "class" : "office";
}
