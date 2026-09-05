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
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
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
  const menu = await page.locator("#project-menu").boundingBox();
  expect(menu).not.toBeNull();
  expect(menu!.x).toBeGreaterThanOrEqual(0);
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(viewport.width);

  await page.getByRole("button", { name: "Project pages" }).click();
  await page.getByRole("button", { name: "Filters" }).click();
  const primaryTouchTargets = page.locator(".brand-home, .site-nav-mobile > button, .topbar-actions a, .map-toolbar-buttons > button, .map-filter-heading > button, .clear-filter-button");
  const targetSizes = await primaryTouchTargets.evaluateAll((targets) => targets.filter((target) => {
    const style = getComputedStyle(target);
    return style.visibility !== "hidden" && style.display !== "none";
  }).map((target) => {
    const rect = target.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(targetSizes.length).toBeGreaterThan(0);
  expect(targetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  await page.getByRole("button", { name: "Close filters" }).click();
  await expect(page.locator("#map-filter-panel")).toBeHidden();

  await page.goto("/en/reviews");
  const staticHeader = await page.locator(".static-header").boundingBox();
  expect(staticHeader).not.toBeNull();
  expect(staticHeader!.height).toBeLessThanOrEqual(80);
  await expect(page.getByRole("button", { name: "Project pages" })).toBeVisible();
  await page.getByRole("button", { name: "Project pages" }).click();
  const staticMenu = await page.locator("#project-menu").boundingBox();
  expect(staticMenu).not.toBeNull();
  expect(staticMenu!.x).toBeGreaterThanOrEqual(0);
  expect(staticMenu!.x + staticMenu!.width).toBeLessThanOrEqual(viewport.width);
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
  const copyButton = dialog.getByRole("button", { name: "Copy full plan" });
  await expect(copyButton).toBeVisible();
  await expect(copyButton).toHaveText("");
  const copyBox = await copyButton.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(copyBox!.width).toBeCloseTo(44, 2);
  expect(copyBox!.height).toBeCloseTo(44, 2);
  await dialog.getByRole("tab", { name: /Documents/ }).click();
  const documents = dialog.locator('[data-action-panel="documents"]');
  await expect(documents).toBeVisible();
  await expect(documents).not.toContainText("Confirm before travel");
  const documentLayout = await documents.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(documentLayout.scrollWidth).toBeLessThanOrEqual(documentLayout.clientWidth);
  const additional = dialog.locator(".action-additional");
  await additional.locator(":scope > summary").click();
  await expect(additional.locator("[data-stage-choice]")).toHaveCount(3);
  await expect(additional.locator('[data-phase="prepare_local"]')).toBeVisible();
  await expect(additional.getByText("Set a written work departure plan", { exact: false })).toBeVisible();
  await additional.getByRole("tab", { name: /I am arranging entry and the trip/ }).click();
  await expect(additional.locator('[data-phase="prepare_local"]')).toBeHidden();
  await expect(additional.getByText("Arrange cancellable initial accommodation", { exact: false })).toBeVisible();
  await additional.getByRole("tab", { name: /I have arrived at the destination/ }).click();
  await expect(additional.getByText("Check that every passport and authorisation was accepted", { exact: false })).toBeVisible();
  const additionalLayout = await additional.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(additionalLayout.scrollWidth).toBeLessThanOrEqual(additionalLayout.clientWidth);
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(dialog).toBeHidden();
  await expect(option).toBeFocused();
});

test("a destination opens with a decision brief and four immediate preparation modules", async ({ page }) => {
  await page.goto("/en");
  await page.locator(".beacon-marker").first().click();
  const plan = page.locator(".action-plan");
  await expect(page.getByRole("heading", { name: "Departure readiness" })).toBeVisible();
  const brief = page.locator(".decision-brief");
  await expect(brief).toContainText("Not ready for departure");
  await expect(brief).toContainText("Route packet assessed for this origin");
  await expect(brief).toContainText("Checklist context");
  await expect(brief.locator(".readiness-context")).toContainText("Moscow");
  await expect(brief.locator(".readiness-context")).toContainText("Adults: 2");
  await expect(brief.locator(".readiness-context")).toContainText("Children: 0");
  await expect(brief.locator(".readiness-context")).toContainText("Dogs: 0");
  await expect(brief).toContainText("Research scope: 1–2 adults · 2 children aged 6–17");
  await expect(brief).toContainText("5 of 45 required checks current · 40 unresolved");
  await expect(brief.locator(".readiness-gates li")).toHaveCount(4);
  await expect(brief.getByText("Entry and documents").locator("..")).toContainText("Confirm first");
  await expect(brief.getByText("Bookable itinerary").locator("..")).toContainText("Not established");
  await brief.locator(".decision-packet-details > summary").click();
  await expect(brief.locator(".itinerary-lead-list > li")).toHaveCount(2);
  await expect(brief.locator(".itinerary-lead-list > li").first()).toContainText("Primary lead · 11 Sept 2026");
  await expect(brief.locator(".itinerary-lead-list > li").first()).toContainText("SVO → BEG · 3 h 5 min · Matches selected timing");
  await expect(brief.locator(".itinerary-lead-list > li").first()).toContainText("Recheck required");
  await expect(brief.locator(".first72-gap-list li")).toHaveCount(7);
  await expect(brief.locator(".first72-gap-list")).toContainText("Accommodation and registration");
  await expect(brief.locator(".first72-gap-list")).toContainText("Failure paths");
  const departureWindow = brief.getByLabel("Expected departure");
  await expect(departureWindow.locator("option")).toHaveCount(3);
  await departureWindow.selectOption("month");
  await expect(departureWindow).toHaveValue("month");
  await expect(brief.locator(".itinerary-lead-list > li").first()).toContainText("Outside selected timing");
  await expect(plan.getByRole("heading", { name: "Prepare this option" })).toBeVisible();
  await expect(plan.locator('[data-action-module]')).toHaveCount(4);
  await expect(plan.locator('input:not([type="checkbox"]), textarea')).toHaveCount(0);
  const moduleBoxes = await plan.locator('[data-action-module]').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { left: box.left, top: box.top, width: box.width };
  }));
  expect(moduleBoxes.every((box) => Math.abs(box.width - moduleBoxes[0].width) < 1)).toBe(true);
  expect(Math.abs(moduleBoxes[0].top - moduleBoxes[1].top)).toBeLessThan(1);
  expect(moduleBoxes[1].left).toBeGreaterThan(moduleBoxes[0].left);
  expect(Math.abs(moduleBoxes[2].top - moduleBoxes[3].top)).toBeLessThan(1);
  expect(moduleBoxes[2].top).toBeGreaterThan(moduleBoxes[0].top);
  await expect(plan.locator('[data-action-panel="where"]')).toHaveCount(0);
  await expect(plan.locator('[data-action-panel="documents"]')).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include(".action-plan").analyze();
  expect(accessibility.violations).toEqual([]);

  await plan.getByRole("tab", { name: /Documents/ }).click();
  await expect(plan.locator('[data-action-panel="documents"]')).toBeVisible();
  await expect(plan.getByText("Adult 1", { exact: true })).toBeVisible();

  await plan.getByRole("tab", { name: /Take/ }).click();
  await expect(plan.locator('[data-action-panel="pack"]')).toBeVisible();
  await plan.locator('[data-action-panel="pack"] input[type="checkbox"]').first().check();

  await plan.getByRole("tab", { name: /Fly/ }).click();
  await expect(plan.getByRole("link", { name: "Search live flights" })).toBeVisible();

  await plan.getByRole("tab", { name: /First stay/ }).click();
  await expect(plan.getByRole("link", { name: "Search cancellable first stays" })).toBeVisible();
  await expect(plan.locator('[data-action-panel="stay"] input[type="checkbox"]')).not.toHaveCount(0);
  await expect(page.locator(".research-details")).not.toHaveAttribute("open", "");
  await brief.getByRole("button", { name: "Change checklist context" }).click();
  await expect(page.locator("#beacon-detail")).toBeHidden();
  await expect(page.locator("#map-filter-panel")).toBeVisible();
  await expect(page.locator("#map-filter-panel").getByLabel("Expected departure")).toHaveValue("month");
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

test("comparison follows the selected departure timing and shows a dated route lead", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.locator("#map-filter-panel").getByLabel("Expected departure").selectOption("month");
  await page.getByRole("button", { name: "Close filters" }).click();
  const markers = page.locator(".beacon-marker");
  await markers.first().click();
  await page.getByRole("button", { name: "Pin for comparison" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await markers.nth(1).click();
  await page.getByRole("button", { name: "Pin for comparison" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: /2 pinned/ }).click();

  const comparison = page.getByRole("dialog", { name: "Option comparison" });
  const readinessRow = comparison.getByRole("row", { name: /Departure readiness · About a month/ });
  await expect(readinessRow).toContainText("5 of 45 required checks current · 40 unresolved");
  await expect(readinessRow).toContainText("11 Sept 2026 · SVO → BEG · Recheck required · Outside selected timing");
  await expect(readinessRow).toContainText("No complete route packet has been assessed for this origin");
});

test("research load makes no third-party request and remains usable at 200 percent zoom", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname !== "127.0.0.1") external.push(request.url());
  });
  await page.goto("/en");
  expect(external).toEqual([]);
  const readingSizes = await page.locator("body, .site-nav-desktop a, .map-caption").evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
  expect(readingSizes[0]).toBeGreaterThanOrEqual(19);
  expect(readingSizes.slice(1).every((size) => size >= 16)).toBe(true);
  await page.locator(".beacon-marker").first().click();
  const detailReadingSizes = await page.locator(".decision-brief-notice, .decision-facts dd, .action-plan-heading p, .action-module > p").evaluateAll((elements) => elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
  expect(detailReadingSizes.length).toBeGreaterThan(0);
  expect(detailReadingSizes.every((size) => size >= 16)).toBe(true);
  await page.getByRole("button", { name: "Close details" }).click();
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
