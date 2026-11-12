"use client";

import { useEffect, useState } from "react";
import { useNindo } from "@/store/useNindo";

export function TaskList() {
  const tasks = useNindo((s) => s.tasks.tasks);
  const activeTaskId = useNindo((s) => s.tasks.activeTaskId);
  const addTask = useNindo((s) => s.addTask);
  const toggleTask = useNindo((s) => s.toggleTask);
  const removeTask = useNindo((s) => s.removeTask);
  const focusTask = useNindo((s) => s.focusTask);
  const startTimer = useNindo((s) => s.startTimer);
  const rollDay = useNindo((s) => s.rollDay);

  const [draft, setDraft] = useState("");

  // The day can turn over while the app sits open overnight.
  useEffect(() => {
    rollDay();
    const onVisible = () => {
      if (document.visibilityState === "visible") rollDay();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(rollDay, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [rollDay]);

  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <aside className="tasks" aria-label="Today's tasks">
      <header className="tasks__head">
        <h2>Today</h2>
        <span className="tasks__count">{remaining ? `${remaining} left` : "clear"}</span>
      </header>

      <form
        className="tasks__form"
        onSubmit={(e) => {
          e.preventDefault();
          addTask(draft);
          setDraft("");
        }}
      >
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="what are you working on?"
          maxLength={120}
          aria-label="New task"
        />
      </form>

      <ul className="tasks__list">
        {tasks.map((task) => (
          <li key={task.id} className="task" data-done={task.done ? "" : undefined} data-active={task.id === activeTaskId ? "" : undefined}>
            <button
              type="button"
              className="task__check"
              onClick={() => toggleTask(task.id)}
              aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
            >
              {task.done ? "✓" : ""}
            </button>

            <span className="task__title">{task.title}</span>

            {task.pomodoros > 0 ? (
              <span className="task__pomodoros" title={`${task.pomodoros} focus sessions`}>
                {"●".repeat(Math.min(task.pomodoros, 5))}
                {task.pomodoros > 5 ? `+${task.pomodoros - 5}` : ""}
              </span>
            ) : null}

            <button
              type="button"
              className="task__aim"
              onClick={() => {
                focusTask(task.id);
                startTimer();
              }}
              title="Point the timer at this and start"
            >
              aim
            </button>

            <button
              type="button"
              className="task__remove"
              onClick={() => removeTask(task.id)}
              aria-label={`Remove ${task.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {tasks.length === 0 ? (
        <p className="tasks__empty">
          Today only. Tomorrow this list starts empty again.
        </p>
      ) : null}
    </aside>
  );
}
