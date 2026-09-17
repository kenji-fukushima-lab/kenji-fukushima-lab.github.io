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
  for (const route of ["/", "/ja/"]) {
    test(`${route} rustles locally, settles and preserves content interaction`, async ({ page }) => {
      await page.goto(route);
      const background = page.locator("[data-botanical-background]");
      await expect(background).toHaveAttribute("aria-hidden", "true");
      await expect(background).toHaveCSS("pointer-events", "none");
      await expect(background).not.toHaveCSS("mask-image", "none");
      expect(await background.locator("svg").count()).toBeGreaterThanOrEqual(6);
      const leaf = await brushLeaf(page);
      await expect.poll(() => leaf.getAttribute("transform")).toMatch(/rotate\((?!0\.0000)[-\d.]+ /);
      const distantLeaf = page.locator(".botanical-background__plant").nth(1).locator("[data-botanical-leaf]").first();
      await expect(distantLeaf).toHaveAttribute("transform", "rotate(0.0000 0 0)");
      await page.waitForTimeout(2200);
      await expect(leaf).toHaveAttribute("transform", /rotate/);
      await expect(leaf).not.toHaveAttribute("transform", /.+/, { timeout: 6500 });

      await page.mouse.move(720, 400);
      await expect(leaf).not.toHaveAttribute("transform", /.+/);
      const link = page.locator('[role="main"] a[href]').first();
      await expect(link).toBeVisible();
      await link.click({ trial: true });
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 1440);
    });
  }

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

  test("keeps a sparse static drawing on narrow screens and in dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/ja/");
    const plants = page.locator(".botanical-background__plant:visible");
    await expect(plants).toHaveCount(2);
    await expect(page.locator("[data-botanical-background]")).toHaveCSS("color", "rgb(166, 188, 160)");
    await page.mouse.move(20, 650);
    await expect(plants.first().locator("[data-botanical-stem]").first()).not.toHaveAttribute("transform", /.+/);
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
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
    const tangentAlignment = await tip.evaluate((element) => {
      const start = element.getPointAtLength(0);
      const next = element.getPointAtLength(0.05);
      const dx = next.x - start.x;
      const dy = next.y - start.y;
      const tx = Number(element.dataset.tangentX);
      const ty = Number(element.dataset.tangentY);
      return (dx * tx + dy * ty) / (Math.hypot(dx, dy) * Math.hypot(tx, ty));
    });
    expect(tangentAlignment).toBeGreaterThan(0.99);
    // Holding the pointer still must allow the spiral to develop and converge.
    await expect.poll(async () => ((await tip.getAttribute("d")) || "").split("C").length, { timeout: 8500 }).toBeGreaterThan(18);
    const spiral = await tip.evaluate(
      (element, pointer) => {
        const center = new DOMPoint(pointer.x, pointer.y).matrixTransform(element.getScreenCTM().inverse());
        const ends = element
          .getAttribute("d")
          .split("C")
          .slice(1)
          .map((segment) => {
            const values = segment.trim().split(/\s+/).map(Number);
            return { x: values[4] - center.x, y: values[5] - center.y };
          });
        let winding = 0;
        for (let i = 1; i < ends.length; i++) {
          const a = ends[i - 1],
            b = ends[i];
          winding += Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y);
        }
        return { winding: Math.abs(winding), first: Math.hypot(ends[0].x, ends[0].y), last: Math.hypot(ends.at(-1).x, ends.at(-1).y) };
      },
      { x: anchor.x + 45, y: anchor.y + 20 }
    );
    expect(spiral.winding).toBeGreaterThan(2 * Math.PI);
    expect(spiral.last).toBeLessThan(spiral.first / 4);
    const endpoint = () =>
      tip.evaluate((element) => {
        const p = element.getPointAtLength(element.getTotalLength()).matrixTransform(element.getScreenCTM());
        return { x: p.x, y: p.y };
      });
    const before = await endpoint();
    await page.mouse.move(anchor.x + 45, anchor.y + 80);
    await page.waitForTimeout(350);
    const after = await endpoint();
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(25);
    await page.mouse.move(720, 400);
    await expect(tip).not.toHaveAttribute("d", /.+/, { timeout: 8500 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.mouse.move(anchor.x + 45, anchor.y + 20);
    await expect(page.locator("[data-botanical-tendril][d]")).toHaveCount(0);
  });

  test("retains the drawing without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:8080/ja/");
    await expect(page.locator(".botanical-background__plant").first()).toBeVisible();
    await context.close();
  });

  test("loads once on the shared default layout", async ({ page }) => {
    await page.goto("/ja/people/");
    await expect(page.locator("[data-botanical-background]")).toHaveCount(1);
    await expect(page.locator('script[src*="botanical-background"]')).toHaveCount(1);
    await expect(page.locator(".botanical-background__plant").first()).toBeVisible();
  });

  test("fills wide gutters and removes extra motifs after resizing", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/ja/");
    const plants = page.locator(".botanical-background__plant");
    await expect.poll(() => plants.count()).toBeGreaterThan(12);
    const innerMarginPlant = plants.nth(4);
    await expect
      .poll(() =>
        innerMarginPlant.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return box.x + box.width / 2;
        })
      )
      .toBeGreaterThan(350);
    const main = await page.locator('[role="main"]').boundingBox();
    const gutter = await page
      .locator("[data-botanical-background]")
      .evaluate((element) => parseFloat(element.style.getPropertyValue("--botanical-gutter")));
    expect(gutter).toBeCloseTo(main.x - 12, 0);
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 2560);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(plants).toHaveCount(6);
    await expect(page.locator(".botanical-background__plant:visible")).toHaveCount(2);
    await page.setViewportSize({ width: 2560, height: 1440 });
    await expect.poll(() => plants.count()).toBeGreaterThan(12);
  });
});

test("flytraps count separate contacts, forget old touches and reopen", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/ja/");
  const traps = page.locator("[data-botanical-flytrap]");
  const point = await traps.evaluateAll((elements) => {
    for (let index = 0; index < elements.length; index++) {
      const p = new DOMPoint(0, 0).matrixTransform(elements[index].getScreenCTM());
      if (p.x > 5 && p.x < 500 && p.y > 100 && p.y < innerHeight - 50) return { index, x: p.x, y: p.y };
    }
  });
  expect(point).toBeTruthy();
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
  await expect(trap.locator(".botanical-background__trap-lobes")).toHaveCSS("transform", "matrix(0.12, 0, 0, 1, 0, 0)");
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

test("sundew follows longer drags with three mucus strands and releases", async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1400 });
  await page.goto("/ja/");
  const point = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  const dew = page.locator("[data-botanical-sundew]").nth(point.index);
  await page.mouse.move(point.x, point.y);
  await expect(dew).toHaveAttribute("data-stuck", "true");
  await page.mouse.move(point.x + 28, point.y + 8);
  await expect
    .poll(() =>
      dew.locator("[data-sundew-leaf]").evaluate((e) => {
        const matrix = e.transform.baseVal.consolidate()?.matrix;
        return matrix ? Math.hypot(matrix.e, matrix.f) : 0;
      })
    )
    .toBeGreaterThan(1);
  const distance = await dew.locator("[data-sundew-leaf]").evaluate((e) => {
    const matrix = e.transform.baseVal.consolidate().matrix;
    return Math.hypot(matrix.e, matrix.f);
  });
  expect(distance).toBeLessThanOrEqual(5);
  await page.mouse.move(point.x + 160, point.y + 8);
  await page.waitForTimeout(2400);
  await expect(dew).toHaveAttribute("data-stuck", "true");
  await expect
    .poll(() =>
      dew.locator("[data-sundew-leaf]").evaluate((e) => {
        const matrix = e.transform.baseVal.consolidate()?.matrix;
        return matrix ? Math.hypot(matrix.e, matrix.f) : 0;
      })
    )
    .toBeGreaterThan(4);
  const longDragDistance = await dew.locator("[data-sundew-leaf]").evaluate((e) => {
    const matrix = e.transform.baseVal.consolidate().matrix;
    return Math.hypot(matrix.e, matrix.f);
  });
  expect(longDragDistance).toBeLessThanOrEqual(5);
  await expect(dew.locator("[data-sundew-thread][d]")).toHaveCount(3);
  const paths = await dew.locator("[data-sundew-thread]").evaluateAll((elements) => elements.map((element) => element.getAttribute("d")));
  expect(new Set(paths).size).toBe(3);
  await page.mouse.move(1280, 600);
  await expect(dew).not.toHaveAttribute("data-stuck");
  await expect(dew.locator("[data-sundew-thread][d]")).toHaveCount(0);
  await expect(dew.locator("[data-sundew-leaf]")).not.toHaveAttribute("transform");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const again = await visiblePlantPoint(page, "[data-botanical-sundew]", { x: -9, y: -35 });
  await page.mouse.move(again.x, again.y);
  await expect(page.locator("[data-botanical-sundew][data-stuck]")).toHaveCount(0);
});
