const { test, expect } = require("@playwright/test");

async function brushLeaf(page) {
  const leaves = page.locator(".botanical-background__plant").first().locator("[data-botanical-leaf]");
  const index = await leaves.evaluateAll((elements) =>
    elements.findIndex((element) => {
      const box = element.getBoundingClientRect();
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      return x > 5 && x < innerWidth - 5 && y > 85 && y < innerHeight - 5;
    })
  );
  expect(index, "a leaf lies inside the viewport below the fixed navigation").toBeGreaterThanOrEqual(0);
  const leaf = leaves.nth(index);
  const box = await leaf.boundingBox();
  await page.mouse.move(Math.max(1, box.x + box.width / 2), box.y + box.height / 2);
  return leaf;
}

test.describe("botanical background", () => {
  test("rustles locally, settles and preserves content interaction", async ({ page }) => {
    await page.goto("/ja/");
    const background = page.locator("[data-botanical-background]");
    await expect(background).toHaveAttribute("aria-hidden", "true");
    await expect(background).toHaveCSS("pointer-events", "none");
    await expect(background).not.toHaveCSS("mask-image", "none");
    const leaf = await brushLeaf(page);
    await expect.poll(() => leaf.getAttribute("transform")).toMatch(/rotate\((?!0(?:\.0+)? )[-\d.]+ /);
    const distantLeaf = page.locator(".botanical-background__plant").nth(1).locator("[data-botanical-leaf]").first();
    await expect(distantLeaf).toHaveAttribute("transform", /rotate\(0(?:\.0+)? /);
    await expect(leaf).not.toHaveAttribute("transform", /.+/, { timeout: 8500 });

    await page.mouse.move(720, 400);
    await expect(leaf).not.toHaveAttribute("transform", /.+/);
    const link = page.locator('[role="main"] a[href]').first();
    await expect(link).toBeVisible();
    await link.click({ trial: true });
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
  });

  test("respects reduced motion immediately, including changes during a breeze", async ({ page }) => {
    await page.goto("/ja/");
    const leaf = await brushLeaf(page);
    await expect(leaf).toHaveAttribute("transform", /rotate/);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(leaf).not.toHaveAttribute("transform", /.+/);
    await brushLeaf(page);
    await expect(leaf).not.toHaveAttribute("transform", /.+/);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.mouse.move(10, 150);
    await brushLeaf(page);
    await expect(leaf).toHaveAttribute("transform", /rotate/);
  });

  test("reveals final positions without an entrance transition on a slow load", async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/botanical-background.js*", async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto("/ja/", { waitUntil: "commit" });
    const background = page.locator("[data-botanical-background]");
    await expect(background).toBeAttached();
    await expect(background).toHaveCSS("visibility", "hidden");
    release();
    await expect(background).toBeVisible();
    const plant = background.locator("svg").first();
    const initialBox = await plant.boundingBox();
    await page.evaluate(() => document.documentElement.classList.add("transition"));
    await expect(plant).toHaveCSS("transition-duration", "0s");
    await page.waitForTimeout(900);
    expect(await plant.boundingBox()).toEqual(initialBox);
  });

  test("nearby tendrils grow toward the pointer and retract after it leaves", async ({ page }) => {
    await page.goto("/ja/");
    const tips = page.locator("[data-botanical-tendril]");
    const anchor = await tips.evaluateAll((elements) => {
      const gutter = parseFloat(document.querySelector("[data-botanical-background]").style.getPropertyValue("--botanical-gutter"));
      return elements
        .map((element, index) => {
          const p = new DOMPoint(Number(element.dataset.x), Number(element.dataset.y)).matrixTransform(element.getScreenCTM());
          return { index, x: p.x, y: p.y };
        })
        .find((p) => p.x > 10 && p.x < gutter - 55 && p.y > 100 && p.y < innerHeight - 100);
    });
    expect(anchor).toBeTruthy();
    await page.mouse.move(anchor.x + 45, anchor.y + 20);
    const tip = tips.nth(anchor.index);
    await expect(tip).toHaveAttribute("d", /^M.*C/);
    await expect.poll(() => tip.evaluate((el) => el.getTotalLength())).toBeGreaterThan(20);
    await page.mouse.move(720, 400);
    await expect(tip).not.toHaveAttribute("d", /.+/, { timeout: 8500 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(anchor.x + 45, anchor.y + 20);
    await expect(page.locator("[data-botanical-tendril][d]")).toHaveCount(0);
  });

  test("retains the drawing without JavaScript", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/ja/");
    await expect(page.locator(".botanical-background__plant").first()).toBeVisible();
    await context.close();
  });

  test("fills wide gutters and removes extra motifs after resizing", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/ja/");
    const plants = page.locator(".botanical-background__plant");
    await expect(plants.first()).toBeVisible();
    const wideCount = await plants.count();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 2560);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => plants.count()).toBeLessThan(wideCount);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await expect(page.locator(".botanical-background__plant:visible").first()).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
    await page.setViewportSize({ width: 2560, height: 1440 });
    await expect(plants).toHaveCount(wideCount);
  });
});

test("flytraps count separate contacts, forget old touches and reopen", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/ja/");
  const traps = page.locator("[data-botanical-flytrap]");
  const point = await visiblePlantPoint(page, "[data-botanical-flytrap]");
  const trap = traps.nth(point.index);
  await page.mouse.move(point.x, point.y);
  await expect(trap).toHaveAttribute("data-state", "open");
  await page.mouse.move(point.x + 1, point.y + 1);
  await page.mouse.click(point.x, point.y);
  await expect(trap).toHaveAttribute("data-state", "open");
  await page.mouse.move(1280, 600);
  await page.clock.fastForward(31000);
  await page.mouse.move(point.x, point.y);
  await expect(trap).toHaveAttribute("data-state", "open");
  await page.mouse.move(1280, 600);
  await page.mouse.move(point.x, point.y);
  await expect(trap).toHaveAttribute("data-state", "closed");
  await page.clock.fastForward(8000);
  await expect(trap).toHaveAttribute("data-state", "open");
  // Touch input uses taps, without also counting the preceding pointermove.
  await page.evaluate(({ x, y }) => {
    window.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: x, clientY: y }));
    window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientX: x, clientY: y }));
  }, point);
  await expect(trap).toHaveAttribute("data-state", "open");
  await page.evaluate(({ x, y }) => {
    window.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", clientX: x, clientY: y }));
  }, point);
  await expect(trap).toHaveAttribute("data-state", "closed");
  await page.setViewportSize({ width: 2400, height: 1400 });
  await expect(page.locator('[data-botanical-flytrap][data-state="closed"]')).toHaveCount(0);
});

async function visiblePlantPoint(page, selector, local = { x: 0, y: 0 }) {
  await expect(page.locator(selector).first()).toBeVisible();
  const result = await page.locator(selector).evaluateAll((elements, point) => {
    const gutter = parseFloat(document.querySelector("[data-botanical-background]").style.getPropertyValue("--botanical-gutter"));
    for (let index = 0; index < elements.length; index++) {
      const p = new DOMPoint(point.x, point.y).matrixTransform(elements[index].getScreenCTM());
      if (p.x > 40 && p.x < gutter - 40 && p.y > 100 && p.y < innerHeight - 100) return { index, x: p.x, y: p.y };
    }
  }, local);
  expect(result, `${selector} has a reachable point in the margin`).toBeTruthy();
  return result;
}

test("pitcher insect falls through the mouth, resets, and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.clock.install();
  await page.goto("/ja/");
  const point = await visiblePlantPoint(page, "[data-botanical-insect-target]");
  const pitcher = page.locator("[data-botanical-pitcher]").nth(point.index);
  await page.mouse.move(point.x, point.y);
  await expect(pitcher).toHaveAttribute("data-state", "fallen");
  const insect = pitcher.locator(".botanical-background__insect");
  await page.clock.runFor(700);
  await expect(insect).toHaveCSS("opacity", "0");
  await expect(insect).not.toHaveCSS("transform", "none");
  await page.clock.runFor(6000);
  await expect(pitcher).toHaveAttribute("data-state", "ready");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const again = await visiblePlantPoint(page, "[data-botanical-insect-target]");
  await page.mouse.move(1280, 600);
  await page.mouse.move(again.x, again.y);
  await expect(page.locator("[data-botanical-pitcher]").nth(again.index).locator(".botanical-background__insect")).toHaveCSS(
    "animation-name",
    "none"
  );
  await expect(page.locator("[data-botanical-pitcher]").nth(again.index)).toHaveAttribute("data-state", "fallen");
});

test("sundew mucus remains attached during a slow trip to a pitcher", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.clock.install();
  await page.goto("/ja/");
  const sundewPoint = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  const pitcherPoint = await visiblePlantPoint(page, "[data-botanical-insect-target]");
  const dew = page.locator("[data-botanical-sundew]").nth(sundewPoint.index);
  const pitcher = page.locator("[data-botanical-pitcher]").nth(pitcherPoint.index);
  const insect = pitcher.locator(".botanical-background__insect");

  await page.mouse.move(sundewPoint.x, sundewPoint.y);
  await expect(dew).toHaveAttribute("data-stuck", "true");
  for (let step = 1; step <= 9; step += 1) {
    const progress = step / 9;
    await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" })), {
      x: sundewPoint.x + (pitcherPoint.x - sundewPoint.x) * progress,
      y: sundewPoint.y + (pitcherPoint.y - sundewPoint.y) * progress,
    });
    await page.clock.runFor(1000);
  }

  await expect(pitcher).toHaveAttribute("data-state", "ready");
  await page.clock.runFor(1200);
  await expect(insect).toHaveAttribute("data-captured", "true");
  await expect
    .poll(async () => {
      const box = await insect.boundingBox();
      return box ? Math.hypot(box.x + box.width / 2 - sundewPoint.x, box.y + box.height / 2 - sundewPoint.y) : Infinity;
    })
    .toBeLessThan(18);
});

test("a sundew-captured insect follows the pointer and transfers to a flytrap", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.clock.install();
  await page.goto("/ja/");
  const sundewPoint = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  const pitcherPoint = await visiblePlantPoint(page, "[data-botanical-insect-target]");
  const dew = page.locator("[data-botanical-sundew]").nth(sundewPoint.index);
  const pitcher = page.locator("[data-botanical-pitcher]").nth(pitcherPoint.index);
  const insect = pitcher.locator(".botanical-background__insect");
  const originalBox = await insect.boundingBox();
  expect(originalBox).toBeTruthy();
  const originalCenter = { x: originalBox.x + originalBox.width / 2, y: originalBox.y + originalBox.height / 2 };

  await page.mouse.move(sundewPoint.x, sundewPoint.y);
  await page.mouse.move(pitcherPoint.x, pitcherPoint.y);
  await page.clock.runFor(1600);
  await expect(insect).toHaveAttribute("data-captured", "true");
  const capturedBox = await insect.boundingBox();
  expect(capturedBox).toBeTruthy();
  const capturedCenter = { x: capturedBox.x + capturedBox.width / 2, y: capturedBox.y + capturedBox.height / 2 };

  await page.mouse.move(capturedCenter.x, capturedCenter.y);
  await expect(insect).toHaveAttribute("data-captured", "moving");
  await expect(dew).toHaveAttribute("data-stuck", "true");
  for (let index = 0; index < 6; index += 1) {
    await page.clock.runFor(5000);
    await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" })), {
      x: capturedCenter.x + ((index + 1) % 2),
      y: capturedCenter.y,
    });
  }
  await expect(insect).toHaveAttribute("data-captured", "moving");
  const movedTo = { x: capturedCenter.x + 35, y: capturedCenter.y + 20 };
  await page.mouse.move(movedTo.x, movedTo.y);
  await page.clock.runFor(100);
  await expect
    .poll(async () => {
      const box = await insect.boundingBox();
      return box ? Math.hypot(box.x + box.width / 2 - capturedCenter.x, box.y + box.height / 2 - capturedCenter.y) : 0;
    })
    .toBeGreaterThan(20);

  const draggedBox = await insect.boundingBox();
  const draggedCenter = { x: draggedBox.x + draggedBox.width / 2, y: draggedBox.y + draggedBox.height / 2 };
  const trapPoint = await page.locator("[data-botanical-flytrap]").evaluateAll((elements, origin) => {
    const gutter = parseFloat(document.querySelector("[data-botanical-background]").style.getPropertyValue("--botanical-gutter"));
    return elements
      .map((element, index) => {
        const point = new DOMPoint(0, 0).matrixTransform(element.getScreenCTM());
        return { index, x: point.x, y: point.y, distance: Math.hypot(point.x - origin.x, point.y - origin.y) };
      })
      .filter((point) => point.x > 40 && point.x < gutter - 40 && point.y > 100 && point.y < innerHeight - 100)
      .sort((a, b) => a.distance - b.distance)[0];
  }, draggedCenter);
  expect(trapPoint).toBeTruthy();
  const trap = page.locator("[data-botanical-flytrap]").nth(trapPoint.index);

  await page.mouse.move(trapPoint.x, trapPoint.y);
  await expect(trap).toHaveAttribute("data-state", "open");
  await page.mouse.move(trapPoint.x + 80, trapPoint.y + 80);
  await page.clock.runFor(80);
  await page.mouse.move(trapPoint.x, trapPoint.y);
  await expect(trap).toHaveAttribute("data-state", "closed");
  await expect(insect).toHaveAttribute("data-captured", "flytrap");
  await expect(insect).toHaveAttribute("data-captured-by", "flytrap");
  await page.clock.runFor(1000);
  await expect
    .poll(async () => {
      const box = await insect.boundingBox();
      return box ? Math.hypot(box.x + box.width / 2 - trapPoint.x, box.y + box.height / 2 - trapPoint.y) : Infinity;
    })
    .toBeLessThan(18);
  await page.clock.runFor(30000);
  await expect(insect).not.toHaveAttribute("data-captured");
  const respawnedBox = await insect.boundingBox();
  expect(respawnedBox).toBeTruthy();
  expect(
    Math.hypot(respawnedBox.x + respawnedBox.width / 2 - originalCenter.x, respawnedBox.y + respawnedBox.height / 2 - originalCenter.y)
  ).toBeLessThan(18);
});

test("returns a sundew-captured insect with the mucus after an overpull", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.clock.install();
  await page.goto("/ja/");
  const sundewPoint = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  const pitcherPoint = await visiblePlantPoint(page, "[data-botanical-insect-target]");
  const dew = page.locator("[data-botanical-sundew]").nth(sundewPoint.index);
  const insect = page.locator("[data-botanical-pitcher]").nth(pitcherPoint.index).locator(".botanical-background__insect");

  await page.mouse.move(sundewPoint.x, sundewPoint.y);
  await page.mouse.move(pitcherPoint.x, pitcherPoint.y);
  await page.clock.runFor(1600);
  await expect(insect).toHaveAttribute("data-captured", "true");
  const capturedBox = await insect.boundingBox();
  expect(capturedBox).toBeTruthy();
  const capturedCenter = { x: capturedBox.x + capturedBox.width / 2, y: capturedBox.y + capturedBox.height / 2 };

  await page.mouse.move(capturedCenter.x, capturedCenter.y);
  await expect(insect).toHaveAttribute("data-captured", "moving");
  const nearPoint = { x: capturedCenter.x + 70, y: capturedCenter.y + 30 };
  await page.mouse.move(nearPoint.x, nearPoint.y);
  await page.clock.runFor(200);
  const movedBox = await insect.boundingBox();
  expect(movedBox).toBeTruthy();
  expect(Math.hypot(movedBox.x + movedBox.width / 2 - capturedCenter.x, movedBox.y + movedBox.height / 2 - capturedCenter.y)).toBeGreaterThan(20);

  await page.evaluate(({ x, y }) => window.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse" })), {
    x: nearPoint.x - 500,
    y: nearPoint.y + 300,
  });
  await page.clock.runFor(1600);

  await expect(insect).toHaveAttribute("data-captured", "true");
  await expect(insect).toHaveAttribute("data-captured-by", "sundew");
  await expect(dew).not.toHaveAttribute("data-stuck");
  const returnedBox = await insect.boundingBox();
  expect(returnedBox).toBeTruthy();
  expect(Math.hypot(returnedBox.x + returnedBox.width / 2 - sundewPoint.x, returnedBox.y + returnedBox.height / 2 - sundewPoint.y)).toBeLessThan(18);
});

test("sundew releases a long drag and respects reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.goto("/ja/");
  const point = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  const dew = page.locator("[data-botanical-sundew]").nth(point.index);
  await page.mouse.move(point.x, point.y);
  await expect(dew).toHaveAttribute("data-stuck", "true");
  await page.mouse.move(point.x + 28, point.y + 8);
  await page.mouse.move(point.x + 160, point.y + 8);
  await page.waitForTimeout(2400);
  await expect(dew).toHaveAttribute("data-stuck", "true");
  await expect(dew.locator("[data-sundew-thread][d]").first()).toBeVisible();
  await page.mouse.move(1280, 600);
  await expect(dew).not.toHaveAttribute("data-stuck");
  await expect(dew.locator("[data-sundew-thread][d]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const again = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  await page.mouse.move(again.x, again.y);
  await expect(page.locator("[data-botanical-sundew][data-stuck]")).toHaveCount(0);
});
