import { expect, test, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * What these cover, in the order a human would check them:
 *   1. the app boots with no console errors
 *   2. a task can be added and aimed at
 *   3. a focus session completes, credits the task and transforms the mascot
 *   4. the mascot can be switched off and the clock takes over
 *   5. a pasted YouTube link lands in the queue with its real title
 *   6. zen mode strips the screen down
 *
 * Screenshots land in e2e/.artifacts/ so the result can be eyeballed.
 */

const SHOT = (name: string) => ({ path: `e2e/.artifacts/${name}.png` });

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

/**
 * Seeds a running session whose deadline is `endsInMs` away.
 *
 * Durations are clamped to whole minutes by design (a 0-minute pomodoro is a
 * bug, not a feature), so a fast test cannot come from a tiny duration — it has
 * to come from a deadline, which is exactly how the real timer works anyway.
 */
async function seedRunningSession(page: Page, endsInMs: number, withTask = true) {
  await page.addInitScript(
    ({ endsIn, task }: { endsIn: number; task: boolean }) => {
      const now = Date.now();
      const d = new Date(now);
      const day = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;

      window.localStorage.setItem(
        "nindo",
        JSON.stringify({
          version: 1,
          state: {
            settings: {
              durations: { focus: 25, shortBreak: 5, longBreak: 15, longBreakEvery: 4 },
              soundEnabled: false,
              notificationsEnabled: false,
              mascot: "naruto",
              youtubeApiKey: "",
              showTasks: true,
              showPlayer: true,
              volume: 0.7,
            },
            timer: {
              phase: "focus",
              endsAt: now + endsIn,
              remainingMs: Math.max(0, endsIn),
              completedFocus: 0,
            },
            tasks: task
              ? {
                  day,
                  tasks: [
                    { id: "t1", title: "wire up the player", done: false, pomodoros: 0 },
                  ],
                  activeTaskId: "t1",
                }
              : { day, tasks: [], activeTaskId: null },
            spotus: { playlist: [], currentId: null, playing: false },
          },
        }),
      );
    },
    { endsIn: endsInMs, task: withTask },
  );
}

test("boots clean and shows the mascot, the clock and today's list", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");

  await expect(page.locator(".brand__name")).toHaveText("nindo");
  await expect(page.locator(".clock__time")).toHaveText("25:00");
  await expect(page.locator(".clock__phase")).toHaveText("focus");
  await expect(page.locator(".tasks h2")).toHaveText("Today");

  const idle = page.locator('.mascot__pose[data-slot="idle"]');
  await expect(idle).toBeVisible();
  // The art must actually decode, not 404 into an empty box.
  await expect
    .poll(() => idle.evaluate((img) => (img as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  await page.screenshot(SHOT("01-boot"));
  expect(errors).toEqual([]);
});

test("a task can be aimed at, and finishing a session credits it", async ({ page }) => {
  const errors = watchConsole(page);
  await seedRunningSession(page, 2500);
  await page.goto("/");

  await expect(page.locator(".task__title")).toHaveText("wire up the player");
  await expect(page.locator(".clock__task")).toContainText("wire up the player");
  await expect(page.locator(".task[data-active]")).toBeVisible();

  // Charging: the aura opacity is driven by --charge, which is near 1 by now.
  await page.waitForTimeout(1200);
  await page.screenshot(SHOT("02-charging"));

  // The transformation fires when the deadline passes.
  await expect(page.locator('.mascot[data-state="transforming"]')).toBeVisible({ timeout: 5000 });
  await page.screenshot(SHOT("03-transforming"));

  await expect(page.locator('.mascot[data-state="active"]')).toBeVisible({ timeout: 5000 });
  const active = page.locator('.mascot__pose[data-slot="active"]');
  await expect(active).toHaveCSS("opacity", "1");
  await page.screenshot(SHOT("04-sage-mode"));

  // The session is credited to the task and the break is queued.
  await expect(page.locator(".task__pomodoros")).toHaveText("●");
  await expect(page.locator(".clock__phase")).toHaveText("short break");
  await expect(page.locator(".cycle__count")).toHaveText("1 today");

  expect(errors).toEqual([]);
});

test("the timer survives a deadline that passed while the tab was away", async ({ page }) => {
  // A session that ended eight hours ago, as if the laptop had been suspended.
  await seedRunningSession(page, -8 * 60 * 60 * 1000);
  await page.goto("/");

  // Exactly one completion is reported, not eight hours' worth of cycles.
  await expect(page.locator(".clock__phase")).toHaveText("short break");
  await expect(page.locator(".cycle__count")).toHaveText("1 today");
  await expect(page.locator(".clock__time")).toHaveText("5:00");
});

test("the mascot can be switched off and the clock takes the centre", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Settings (,)").click();
  await page.getByRole("button", { name: "none", exact: true }).click();
  await page.getByLabel("Close settings").click();

  await expect(page.locator(".mascot")).toHaveCount(0);
  await expect(page.locator('.stage[data-mascot="off"]')).toBeVisible();
  await expect(page.locator(".clock__time")).toBeVisible();
  await page.screenshot(SHOT("05-no-mascot"));
});

test("switching packs swaps the art without touching code", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Settings (,)").click();
  await page.getByRole("button", { name: "Ember" }).click();
  await page.getByLabel("Close settings").click();

  await expect(page.locator('.mascot__pose[data-slot="idle"]')).toHaveAttribute(
    "src",
    "/characters/ember/meditating.svg",
  );
  await page.screenshot(SHOT("06-ember-pack"));
});

test("a pasted YouTube link resolves its real title with no API key", async ({ page }) => {
  const errors = watchConsole(page);
  await page.goto("/");

  await page
    .getByLabel("YouTube URL")
    .fill("https://www.youtube.com/watch?v=jfKfPfyJRdk");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // oEmbed is keyless and CORS-enabled, so the title arrives client-side.
  const title = page.locator(".queue__item .spotus__title").first();
  await expect(title).toBeVisible({ timeout: 15_000 });
  await expect(title).not.toHaveText("jfKfPfyJRdk", { timeout: 15_000 });
  await page.screenshot(SHOT("07-spotus-queue"));

  expect(errors.filter((e) => !/youtube|googlevideo|doubleclick/i.test(e))).toEqual([]);
});

test("junk input is rejected with an explanation", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("YouTube URL").fill("https://vimeo.com/123456");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".spotus__message")).toContainText("not a YouTube link");
  await expect(page.locator(".queue__item")).toHaveCount(0);
});

test("zen mode strips everything but the mascot and the clock", async ({ page }) => {
  await page.goto("/");
  await page.getByTitle("Zen mode (F)").click();

  await expect(page.locator(".shell[data-zen]")).toBeVisible();
  await expect(page.locator(".tasks")).toBeHidden();
  await expect(page.locator(".spotus")).toBeHidden();
  await expect(page.locator(".clock__time")).toBeVisible();
  await page.screenshot(SHOT("08-zen"));
});

test("today's tasks are wiped when the calendar day changes", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("New task").fill("yesterday's leftovers");
  await page.getByLabel("New task").press("Enter");
  await expect(page.locator(".task")).toHaveCount(1);

  // Backdate the stored day, as if the app were reopened tomorrow.
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("nindo");
    if (!raw) throw new Error("store not persisted");
    const parsed = JSON.parse(raw);
    parsed.state.tasks.day = "2020-01-01";
    window.localStorage.setItem("nindo", JSON.stringify(parsed));
  });
  await page.reload();

  await expect(page.locator(".task")).toHaveCount(0);
  await expect(page.locator(".tasks__empty")).toBeVisible();
});

test("the app shell works offline once installed", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.locator(".clock__time")).toBeVisible();
  // Give the worker a moment to precache the shell.
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();

  await expect(page.locator(".clock__time")).toBeVisible();
  await expect(page.locator('.mascot__pose[data-slot="idle"]')).toBeVisible();
  await page.screenshot(SHOT("09-offline"));
  await context.setOffline(false);
});

test("the mascot is actually alive, not a still frame", async ({ page }) => {
  await page.goto("/");
  const mascot = page.locator(".mascot__poses");
  await expect(mascot).toBeVisible();
  // Give the animated WebP a moment to start decoding.
  await page.waitForTimeout(400);

  // Two shots of the same element, far enough apart to cross frames of the loop.
  const shots: Buffer[] = [];
  for (let i = 0; i < 4; i++) {
    shots.push(await mascot.screenshot());
    await page.waitForTimeout(230);
  }

  const allIdentical = shots.every((shot) => shot.equals(shots[0]));
  expect(allIdentical, "the idle pose never changed — it is a still image").toBe(false);
});

test("the layout holds up from a wide monitor down to a phone", async ({ page }) => {
  await seedRunningSession(page, 60_000);
  await page.goto("/");

  for (const [name, width, height] of [
    ["wide", 1680, 1050],
    ["laptop", 1280, 800],
    ["tablet", 900, 1000],
    ["phone", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);

    // Nothing may overflow horizontally at any width — the classic responsive bug.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${name}`).toBeLessThanOrEqual(1);

    await expect(page.locator(".clock__time")).toBeVisible();
    await expect(page.locator(".mascot")).toBeVisible();
    await page.screenshot({ path: `e2e/.artifacts/11-${name}.png`, fullPage: width < 1000 });
  }
});
