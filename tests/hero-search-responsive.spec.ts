import { test, expect } from "@playwright/test";
import { visibleTestId } from "./helpers/visible";

const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1280, 1440];

/**
 * The hero search card used to break in three ways: the four category chips
 * (All properties / Homes / Plots / Commercial) wrapped onto two rows on
 * phones, each row of the card used a different inset so nothing lined up, and
 * on desktop the Search button floated above the selects.
 */
test("hero search card keeps one chip row, aligned insets and no overflow", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

    const heroSearch = visibleTestId(page, "hero-search");
    const panel = heroSearch.locator(".property-search-panel");
    const chips = heroSearch.getByRole("group", { name: "Quick property category", exact: true });

    // 1. All four category chips sit on a single row (the row scrolls sideways
    //    instead of wrapping when the labels genuinely cannot fit).
    const chipBoxes = await chips.getByRole("button").evaluateAll((elements) =>
      elements.map((element) => {
        const box = element.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      }),
    );
    expect(chipBoxes, `${width}px: expected four category chips`).toHaveLength(4);
    const tops = chipBoxes.map((box) => box.top);
    expect(
      Math.max(...tops) - Math.min(...tops),
      `${width}px: category chips wrapped onto more than one row`,
    ).toBeLessThanOrEqual(1);

    // 2. The Buy / Rent / Sell bar is a full-width equal tab row (tight inset).
    //    The chips and the search field share a slightly larger content inset.
    const controlSelector = width < 768 ? ".property-search-mobile" : ".property-search-form";
    const insets = await panel.evaluate(
      (element, controls) => {
        const inset = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          return node ? Number.parseFloat(getComputedStyle(node).paddingLeft) : Number.NaN;
        };
        return { modes: inset(".property-search-modes"), chips: inset(".property-search-quick-types"), controls: inset(controls) };
      },
      controlSelector,
    );
    expect(Number.isNaN(insets.modes), `${width}px: Buy/Rent row inset`).toBe(false);
    expect(insets.modes, `${width}px: tab bar should sit near the card edge`).toBeLessThanOrEqual(10);
    expect(Math.abs(insets.chips - insets.controls), `${width}px: chip row and search field insets`).toBeLessThanOrEqual(0.5);

    // 3. Nothing spills out of the card or the page.
    const panelBox = await panel.boundingBox();
    expect(panelBox, `${width}px: search card has no box`).not.toBeNull();
    expect(panelBox!.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      `${width}px horizontal overflow`,
    ).toBeLessThanOrEqual(1);

    // 4. From 1024px all four selects share one row and must be level, and from
    //    1280px the Search button joins that row at the same height.
    if (width >= 1024) {
      const selectTops = await panel
        .locator("#hero-city, #hero-type, #hero-budget, #hero-beds")
        .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
      expect(selectTops, `${width}px: expected four selects`).toHaveLength(4);
      expect(
        Math.max(...selectTops) - Math.min(...selectTops),
        `${width}px: the selects are not level (a wrapped label pushed one down)`,
      ).toBeLessThanOrEqual(1);
    }
    if (width >= 1280) {
      const city = await panel.locator("#hero-city").boundingBox();
      const search = await panel.getByRole("button", { name: "Search", exact: true }).boundingBox();
      expect(city).not.toBeNull();
      expect(search).not.toBeNull();
      expect(Math.abs(search!.y - city!.y), `${width}px: Search button is not level with the selects`).toBeLessThanOrEqual(1);
    }
  }
});
