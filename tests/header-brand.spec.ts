import { test, expect, origins } from "./fixtures";
import type { Page } from "@playwright/test";
async function fits(page: Page, selector: string) {
  const issues = await page.locator(selector).evaluate((header) => {
    const nodes = [
      ...header.querySelectorAll<HTMLElement>(
        ".brand,.main-nav,.language-switch,.account-button,.header-cta,.web-signout,.portal-menu-toggle,.portal-header-actions",
      ),
    ].filter(
      (node) =>
        node.getClientRects().length &&
        getComputedStyle(node).display !== "none",
    );
    const problems: string[] = [];
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i].getBoundingClientRect();
      if (a.left < 0 || a.right > innerWidth + 1)
        problems.push(nodes[i].className + " outside viewport");
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i]))
          continue;
        const b = nodes[j].getBoundingClientRect();
        if (
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
        )
          problems.push(nodes[i].className + " overlaps " + nodes[j].className);
      }
    }
    return problems;
  });
  expect(issues).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
}
test.describe("visitante", () => {
  test.use({ autoLogin: false });
  test("HOME CONNECT y controles separados en escritorio, tablet y móvil", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".site-header .brand")).toHaveText(
      "HOME CONNECT",
    );
    await expect(page).toHaveTitle(/HOME CONNECT/);
    for (const width of [1920, 1440, 1280, 1024, 820, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await fits(page, ".site-header");
      await expect(
        page.getByRole("button", { name: "Mi cuenta", exact: true }),
      ).toBeVisible();
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: ".artifacts/home-connect-header.png" });
  });
});
test("marca y encabezados con sesión en las tres aplicaciones", async ({
  page,
}) => {
  for (const [origin, route, header] of [
    [origins.web, "/workspace/owner", ".site-header"],
    [origins.contractor, "/workspace/contractor", ".portal-header"],
    [origins.admin, "/workspace/admin", ".portal-header"],
  ]) {
    await page.goto(origin + "/#" + route);
    await expect(page.locator(header + " .brand")).toHaveText("HOME CONNECT");
    await expect(page).toHaveTitle(/HOME CONNECT/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await fits(page, header);
    }
  }
});
