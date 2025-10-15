import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";

test.beforeEach(async ({ page }) => {
  // In-memory users (admin + diners)
  const USERS: User[] = [
    { id: 1, name: "Admin", email: "a@jwt.com",   password: "x", roles: [{ role: Role.Admin }] },
    { id: 2, name: "Alpha", email: "alpha@jwt.com", password: "x", roles: [{ role: Role.Diner }] },
    { id: 3, name: "Beta",  email: "beta@jwt.com",  password: "x", roles: [{ role: Role.Diner }] },
    { id: 4, name: "Gamma", email: "gamma@jwt.com", password: "x", roles: [{ role: Role.Diner }] },
  ];

  // Always admin when asked "who am I"
  await page.route("**/api/user/me", r => r.fulfill({ json: USERS[0] }));

  // Login (PUT /api/auth) returns admin + token
  await page.route("**/api/auth", async r => {
    if (r.request().method() !== "PUT") return r.fallback();
    await r.fulfill({ json: { user: USERS[0], token: "t" } });
  });

  // GET /api/user?page=1&limit=10&name=*
  await page.route(/\/api\/user(\?.*)?$/i, async r => {
    if (r.request().method() !== "GET") return r.fallback();

    const url   = new URL(r.request().url());
    const pageQ = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limQ  = Math.max(1, Number(url.searchParams.get("limit") || "10"));
    const q     = (url.searchParams.get("name") || "*").replace(/\*/g, "").toLowerCase();

    const filtered = USERS.filter(u =>
      !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );

    const start = (pageQ - 1) * limQ;
    const users = filtered.slice(start, start + limQ);
    const more  = start + limQ < filtered.length;

    await r.fulfill({ json: { users, more } });
  });

  // Franchises (empty so the top table renders but stays out of our way)
  await page.route(/\/api\/franchise(\?.*)?$/i, r => r.fulfill({ json: { franchises: [], more: false } }));

  // Menu calls
  await page.route("**/api/order/menu", r => r.fulfill({ json: [] }));
});

test("lists users and filters by name", async ({ page }) => {
  // Log in as admin
  await page.goto("/");
  await page.getByRole("link",  { name: /login/i }).click();
  await page.getByRole("textbox", { name: /email/i }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: /password/i }).fill("admin");
  await page.getByRole("button",  { name: /login/i }).click();

  // Go to admin dashboard
  await page.goto("/admin-dashboard");
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();

  // Get the Users table by climbing from its unique "Filter users" input
  const usersTable = page.getByPlaceholder(/filter users/i).locator("xpath=ancestor::table[1]");

  // Should list at least some diners
  await expect(usersTable).toContainText("Alpha");
  await expect(usersTable).toContainText("Beta");

  // Apply a filter
  await page.getByPlaceholder(/filter users/i).fill("alp");
  await page.getByRole("button", { name: /apply/i }).click();

  // Only Alpha should match
  await expect(usersTable).toContainText("Alpha");
  await expect(usersTable).not.toContainText("Beta");
});
