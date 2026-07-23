const { test, expect } = require("@playwright/test");

test.describe("publication access request", () => {
  test("opens an accessible form on the English publications page", async ({ page }) => {
    await page.goto("/publications/");

    await expect(page.getByRole("heading", { name: "Request access to publication files" })).toBeVisible();
    await page.getByRole("button", { name: "Request access", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Request publication access" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Full name")).toBeFocused();
    await expect(dialog.getByLabel("Affiliation", { exact: true })).toBeVisible();
    await expect(dialog.getByLabel("Email address", { exact: true })).toHaveAttribute("type", "email");
    await expect(dialog.locator("form")).toHaveAttribute(
      "action",
      "https://script.google.com/macros/s/AKfycbzZgmU-msHncbv54IT0B034oEoUJYVUTbhrT2I8guNRq1VUf_pVKedw-AzzCRc25r03/exec"
    );

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("shows the Japanese request copy on the Japanese publications page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ja/publications/");

    await expect(page.getByRole("heading", { name: "researchmap掲載ファイルへのアクセス" })).toBeVisible();
    await page.getByRole("button", { name: "アクセスを申請" }).click();
    await expect(page.getByRole("dialog", { name: "論文ファイルへのアクセス申請" })).toBeVisible();
    await expect(page.getByRole("button", { name: "確認メールを送信" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
