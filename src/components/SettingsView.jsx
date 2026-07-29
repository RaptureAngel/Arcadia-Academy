import DataManagementPanel from "./DataManagementPanel";

function SettingsView({ dataManagementProps }) {
  return (
    <section className="viewShell settingsView">
      <DataManagementPanel {...dataManagementProps} />
    </section>
  );
}

export default SettingsView;
