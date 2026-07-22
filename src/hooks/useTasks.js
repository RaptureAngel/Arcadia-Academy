import { useEffect, useState } from "react";
import { clients } from "../data/clients";
import { taskTypes } from "../data/taskTypes";
import { getTodayKey } from "../utils/dates";
import { getRegularTaskAwardXp, getTaskXpRule } from "../utils/xp";
import {
  isRegularTask,
  getBaseTimerSeconds,
  pauseRunningRegularTaskTimers,
  pauseRunningTaskTimer,
} from "../utils/tasks";

const DEFAULT_TASK_TYPE = taskTypes[0];
const APPOINTMENT_TASK_TYPE = "Meeting / Call";

function getTaskTypeForCalendarEvent(event) {
  const category = String(event?.category || "").trim().toLowerCase();

  if (category === "working-away") {
    return DEFAULT_TASK_TYPE;
  }

  if (category === "appointment" && taskTypes.includes(APPOINTMENT_TASK_TYPE)) {
    return APPOINTMENT_TASK_TYPE;
  }

  return DEFAULT_TASK_TYPE;
}

function buildTask({
  title,
  client,
  taskType,
  deadline = null,
  priority = false,
}) {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    client,
    taskType,
    xp: getTaskXpRule(taskType).fallbackXp,
    completed: false,
    completedBy: null,
    createdDate: getTodayKey(),
    completedDate: null,
    projectId: null,
    projectName: null,
    deadline: deadline || null,
    priority: Boolean(priority),
    timerTotalSeconds: 0,
    timerStartedAt: null,
  };
}

export function useTasks({
  tasks,
  setTasks,
  isWorking,
  activeEmployee,
  setCharacterLibrary,
  activeProjectStepTasks,
  completeProjectStep,
  clientNames,
  openConfirmDialog,
  deepWorkTaskId,
  setDeepWorkTaskId,
  preLunchTaskId,
  setPreLunchTaskId,
} = {}) {
  const [timerNow, setTimerNow] = useState(Date.now());

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editClient, setEditClient] = useState(clients[0]);
  const [editTaskType, setEditTaskType] = useState(DEFAULT_TASK_TYPE);
  const [editTaskDeadline, setEditTaskDeadline] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState(false);

  const [taskTitle, setTaskTitle] = useState("");
  const [client, setClient] = useState(clients[0]);
  const [taskType, setTaskType] = useState(DEFAULT_TASK_TYPE);
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState(false);

  const deepWorkTask = deepWorkTaskId
    ? tasks?.find(
        (task) =>
          task.id === deepWorkTaskId && !task.completed && isRegularTask(task)
      )
    : null;

  useEffect(() => {
    const hasRunningTimer = tasks?.some(
      (task) => isRegularTask(task) && task.timerStartedAt
    );

    if (!hasRunningTimer || !isWorking) return undefined;

    const timer = setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [tasks, isWorking]);

  useEffect(() => {
    const hasRunningTimer = tasks?.some(
      (task) => isRegularTask(task) && task.timerStartedAt
    );

    if (isWorking || !hasRunningTimer) return;

    setTasks((currentTasks) => pauseRunningRegularTaskTimers(currentTasks));
  }, [isWorking, tasks, setTasks]);

  useEffect(() => {
    if (clientNames?.length === 0) {
      if (client) setClient("");
      if (!editingTaskId && editClient) setEditClient("");
      return;
    }

    if (!client || !clientNames?.includes(client)) {
      setClient(clientNames?.[0] ?? "");
    }

    if (!editingTaskId && (!editClient || !clientNames?.includes(editClient))) {
      setEditClient(clientNames?.[0] ?? "");
    }
  }, [client, clientNames, editClient, editingTaskId]);

  function addTask(event) {
    event.preventDefault();

    if (!isWorking) return;
    if (!taskTitle.trim()) return;
    if (!client) return;

    const newTask = buildTask({
      title: taskTitle,
      client,
      taskType,
      deadline: taskDeadline,
      priority: taskPriority,
    });

    setTasks((currentTasks) => [newTask, ...currentTasks]);
    setTaskTitle("");
    setTaskDeadline("");
    setTaskPriority(false);
  }

  function createTaskFromCalendarEvent(event, occurrenceDate) {
    if (!event?.title?.trim()) return false;

    const taskClient = event.client || clientNames?.[0] || client;

    if (!taskClient) return false;

    const calendarTask = buildTask({
      title: event.title,
      client: taskClient,
      taskType:
        String(event.category || "").trim().toLowerCase() !== "working-away" &&
        event.taskType &&
        taskTypes.includes(event.taskType)
          ? event.taskType
          : getTaskTypeForCalendarEvent(event),
      deadline: occurrenceDate,
      priority: event.priority,
    });

    setTasks((currentTasks) => [calendarTask, ...currentTasks]);
    return true;
  }

  function handleTaskTypeChange(event) {
    setTaskType(event.target.value);
  }

  function cancelEditTask() {
    setEditingTaskId(null);
    setEditTaskTitle("");
    setEditClient(clientNames?.[0] || "");
    setEditTaskType(DEFAULT_TASK_TYPE);
    setEditTaskDeadline("");
    setEditTaskPriority(false);
  }

  function startEditTask(task) {
    if (!isWorking) return;
    if (task.completed || task.projectId || task.isProjectStep) return;

    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditClient(task.client);
    setEditTaskType(task.taskType);
    setEditTaskDeadline(task.deadline || "");
    setEditTaskPriority(Boolean(task.priority));
  }

  function saveEditedTask(event) {
    event.preventDefault();

    if (!editingTaskId) return;
    if (!isWorking) return;
    if (!editTaskTitle.trim()) return;
    if (!editClient) return;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title: editTaskTitle.trim(),
              client: editClient,
              taskType: editTaskType,
              xp: getTaskXpRule(editTaskType).fallbackXp,
              deadline: editTaskDeadline || null,
              priority: editTaskPriority,
            }
          : task
      )
    );

    cancelEditTask();
  }

  function startTaskTimer(taskId) {
    if (!isWorking) return;

    const startedAt = new Date().toISOString();

    setPreLunchTaskId(null);
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        const pausedTask = pauseRunningTaskTimer(task, startedAt);

        if (
          pausedTask.id !== taskId ||
          pausedTask.completed ||
          !isRegularTask(pausedTask)
        ) {
          return pausedTask;
        }

        return {
          ...pausedTask,
          timerTotalSeconds: getBaseTimerSeconds(pausedTask),
          timerStartedAt: startedAt,
        };
      })
    );
    setTimerNow(Date.now());
  }

  function pauseTaskTimer(taskId) {
    const pausedAt = new Date().toISOString();

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? pauseRunningTaskTimer(task, pausedAt) : task
      )
    );
    setTimerNow(Date.now());
  }

  function toggleTaskTimer(task) {
    if (!isWorking || task.completed || !isRegularTask(task)) return;

    if (task.timerStartedAt) {
      pauseTaskTimer(task.id);
      return;
    }

    startTaskTimer(task.id);
  }

  function openDeepWork(task) {
    if (!isWorking || task.completed || !isRegularTask(task)) return;

    startTaskTimer(task.id);
    setDeepWorkTaskId(task.id);
  }

  function pauseDeepWork() {
    if (!deepWorkTask) return;

    pauseTaskTimer(deepWorkTask.id);
  }

  function resumeDeepWork() {
    if (!deepWorkTask || !isWorking) return;

    startTaskTimer(deepWorkTask.id);
  }

  function handleDeepWorkTimerAction() {
    if (!deepWorkTask) return;

    if (deepWorkTask.timerStartedAt) {
      pauseDeepWork();
      return;
    }

    resumeDeepWork();
  }

  function completeDeepWork() {
    if (!deepWorkTask) return;

    const taskId = deepWorkTask.id;

    setDeepWorkTaskId(null);
    completeTask(taskId);
  }

  function completeTask(taskId) {
    if (!activeEmployee || !isWorking) return;

    const projectStepTask = activeProjectStepTasks?.find(
      (task) => task.id === taskId
    );

    if (projectStepTask) {
      completeProjectStep(projectStepTask.projectId);
      return;
    }

    const taskToComplete = tasks?.find((task) => task.id === taskId);

    if (!taskToComplete || taskToComplete.completed) return;

    if (editingTaskId === taskId) {
      cancelEditTask();
    }

    if (preLunchTaskId === taskId) {
      setPreLunchTaskId(null);
    }

    const completedAt = new Date().toISOString();
    const pausedTaskToComplete = pauseRunningTaskTimer(taskToComplete, completedAt);
    const awardedXp = getRegularTaskAwardXp(pausedTaskToComplete);

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? {
              ...pauseRunningTaskTimer(task, completedAt),
              xp: awardedXp,
              completed: true,
              completedBy: activeEmployee.id,
              completedDate: getTodayKey(),
            }
          : task
      )
    );

    setCharacterLibrary((currentEmployees) =>
      currentEmployees.map((employee) =>
        employee.id === activeEmployee.id
          ? { ...employee, xp: employee.xp + awardedXp }
          : employee
      )
    );
  }

  function deleteTask(taskId) {
    const taskToDelete = tasks?.find((task) => task.id === taskId);

    if (!taskToDelete) return;

    openConfirmDialog({
      title: "Delete Task",
      message: `Delete "${taskToDelete.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      isDangerous: true,
      onConfirm: () => {
        if (editingTaskId === taskId) {
          cancelEditTask();
        }

        setTasks((currentTasks) =>
          currentTasks.filter((task) => task.id !== taskId)
        );

        if (taskToDelete.completed && taskToDelete.completedBy) {
          setCharacterLibrary((currentEmployees) =>
            currentEmployees.map((employee) =>
              employee.id === taskToDelete.completedBy
                ? {
                    ...employee,
                    xp: Math.max(0, employee.xp - taskToDelete.xp),
                  }
                : employee
            )
          );
        }
      },
    });
  }

  return {
    timerNow,
    editingTaskId,
    setEditingTaskId,
    editTaskTitle,
    setEditTaskTitle,
    editClient,
    setEditClient,
    editTaskType,
    setEditTaskType,
    editTaskDeadline,
    setEditTaskDeadline,
    editTaskPriority,
    setEditTaskPriority,
    taskTitle,
    setTaskTitle,
    client,
    setClient,
    taskType,
    setTaskType,
    taskDeadline,
    setTaskDeadline,
    taskPriority,
    setTaskPriority,
    deepWorkTask,
    addTask,
    createTaskFromCalendarEvent,
    handleTaskTypeChange,
    cancelEditTask,
    startEditTask,
    saveEditedTask,
    startTaskTimer,
    pauseTaskTimer,
    toggleTaskTimer,
    openDeepWork,
    pauseDeepWork,
    resumeDeepWork,
    handleDeepWorkTimerAction,
    completeDeepWork,
    completeTask,
    deleteTask,
  };
}
