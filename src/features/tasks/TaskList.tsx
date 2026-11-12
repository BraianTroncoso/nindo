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

  const left = tasks.filter((t) => !t.done).length;

  return (
    <section className="tasks" aria-label="Today's tasks">
      <header className="panel__head">
        <h2>Today</h2>
        <span className="panel__meta">{tasks.length === 0 ? "" : left ? `${left} left` : "all done"}</span>
      </header>

      <form
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

      <ul className="list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="task"
            data-done={task.done ? "" : undefined}
            data-active={task.id === activeTaskId ? "" : undefined}
          >
            <button
              type="button"
              className="task__box"
              onClick={() => toggleTask(task.id)}
              aria-pressed={task.done}
              aria-label={task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`}
            />

            <button
              type="button"
              className="task__name"
              onClick={() => {
                focusTask(task.id);
                startTimer();
              }}
              title="Aim the timer at this and start"
            >
              {task.title}
            </button>

            {task.pomodoros > 0 ? (
              <span className="task__count" title={`${task.pomodoros} focus sessions`}>
                {task.pomodoros}
              </span>
            ) : null}

            <button
              type="button"
              className="task__x"
              onClick={() => removeTask(task.id)}
              aria-label={`Remove ${task.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {tasks.length === 0 ? (
        <p className="note">
          Today only. Whatever you write here is gone tomorrow — that is the point.
        </p>
      ) : (
        <p className="note note--quiet">Click a task to aim the timer at it.</p>
      )}
    </section>
  );
}
