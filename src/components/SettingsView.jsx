import ClientManagerPanel from "./ClientManagerPanel";
import DataManagementPanel from "./DataManagementPanel";

function SettingsView({ clientManagerProps, dataManagementProps }) {
  return (
    <section className="viewShell settingsView">
      <ClientManagerPanel {...clientManagerProps} />
      <DataManagementPanel {...dataManagementProps} />
    </section>
  );
}

export default SettingsView;
