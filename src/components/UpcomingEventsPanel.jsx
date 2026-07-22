import { useMemo } from "react";
import { getUpcomingEvents } from "../utils/calendar";
import { normalizeClientAccentColor } from "../utils/clients";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDashboardEventDate(dateKey, todayKey) {
  const dateObj = parseDateKey(dateKey);
  const todayObj = parseDateKey(todayKey);
  const dayDiff = Math.round((dateObj - todayObj) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";

  return dateObj.toLocaleDateString("en-ZA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function UpcomingEventsPanel({
  calendarEvents,
  clientDisplayByName,
}) {
  const today = toDateKey(new Date());
  const nextEvent = useMemo(
    () => getUpcomingEvents(calendarEvents, today, 14)[0] || null,
    [calendarEvents, today]
  );
  const event = nextEvent?.event;
  const dateKey = nextEvent?.dateKey;
  const clientRecord = event?.client
    ? clientDisplayByName?.get(event.client.toLowerCase())
    : null;
  const clientAccentColor = normalizeClientAccentColor(
    clientRecord?.accentColor
  );
  const itemStyle = clientAccentColor
    ? { "--event-color": clientAccentColor }
    : undefined;

  return (
    <aside className="panel dashboardUpcomingEventsPanel">
      <div className="dashboardUpcomingHeader">
        <div>
          <p className="panelLabel">Upcoming</p>
          <h2>Calendar</h2>
        </div>
        <span className="dashboardUpcomingRange">14 days</span>
      </div>

      {!event || !dateKey ? (
        <p className="dashboardUpcomingEmpty">
          No upcoming calendar events.
        </p>
      ) : (
        <div
          className={[
            "dashboardUpcomingItem",
            "dashboardUpcomingItem--single",
            event.priority ? "dashboardUpcomingItem--priority" : "",
            clientAccentColor ? "dashboardUpcomingItem--accented" : "",
          ].filter(Boolean).join(" ")}
          style={itemStyle}
        >
          <span className="dashboardUpcomingDate">
            {formatDashboardEventDate(dateKey, today)}
          </span>
          <div className="dashboardUpcomingText">
            <strong>{event.title}</strong>
            <span>
              {event.category || "Event"}
              {event.client ? ` - ${event.client}` : ""}
            </span>
            <small>Open Calendar to view more</small>
          </div>
          {event.priority && (
            <span
              className="dashboardUpcomingPriority"
              aria-label="Priority event"
              title="Priority"
            />
          )}
        </div>
      )}
    </aside>
  );
}
