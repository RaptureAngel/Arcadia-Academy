function AppTabs({
  tabs,
  activeView,
  onChangeView,
  ariaLabel = "Arcadia Desk views",
}) {
  return (
    <nav className="appTabs" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`appTab ${activeView === tab.id ? "active" : ""}`}
          onClick={() => onChangeView(tab.id)}
          aria-current={activeView === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default AppTabs;
