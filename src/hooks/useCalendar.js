import { useState } from "react";

function blankDraft(defaultDate) {
  return {
    title: "",
    category: "",
    client: "",
    taskType: "",
    date: defaultDate || "",
    notes: "",
    priority: false,
    recurrenceRule: "none",
    dayOfMonth: "",
    nth: "1",
    weekday: "1",
    until: "",
  };
}

function draftToEvent(draft, existingId) {
  const id = existingId || crypto.randomUUID();

  const base = {
    id,
    title: draft.title.trim(),
    category: draft.category.trim(),
    client: draft.client,
    taskType: draft.taskType || null,
    date: draft.date,
    notes: draft.notes.trim(),
    priority: Boolean(draft.priority),
  };

  if (draft.recurrenceRule === "none" || !draft.recurrenceRule) {
    return { ...base, recurrence: { rule: "none" } };
  }

  const recurrence = { rule: draft.recurrenceRule };

  if (draft.until) {
    recurrence.until = draft.until;
  }

  if (draft.recurrenceRule === "monthly-date") {
    const dom = parseInt(draft.dayOfMonth, 10);
    if (!isNaN(dom) && dom >= 1 && dom <= 31) {
      recurrence.dayOfMonth = dom;
    }
  }

  if (draft.recurrenceRule === "monthly-nth-weekday") {
    const nth = parseInt(draft.nth, 10);
    const weekday = parseInt(draft.weekday, 10);
    if (!isNaN(nth) && !isNaN(weekday)) {
      recurrence.nth = nth;
      recurrence.weekday = weekday;
    }
  }

  return { ...base, recurrence };
}

function eventToDraft(event) {
  const r = event.recurrence;
  return {
    title: event.title || "",
    category: event.category || "",
    client: event.client || "",
    taskType: event.taskType || "",
    date: event.date || "",
    notes: event.notes || "",
    priority: Boolean(event.priority),
    recurrenceRule: r?.rule || "none",
    dayOfMonth: r?.dayOfMonth != null ? String(r.dayOfMonth) : "",
    nth: r?.nth != null ? String(r.nth) : "1",
    weekday: r?.weekday != null ? String(r.weekday) : "1",
    until: r?.until || "",
  };
}

export function useCalendar({ calendarEvents, setCalendarEvents, openConfirmDialog }) {
  const [formMode, setFormMode] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventDraft, setEventDraft] = useState(null);

  function openAddForm(defaultDate) {
    setFormMode("add");
    setEditingEventId(null);
    setEventDraft(blankDraft(defaultDate || ""));
  }

  function openEditForm(eventId) {
    const event = calendarEvents.find((e) => e.id === eventId);
    if (!event) return;
    setFormMode("edit");
    setEditingEventId(eventId);
    setEventDraft(eventToDraft(event));
  }

  function cancelForm() {
    setFormMode(null);
    setEditingEventId(null);
    setEventDraft(null);
  }

  function updateEventDraft(field, value) {
    setEventDraft((prev) => {
      const nextDraft = { ...prev, [field]: value };

      if (
        field === "category" &&
        value?.toLowerCase() === "appointment" &&
        !prev.taskType
      ) {
        nextDraft.taskType = "Meeting / Call";
      }

      return nextDraft;
    });
  }

  function saveEvent(e) {
    e.preventDefault();
    if (!eventDraft?.title?.trim() || !eventDraft?.date) return;

    if (formMode === "add") {
      const newEvent = draftToEvent(eventDraft, null);
      setCalendarEvents((prev) => [...prev, newEvent]);
    } else if (formMode === "edit" && editingEventId) {
      setCalendarEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEventId ? draftToEvent(eventDraft, editingEventId) : ev
        )
      );
    }

    cancelForm();
  }

  function deleteEvent(id) {
    openConfirmDialog({
      title: "Delete event?",
      message: "This will remove the event and all its occurrences.",
      confirmLabel: "Delete",
      onConfirm: () => {
        setCalendarEvents((prev) => prev.filter((ev) => ev.id !== id));
        if (editingEventId === id) cancelForm();
      },
    });
  }

  function skipOccurrence(id, dateKey) {
    setCalendarEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== id) return ev;
        const exceptions = Array.isArray(ev.recurrence?.exceptions)
          ? [...ev.recurrence.exceptions]
          : [];
        if (!exceptions.includes(dateKey)) exceptions.push(dateKey);
        return {
          ...ev,
          recurrence: { ...(ev.recurrence ?? { rule: "none" }), exceptions },
        };
      })
    );
  }

  return {
    formMode,
    editingEventId,
    eventDraft,
    openAddForm,
    openEditForm,
    cancelForm,
    updateEventDraft,
    saveEvent,
    deleteEvent,
    skipOccurrence,
  };
}
