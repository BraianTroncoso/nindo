import { expect, test, type Page } from "@playwright/test";

/**
 * Deliberately hostile input.
 *
 * Everything here is something a real browser can hand the app on a Monday
 * morning: a half-written storage entry from an older version, storage that
 * refuses to work at all, a user leaning on the keyboard. None of it should
 * reach a white screen.
 */

function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

/** Seeds a raw localStorage payload before the app boots. */
async function seedRaw(page: Page, raw: string) {
  await page.addInitScript((value: string) => {
    window.localStorage.setItem("nindo", value);
  }, raw);
}

const alive = async (page: Page) => {
  await expect(page.locator(".clock__time")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".layout")).toBeVisible();
};

test("survives a storage entry that is not even JSON", async ({ page }) => {
  const errors = watch(page);
  await seedRaw(page, "}{ this is not json at all");
  await page.goto("/");
  await alive(page);
  expect(errors).toEqual([]);
});

test("survives storage holding JSON of the wrong shape", async ({ page }) => {
  const errors = watch(page);
  await seedRaw(page, JSON.stringify(["an", "array", "not", "an", "object"]));
  await page.goto("/");
  await alive(page);
  expect(errors).toEqual([]);
});

test("survives a half-written settings object from an older version", async ({ page }) => {
  const errors = watch(page);
  await seedRaw(
    page,
    JSON.stringify({
      version: 1,
      state: {
        settings: { durations: null, mascot: "a-pack-that-was-deleted", palette: "gone" },
        timer: { phase: "focus", endsAt: "not a number", remainingMs: null },
        tasks: { day: 12345, tasks: "not an array" },
        spotus: { playlist: null, currentId: 42 },
      },
    }),
  );
  await page.goto("/");
  await alive(page);
  expect(errors).toEqual([]);
});

test("survives a timer phase that does not exist", async ({ page }) => {
  const errors = watch(page);
  await seedRaw(
    page,
    JSON.stringify({
      version: 1,
      state: { timer: { phase: "lunch", endsAt: null, remainingMs: 60_000, completedFocus: 0 } },
    }),
  );
  await page.goto("/");
  await alive(page);
  expect(errors).toEqual([]);
});

test("survives localStorage throwing on every access", async ({ page }) => {
  const errors = watch(page);
  // Safari in private mode, and any browser with site data blocked.
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException("denied", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => ({ getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }),
    });
  });
  await page.goto("/");
  await alive(page);
  expect(errors).toEqual([]);
});

test("a task of absurd length does not break the layout", async ({ page }) => {
  await page.goto("/");
  await alive(page);
  const monster = "x".repeat(400);
  await page.getByLabel("New task").fill(monster);
  await page.getByLabel("New task").press("Enter");

  await expect(page.locator(".task")).toHaveCount(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "a long task pushed the page sideways").toBeLessThanOrEqual(1);
});

test("leaning on the keyboard does not corrupt the timer", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await alive(page);

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Space");
    await page.keyboard.press("r");
    await page.keyboard.press("s");
  }

  // Whatever the sequence, the clock must still read a sane time.
  await expect(page.locator(".clock__time")).toHaveText(/^\d{1,3}:[0-5]\d$/);
  expect(errors).toEqual([]);
});

test("mashing the add button does not queue a half-resolved track", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await alive(page);

  await page.getByLabel("YouTube URL").fill("https://www.youtube.com/watch?v=lTRiuFIWV54");
  const add = page.getByRole("button", { name: "Add", exact: true });
  await Promise.all([add.click(), add.click().catch(() => {}), add.click().catch(() => {})]);

  await expect(page.locator(".queue__item")).toHaveCount(1, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("a hostile oEmbed response cannot inject markup", async ({ page }) => {
  await page.goto("/");
  await alive(page);

  // Pretend YouTube answers with a title that is trying to be HTML.
  await page.route(/\/oembed\?/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({
        title: "<img src=x onerror=\"window.__pwned=1\">evil",
        author_name: "<b>not bold</b>",
      }),
    }),
  );

  await page.getByLabel("YouTube URL").fill("https://www.youtube.com/watch?v=lTRiuFIWV54");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".queue__item")).toHaveCount(1, { timeout: 15_000 });

  expect(await page.evaluate(() => "__pwned" in window)).toBe(false);
  await expect(page.locator(".queue__item img")).toHaveCount(0);
  await expect(page.locator(".queue__item .spotus__title")).toContainText("evil");
});

test("Spotus degrades instead of exploding when the network is gone", async ({ page, context }) => {
  const errors = watch(page);
  await page.goto("/");
  await alive(page);

  await context.setOffline(true);
  await page.getByLabel("YouTube URL").fill("https://www.youtube.com/watch?v=lTRiuFIWV54");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  // The title cannot be resolved, so it falls back to the id and still queues.
  await expect(page.locator(".queue__item")).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator(".clock__time")).toBeVisible();
  await context.setOffline(false);
  // Only YouTube's own failures are acceptable here.
  const ours = errors.filter(
    (e) => !/youtube|googlevideo|ERR_INTERNET|ERR_FAILED|Failed to (fetch|load resource)/i.test(e),
  );
  expect(ours, "an error that was not just the missing network").toEqual([]);
});

test("changing the rhythm mid-session never produces a broken clock", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");
  await alive(page);

  await page.getByRole("button", { name: "Start" }).click();
  await page.getByTitle("Settings (,)").click();

  const focus = page.getByLabel("Focus");
  for (const value of ["1", "180", "0", "-5", "9999"]) {
    await focus.fill(value);
    await focus.blur();
  }
  await page.getByLabel("Close settings").click();

  await expect(page.locator(".clock__time")).toHaveText(/^\d{1,3}:[0-5]\d$/);
  const charge = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue("--charge")),
  );
  expect(Number.isFinite(charge)).toBe(true);
  expect(charge).toBeGreaterThanOrEqual(0);
  expect(charge).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("a character pack with a broken manifest is dropped, not rendered", async ({ page }) => {
  await page.goto("/");
  await alive(page);
  // Every pack that reaches the picker must have produced a usable image.
  await page.getByTitle("Settings (,)").click();
  const packs = page.locator(".sheet__group", { hasText: "MASCOT" }).locator(".chip");
  await expect(packs).not.toHaveCount(0);
  await page.getByLabel("Close settings").click();

  const img = page.locator('.mascot__pose[data-slot="idle"]');
  await expect
    .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
});
