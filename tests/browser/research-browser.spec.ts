import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const lang of ["en", "ru"] as const) {
  test(`${lang} research browser has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(`/${lang}`);
    await expect(page.locator(".research-safety-banner")).toHaveCount(0);
    await expect(page.locator('[data-surface="map"] [role="listitem"]')).toHaveCount(7);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the map remains inside the initial desktop and mobile viewport", async ({ page }) => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/en");
    const box = await page.locator('[data-surface="map"]').boundingBox();
    expect(box).not.toBeNull();
    const visibleHeight = Math.min(viewport.height, box!.y + box!.height) - Math.max(0, box!.y);
    expect(visibleHeight).toBeGreaterThan(200);
  }
});

test("mobile map starts below the compact header and overlays remain mutually exclusive", async ({ page }) => {
  const viewport = { width: 360, height: 697 };
  await page.setViewportSize(viewport);
  await page.goto("/en");
  await expect(page.locator(".research-safety-banner")).toHaveCount(0);
  const header = await page.locator(".topbar").boundingBox();
  const map = await page.locator('[data-surface="map"]').boundingBox();
  expect(header).not.toBeNull();
  expect(map).not.toBeNull();
  expect(map!.y).toBeLessThanOrEqual(header!.y + header!.height + 1);
  const labels = await page.locator(".beacon-label:visible").evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
  }));
  const caption = await page.locator(".map-caption").boundingBox();
  expect(caption).not.toBeNull();
  expect(labels.length).toBeGreaterThan(0);
  expect(labels.every(({ left, right, top, bottom }) => left >= map!.x + 8 && right <= map!.x + map!.width - 8 && top >= map!.y + 8 && bottom <= map!.y + map!.height - 8)).toBe(true);
  expect(labels.every(({ left, right, top, bottom }) => right < caption!.x - 8 || left > caption!.x + caption!.width + 8 || bottom < caption!.y - 8 || top > caption!.y + caption!.height + 8)).toBe(true);

  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.locator("#map-filter-panel")).toBeVisible();
  await page.getByRole("button", { name: "Project pages" }).click();
  await expect(page.locator("#project-menu")).toBeVisible();
  await expect(page.locator("#map-filter-panel")).toBeHidden();

  await page.getByRole("button", { name: "Project pages" }).click();
  await page.getByRole("button", { name: "Filters" }).click();
  await page.getByRole("button", { name: "Close filters" }).click();
  await expect(page.locator("#map-filter-panel")).toBeHidden();

  await page.goto("/en/reviews");
  const staticHeader = await page.locator(".static-header").boundingBox();
  expect(staticHeader).not.toBeNull();
  expect(staticHeader!.height).toBeLessThanOrEqual(80);
  await expect(page.getByRole("button", { name: "Project pages" })).toBeVisible();
});

test("keyboard selection opens details and close restores focus", async ({ page }) => {
  await page.goto("/en");
  const option = page.locator(".beacon-marker").first();
  await option.focus();
  await page.keyboard.press("Enter");
  const details = page.locator("#beacon-detail");
  await expect(details).toBeVisible();
  await expect(option).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(details).toBeHidden();
  await expect(option).toBeFocused();
});

test("mobile details use a labelled dialog and return focus on close", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 697 });
  await page.goto("/en");
  const option = page.locator(".beacon-marker").first();
  await option.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Belgrade");
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(dialog).toBeHidden();
  await expect(option).toBeFocused();
});

test("origin selection moves the visible origin and route geometry", async ({ page }) => {
  await page.goto("/en");
  const origin = page.locator(".origin");
  const route = page.locator(".route-line").first();
  const beforeOrigin = await origin.getAttribute("style");
  const beforeRoute = await route.getAttribute("d");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByLabel("Departure origin").selectOption("LED");
  await expect(origin).toContainText("Saint Petersburg");
  expect(await origin.getAttribute("style")).not.toBe(beforeOrigin);
  expect(await route.getAttribute("d")).not.toBe(beforeRoute);
});

test("research load makes no third-party request and remains usable at 200 percent zoom", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.goto("/en");
  expect(external).toEqual([]);
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const firstOption = page.locator(".beacon-marker").first();
  await expect(firstOption).toBeVisible();
  await firstOption.click();
  await expect(page.locator("#beacon-detail")).toBeVisible();
  const targetSizes = await page.locator("button:visible").evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(targetSizes.every(({ width, height }) => width >= 24 && height >= 24)).toBe(true);
});
