import { test, expect } from "playwright-test-coverage";
import { User, Role } from "../src/service/pizzaService";


test.beforeEach(async ({ page }) => {
  // --- simple inline mocks ---
  let currentUser: User | null = null;

  // who am I?
  await page.route('**/api/user/me', async r => r.fulfill({ json: currentUser }));

  // register / login
  await page.route('**/api/auth', async r => {
    if (r.request().method() !== 'POST') return r.fallback();
    const b = r.request().postDataJSON?.() || {};
    currentUser = {
      id: 'u1',
      name: b.name ?? b.fullName ?? 'pizza diner',
      email: b.email ?? 'user@test.com',
      password: b.password ?? 'diner',
      roles: [{ role: Role.Diner }],
    };
    await r.fulfill({ json: { user: currentUser, token: 'auth-token' } });
  });

  // update user
  await page.route(/\b\/api\/user\/[^/]+$/i, async r => {
    if (r.request().method() !== 'PUT') return r.fallback();
    const body = r.request().postDataJSON?.() || {};
    currentUser = { ...(currentUser as User), ...body };
    await r.fulfill({ json: { user: currentUser, token: 'updated-token' } });
  });

  // menu / history (for dashboard)
  await page.route('**/api/order/menu', async r => r.fulfill({ json: [] }));
  await page.route(/\/api\/order\/history(\?.*)?$/i, async r =>
    r.fulfill({ json: { id: 'h1', dinerId: 'u1', orders: [] } })
  );
});


test("updateUser", async ({ page }) => {
  const email = `user${Math.floor(Math.random() * 10000)}@jwt.com`;
  await page.goto("/");
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("pizza diner");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Register" }).click();

  await page.getByRole("link", { name: "pd" }).click();

  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza diner");

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("diner");
  await page.getByRole("button", { name: "Login" }).click();

  await page.goto('/diner-dashboard');

  await expect(page.getByRole('heading', { name: /your pizza kitchen/i })).toBeVisible();


});
