import { useMemo, useState } from "react";
import {
  generateOccurrences,
  formatRecurrenceLabel,
  getCalendarCategoryKey,
  getCalendarCategoryLabel,
  getUpcomingEvents,
  isCalendarDayMarkerEvent,
  isWorkingAwayEvent,
} from "../utils/calendar";
import CalendarEventForm from "./CalendarEventForm";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(new Date(year, month - 1, d));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getOccurrencesByDay(events, year, month) {
  const firstKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDate = new Date(year, month, 0);
  const lastKey = toDateKey(lastDate);
  const byDay = {};

  for (const event of events) {
    const dates = generateOccurrences(event, firstKey, lastKey);
    for (const dateKey of dates) {
      if (!byDay[dateKey]) byDay[dateKey] = [];
      byDay[dateKey].push(event);
    }
  }

  return byDay;
}

function parseDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getAgendaDateLabel(dateKey, todayKey) {
  const dateObj = parseDateKey(dateKey);
  const todayObj = parseDateKey(todayKey);
  const dayDiff = Math.round((dateObj - todayObj) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";

  return dateObj.toLocaleDateString("en-ZA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupAgendaOccurrences(occurrences) {
  const groups = [];

  for (const occurrence of occurrences) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.dateKey === occurrence.dateKey) {
      lastGroup.items.push(occurrence);
    } else {
      groups.push({ dateKey: occurrence.dateKey, items: [occurrence] });
    }
  }

  return groups;
}

function CalendarEmptyState({ kicker, children }) {
  return (
    <div className="calEmptyState">
      <span className="calEmptyStateKicker">{kicker}</span>
      <p>{children}</p>
    </div>
  );
}

function AgendaView({
  groups,
  today,
  selectedDay,
  clientDisplayByName,
  onSelectOccurrence,
}) {
  if (groups.length === 0) {
    return (
      <div className="calAgendaEmpty">
        <CalendarEmptyState kicker="Agenda clear">
          No upcoming events in the next 30 days.
        </CalendarEmptyState>
      </div>
    );
  }

  return (
    <div className="calAgenda" aria-label="Upcoming calendar agenda">
      {groups.map((group) => (
        <section key={group.dateKey} className="calAgendaGroup">
          <div className="calAgendaDate">
            <span>{getAgendaDateLabel(group.dateKey, today)}</span>
            <small>{group.dateKey}</small>
          </div>

          <div className="calAgendaItems">
            {group.items.map(({ event, dateKey }) => {
              const clientRecord = event.client
                ? clientDisplayByName?.get(event.client.toLowerCase())
                : null;
              const accentColor = clientRecord?.accentColor || null;
              const recurrenceLabel =
                event.recurrence?.rule && event.recurrence.rule !== "none"
                  ? formatRecurrenceLabel(event.recurrence)
                  : null;
              const isWorkingAway = isWorkingAwayEvent(event);
              const categoryKey = getCalendarCategoryKey(event.category);
              const isDayMarker = isCalendarDayMarkerEvent(event);
              const categoryLabel = getCalendarCategoryLabel(event.category);
              const isSelected = selectedDay === dateKey;

              return (
                <button
                  key={`${event.id}-${dateKey}`}
                  type="button"
                  className={[
                    "calAgendaItem",
                    event.priority ? "calAgendaItem--priority" : "",
                    isWorkingAway ? "calAgendaItem--workingAway" : "",
                    categoryKey === "petsitting" ? "calAgendaItem--petsitting" : "",
                    isSelected ? "calAgendaItem--selected" : "",
                  ].filter(Boolean).join(" ")}
                  style={accentColor ? { "--event-color": accentColor } : undefined}
                  onClick={() => onSelectOccurrence(dateKey)}
                >
                  <span className="calAgendaItemTitle">{event.title}</span>

                  {(event.category || event.client || recurrenceLabel || event.priority) && (
                    <span className="calAgendaItemMeta">
                      {event.priority && (
                        <span className="calAgendaMetaPill calAgendaPriority">
                          Priority
                        </span>
                      )}
                      {event.category && (
                        <span
                          className={[
                            "calAgendaMetaPill",
                            isDayMarker ? "calAgendaMetaPill--dayMarker" : "",
                            isWorkingAway ? "calAgendaMetaPill--workingAway" : "",
                            categoryKey === "petsitting" ? "calAgendaMetaPill--petsitting" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          {categoryLabel}
                        </span>
                      )}
                      {event.client && (
                        <span className="calAgendaMetaPill calAgendaClient">
                          {event.client}
                        </span>
                      )}
                      {recurrenceLabel && (
                        <span className="calAgendaMetaPill">{recurrenceLabel}</span>
                      )}
                    </span>
                  )}

                  {event.notes && (
                    <span className="calAgendaNotes">{event.notes}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function DayDetail({
  dateKey,
  events,
  clientDisplayByName,
  onEdit,
  onDelete,
  onSkip,
  onAddForDate,
  onCreateTask,
}) {
  if (!dateKey) {
    return (
      <div className="calDayDetail calDayDetail--empty">
        <CalendarEmptyState kicker="Calendar detail">
          Select a day to review events.
        </CalendarEmptyState>
      </div>
    );
  }

  const [y, m, d] = dateKey.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const formatted = dateObj.toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekday = dateObj.toLocaleDateString("en-ZA", { weekday: "long" });
  const monthDay = dateObj.toLocaleDateString("en-ZA", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="calDayDetail">
      <div className="calDayDetailHeader">
        <div className="calDayDetailDateBlock">
          <span className="calDayDetailKicker">{weekday}</span>
          <span className="calDayDetailDate">{monthDay}</span>
          <span className="calDayDetailYear">{dateObj.getFullYear()}</span>
        </div>
        <button
          type="button"
          className="primaryButton calAddForDateBtn"
          onClick={() => onAddForDate(dateKey)}
          aria-label={`Add event for ${formatted}`}
        >
          + Add event
        </button>
      </div>

      {events.length === 0 ? (
        <CalendarEmptyState kicker="Open day">
          No events on this day.
        </CalendarEmptyState>
      ) : (
        <ul className="calDayEventList">
          {events.map((event) => {
            const clientRecord = event.client
              ? clientDisplayByName?.get(event.client.toLowerCase())
              : null;
            const accentColor = clientRecord?.accentColor || null;
            const recurrenceLabel =
              event.recurrence?.rule && event.recurrence.rule !== "none"
                ? formatRecurrenceLabel(event.recurrence)
                : null;
            const isWorkingAway = isWorkingAwayEvent(event);
            const categoryKey = getCalendarCategoryKey(event.category);
            const isDayMarker = isCalendarDayMarkerEvent(event);
            const categoryLabel = getCalendarCategoryLabel(event.category);

            return (
              <li
                key={`${event.id}-${dateKey}`}
                className={[
                  "calDayEventCard",
                  event.priority ? "calDayEventCard--priority" : "",
                  isWorkingAway ? "calDayEventCard--workingAway" : "",
                  categoryKey === "petsitting" ? "calDayEventCard--petsitting" : "",
                ].filter(Boolean).join(" ")}
                style={accentColor ? { "--event-color": accentColor } : undefined}
              >
                <div className="calDayEventTop">
                  <span className="calDayEventTitle">{event.title}</span>
                  {event.priority && (
                    <span className="calDayEventPriority">Priority</span>
                  )}
                </div>

                {(event.category || event.client || recurrenceLabel) && (
                  <div className="calDayEventMeta" aria-label="Event metadata">
                    {event.category && (
                      <span
                        className={[
                          "calDayEventMetaPill",
                          isDayMarker ? "calDayEventMetaPill--dayMarker" : "",
                          isWorkingAway ? "calDayEventMetaPill--workingAway" : "",
                          categoryKey === "petsitting" ? "calDayEventMetaPill--petsitting" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        {categoryLabel}
                      </span>
                    )}
                    {event.client && (
                      <span className="calDayEventMetaPill calDayEventClient">
                        {event.client}
                      </span>
                    )}
                    {recurrenceLabel && (
                      <span className="calDayEventMetaPill">
                        {recurrenceLabel}
                      </span>
                    )}
                  </div>
                )}

                {event.notes && (
                  <p className="calDayEventNotes">{event.notes}</p>
                )}

                <div className="calDayEventActions">
                  <button
                    type="button"
                    className="primaryButton calDayEventAction"
                    onClick={() => onCreateTask?.(event, dateKey)}
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    className="detailsButton calDayEventAction"
                    onClick={() => onEdit(event.id)}
                  >
                    Edit
                  </button>
                  {recurrenceLabel && (
                    <button
                      type="button"
                      className="secondaryButton calDayEventAction"
                      onClick={() => onSkip(event.id, dateKey)}
                    >
                      Skip date
                    </button>
                  )}
                  <button
                    type="button"
                    className="deleteButton calDayEventAction"
                    onClick={() => onDelete(event.id)}
                  >
                    Delete series
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function CalendarView({
  calendarEvents,
  clientNames,
  clientDisplayByName,
  taskTypes,
  formMode,
  eventDraft,
  onOpenAddForm,
  onOpenEditForm,
  onCancelForm,
  onFieldChange,
  onSaveEvent,
  onDeleteEvent,
  onSkipOccurrence,
  onCreateTaskFromEvent,
}) {
  const today = toDateKey(new Date());
  const todayParts = today.split("-").map(Number);

  const [viewYear, setViewYear] = useState(todayParts[0]);
  const [viewMonth, setViewMonth] = useState(todayParts[1]);
  const [selectedDay, setSelectedDay] = useState(today);
  const [calendarViewMode, setCalendarViewMode] = useState("month");

  const occurrencesByDay = useMemo(
    () => getOccurrencesByDay(calendarEvents, viewYear, viewMonth),
    [calendarEvents, viewYear, viewMonth]
  );

  const cells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const agendaGroups = useMemo(
    () => groupAgendaOccurrences(getUpcomingEvents(calendarEvents, today, 30)),
    [calendarEvents, today]
  );

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToday() {
    setViewYear(todayParts[0]);
    setViewMonth(todayParts[1]);
    setSelectedDay(today);
  }

  function selectOccurrenceDate(dateKey) {
    const [y, m] = dateKey.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m);
    setSelectedDay(dateKey);
  }

  const selectedEvents = selectedDay ? (occurrencesByDay[selectedDay] || []) : [];
  const showForm = formMode === "add" || formMode === "edit";

  return (
    <div className="viewShell calendarView">
      <section className="panel calendarGridPanel">
        <div className="calMonthHeader">
          <div className="calMonthTitleBlock">
            <span className="calMonthKicker">Month plan</span>
            <h2 className="calMonthTitle">
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </h2>
          </div>
          <div className="calMonthNav" aria-label="Calendar month navigation">
            <button type="button" className="calNavBtn" onClick={prevMonth} aria-label="Previous month">{"<"}</button>
            <button type="button" className="calTodayBtn" onClick={goToday}>Today</button>
            <button type="button" className="calNavBtn" onClick={nextMonth} aria-label="Next month">{">"}</button>
          </div>
          <div className="calViewToggle" aria-label="Calendar view">
            <button
              type="button"
              className={calendarViewMode === "month" ? "active" : ""}
              onClick={() => setCalendarViewMode("month")}
            >
              Month
            </button>
            <button
              type="button"
              className={calendarViewMode === "agenda" ? "active" : ""}
              onClick={() => setCalendarViewMode("agenda")}
            >
              Agenda
            </button>
          </div>
        </div>

        {calendarViewMode === "month" ? (
          <div className="calGrid">
            <div className="calWeekdayRow">
              {DAY_HEADERS.map((h) => (
                <div key={h} className="calDayHeader">{h}</div>
              ))}
            </div>

            <div className="calCellsGrid">
              {cells.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="calCell calCell--empty" />;
                }

                const key = toDateKey(date);
                const dayNum = date.getDate();
                const isToday = key === today;
                const isSelected = key === selectedDay;
                const dayEvents = occurrencesByDay[key] || [];
                const dayMarkerEvents = dayEvents.filter(isCalendarDayMarkerEvent);
                const normalEvents = dayEvents.filter((event) => !isCalendarDayMarkerEvent(event));
                const dayMarkerEvent = dayMarkerEvents[0] || null;
                const dayMarkerKey = getCalendarCategoryKey(dayMarkerEvent?.category);
                const hasDayMarker = Boolean(dayMarkerEvent);
                const dayMarkerTitle = dayMarkerEvents
                  .map((event) => event.title)
                  .filter(Boolean)
                  .join(", ");
                const dayMarkerLabel = getCalendarCategoryLabel(dayMarkerEvent?.category);
                const dayMarkerTooltip = dayMarkerEvents
                  .map((event) => {
                    const label = getCalendarCategoryLabel(event.category);
                    return event.title ? `${label}: ${event.title}` : label;
                  })
                  .join("\n");
                const normalEventLimit = 3;

                return (
                  <div
                    key={key}
                    className={[
                      "calCell",
                      isToday ? "calCell--today" : "",
                      isSelected ? "calCell--selected" : "",
                      dayEvents.length > 0 ? "calCell--hasEvents" : "",
                      hasDayMarker ? "calCell--dayMarker" : "",
                      dayMarkerKey === "working-away" ? "calCell--workingAway" : "",
                      dayMarkerKey === "petsitting" ? "calCell--petsitting" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedDay(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedDay(key)}
                    aria-label={`${key}${isToday ? " (today)" : ""}${dayEvents.length > 0 ? `, ${dayEvents.length} event${dayEvents.length > 1 ? "s" : ""}` : ""}`}
                  >
                    <span className="calCellDay">{dayNum}</span>
                    {hasDayMarker && (
                      <span
                        className={[
                          "calDayContextFlag",
                          dayMarkerKey === "working-away"
                            ? "calDayContextFlag--workingAway"
                            : "",
                          dayMarkerKey === "petsitting"
                            ? "calDayContextFlag--petsitting"
                            : "",
                        ].filter(Boolean).join(" ")}
                        title={dayMarkerTooltip}
                        aria-label={dayMarkerTooltip}
                      >
                        {dayMarkerEvents.length > 1 ? dayMarkerEvents.length : ""}
                      </span>
                    )}
                    <div className="calCellEvents">
                      {hasDayMarker && (
                        <span className="calDayContextSr">
                          {dayMarkerLabel}
                          {dayMarkerTitle ? `: ${dayMarkerTitle}` : ""}
                        </span>
                      )}
                      {normalEvents.slice(0, normalEventLimit).map((ev) => {
                        const clientRecord = ev.client
                          ? clientDisplayByName?.get(ev.client.toLowerCase())
                          : null;
                        const accentColor = clientRecord?.accentColor || null;
                        return (
                          <div
                            key={ev.id}
                            className={`calEventChip${ev.priority ? " calEventChip--priority" : ""}`}
                            style={accentColor ? { "--chip-color": accentColor } : undefined}
                            title={ev.title}
                          >
                            <span className="calEventChipTitle">{ev.title}</span>
                          </div>
                        );
                      })}
                      {normalEvents.length > normalEventLimit && (
                        <div className="calMoreChip">
                          +{normalEvents.length - normalEventLimit} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <AgendaView
            groups={agendaGroups}
            today={today}
            selectedDay={selectedDay}
            clientDisplayByName={clientDisplayByName}
            onSelectOccurrence={selectOccurrenceDate}
          />
        )}
      </section>

      <aside className="panel calendarSidePanel">
        {showForm ? (
          <CalendarEventForm
            draft={eventDraft}
            formMode={formMode}
            clientNames={clientNames}
            taskTypes={taskTypes}
            onFieldChange={onFieldChange}
            onSave={onSaveEvent}
            onCancel={onCancelForm}
          />
        ) : (
          <DayDetail
            dateKey={selectedDay}
            events={selectedEvents}
            clientDisplayByName={clientDisplayByName}
            onEdit={onOpenEditForm}
            onDelete={onDeleteEvent}
            onSkip={onSkipOccurrence}
            onAddForDate={onOpenAddForm}
            onCreateTask={onCreateTaskFromEvent}
          />
        )}
      </aside>
    </div>
  );
}
