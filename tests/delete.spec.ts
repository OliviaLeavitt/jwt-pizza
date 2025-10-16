// tests/admin-dashboard.spec.ts
import { test, expect } from "@playwright/test";
import { Role, User } from "../src/service/pizzaService";

test.beforeEach(async ({ page }) => {
  // --- in-memory "backend" state ---
  let currentUser: User | null = null;
  let users: User[] = [
    {
      id: "1",
      name: "pizza diner",
      email: "a@jwt.com",
      password: "admin",
      roles: [{ role: Role.Admin }],
    },
    {
      id: "2",
      name: "Tony Pepperoni",
      email: "tony@pie.com",
      password: "secret",
      roles: [{ role: Role.Diner }],
    },
  ];

  // --- /api/auth (login) ---
  await page.route("**/api/auth", async (r) => {
    if (r.request().method() !== "PUT") return r.fallback();
    currentUser = users[0];
    await r.fulfill({ json: { user: currentUser, token: "auth-token" } });
  });

  // --- /api/user/me ---
  await page.route("**/api/user/me", async (r) => {
    if (!currentUser)
      return r.fulfill({ status: 401, json: { message: "unauthorized" } });
    await r.fulfill({ json: currentUser });
  });

  // --- /api/user (GET plain array) ---
  await page.route(/\/api\/user(\?.*)?$/i, async (r) => {
    if (r.request().method() !== "GET") return r.fallback();
    await r.fulfill({ json: users });
  });

  // --- /api/user/:id (DELETE) ---
  await page.route(/\/api\/user\/\d+$/i, async (r) => {
    if (r.request().method() !== "DELETE") return r.fallback();
    const id = r.request().url().split("/").pop()!;
    users = users.filter((u) => u.id !== id);
    await r.fulfill({ status: 204 });
  });

  // --- /api/franchise ---
  await page.route(/\/api\/franchise(\?.*)?$/i, async (r) => {
    await r.fulfill({
      json: {
        franchises: [
          {
            id: "f1",
            name: "pizzaPocket",
            admins: [{ name: "pizza diner", email: "a@jwt.com" }],
            stores: [{ id: "s1", name: "SLC" }],
          },
        ],
        more: false,
      },
    });
  });
});

test("Admin Dashboard shows users, deletes all, then shows 'No users found'", async ({ page }) => {
  // Login as admin
  await page.goto("http://localhost:5173/");
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  // Open Admin Dashboard
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("heading", { name: "Mama Ricci's kitchen" })).toBeVisible();

  // --- Users table ---
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();

  // Delete both users
  await page.getByRole("button", { name: "Delete a@jwt.com" }).click();
  await page.getByRole("button", { name: "Delete tony@pie.com" }).click();

  // After both deletes, no users should remain
  await expect(page.getByText("No users found")).toBeVisible();

  // --- Franchises still visible ---
  await expect(page.getByRole("heading", { name: "Franchises" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "pizzaPocket" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SLC" })).toBeVisible();
});
