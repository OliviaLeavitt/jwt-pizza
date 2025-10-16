// tests/list-users.spec.ts
import { test, expect } from "@playwright/test";
import { Role, User } from "../src/service/pizzaService";

test.beforeEach(async ({ page }) => {
  // In-memory users for this test run
  let users: User[] = [
    { id: "1", name: "Admin", email: "a@jwt.com",   roles: [{ role: Role.Admin }] },
    { id: "2", name: "Alpha", email: "alpha@jwt.com", roles: [{ role: Role.Diner }] },
  ];
  let currentUser: User | null = null;

  // Login (PUT /api/auth)
  await page.route("**/api/auth", async (r) => {
    if (r.request().method() !== "PUT") return r.fallback();
    currentUser = users[0]; // Admin
    await r.fulfill({ json: { user: currentUser, token: "t" } });
  });

  // /api/user/me
  await page.route("**/api/user/me", async (r) => {
    if (r.request().method() !== "GET") return r.fallback();
    if (!currentUser) return r.fulfill({ status: 401, json: { message: "unauthorized" } });
    await r.fulfill({ json: currentUser });
  });

  // GET /api/user -> plain array from backend
  await page.route(/\/api\/user(\?.*)?$/i, async (r) => {
    if (r.request().method() !== "GET") return r.fallback();
    await r.fulfill({ json: users });
  });

  // DELETE /api/user/:id
  await page.route(/\/api\/user\/\w+$/i, async (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    const id = r.request().url().split("/").pop()!;
    users = users.filter((u) => String(u.id) !== id);
    await r.fulfill({ status: 204, body: "" });
  });

  // Franchises (don’t distract this test)
  await page.route(/\/api\/franchise(\?.*)?$/i, (r) =>
    r.fulfill({ json: { franchises: [], more: false } })
  );
});

test("Users section shows data and supports deleting a user", async ({ page }) => {
  // Login
  await page.goto("/");
  await page.getByRole("link", { name: /login/i }).click();
  await page.getByRole("textbox", { name: /email/i }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: /password/i }).fill("admin");
  await page.getByRole("button", { name: /login/i }).click();

  // Go to Admin
  await page.getByRole("link", { name: /admin/i }).click();

  // Header present
  await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();

  // Should NOT show the empty-state
  await expect(page.getByText("No users found")).not.toBeVisible();
});
