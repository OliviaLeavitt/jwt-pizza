import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { User, Role } from '../src/service/pizzaService';

// Give headless CI some breathing room across this file
test.setTimeout(15000);

async function loginAsAdmin(page: Page) {
  let currentUser: any = null;

  await page.route('**/api/user/me', async (r) => r.fulfill({ json: currentUser }));
  await page.route('**/api/auth', async (r) => {
    expect(r.request().method()).toBe('PUT');
    const body = r.request().postDataJSON?.() || {};
    expect(body.email).toBe('a@jwt.com');
    expect(body.password).toBe('admin');
    currentUser = {
      id: 'admin1',
      name: '常用名字',
      email: 'a@jwt.com',
      roles: [{ role: 'admin' }],
    };
    await r.fulfill({ json: { user: currentUser, token: 'admin-token' } });
  });

  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );

  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: /password/i }).fill('admin');
  await page.getByRole('button', { name: /login/i }).click();
}

function getSearchParams(url: string) {
  const u = new URL(url);
  return Object.fromEntries(u.searchParams.entries());
}

const page0Franchises = {
  franchises: [
    {
      id: 1,
      name: 'LotaPizza',
      admins: [{ name: 'Fran One' }],
      stores: [
        { id: 101, name: 'Lehi', totalRevenue: 0.005 },
        { id: 102, name: 'Springville', totalRevenue: 0.0028 },
      ],
    },
    { id: 2, name: 'PizzaCorp', admins: [{ name: 'Fran Two' }], stores: [{ id: 201, name: 'Spanish Fork', totalRevenue: 0.001 }] },
  ],
  more: true,
};

const page1Franchises = {
  franchises: [
    {
      id: 3,
      name: 'TopSpot',
      admins: [{ name: 'Fran Three' }],
      stores: [{ id: 301, name: 'Downtown', totalRevenue: 0.0099 }],
    },
  ],
  more: false,
};

async function routeFranchises(
  page: Page,
  opts?: { onRequest?: (q: Record<string, string>) => void }
) {
  await page.route(/\/api\/franchise(\?.*)?$/i, async (r) => {
    const q = getSearchParams(r.request().url());
    opts?.onRequest?.(q);

    const pageNum = Number(q.page ?? '0');
    if ((q.filter ?? '').toLowerCase().includes('top')) {
      return r.fulfill({ json: { franchises: page1Franchises.franchises, more: false } });
    }
    if (pageNum === 0) return r.fulfill({ json: page0Franchises });
    return r.fulfill({ json: page1Franchises });
  });
}

test('home page', async ({ page }) => {
  await page.goto('/');
  expect(await page.title()).toBe('JWT Pizza');
});

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] },
  };

  await page.route('**/api/auth', async (route) => {
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
      return;
    }
    loggedInUser = user;
    await route.fulfill({ json: { user, token: 'abcdef' } });
  });

  await page.route('**/api/user/me', async (route) => route.fulfill({ json: loggedInUser }));

  await page.route('**/api/order/menu', async (route) =>
    route.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ],
    })
  );

  await page.route(/\/api\/franchise(\?.*)?$/i, async (route) =>
    route.fulfill({
      json: {
        franchises: [
          {
            id: 2,
            name: 'LotaPizza',
            stores: [
              { id: 4, name: 'Lehi' },
              { id: 5, name: 'Springville' },
              { id: 6, name: 'American Fork' },
            ],
          },
          { id: 3, name: 'PizzaCorp', stores: [{ id: 7, name: 'Spanish Fork' }] },
          { id: 4, name: 'topSpot', stores: [] },
        ],
      },
    })
  );

  await page.route('**/api/order', async (route) => {
    const orderReq = route.request().postDataJSON();
    await route.fulfill({ json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' } });
  });

  await page.goto('/');
}

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('0.008')).toBeVisible();
});

test('register a new user', async ({ page }) => {
  let currentUser: any = null;

  // Keep layout happy (header fetches menu)
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );

  await page.route('**/api/user/me', async (route) => route.fulfill({ json: currentUser }));
  await page.route(/\/api\/(auth\/)?register$/, async (route) => {
    const payload = route.request().postDataJSON?.() || {};
    const name = payload.name ?? payload.fullName ?? 'New User';
    const email = payload.email ?? 'test@jwt.com';
    currentUser = { id: '99', name, email, roles: [{ role: 'diner' }] };
    await route.fulfill({ json: { user: currentUser, token: 'new-user-token' } });
  });

  await page.goto('/');
  await page.getByRole('link', { name: /register/i }).click();

  await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();
  const passwordInput = page.getByRole('textbox', { name: /password/i });
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toHaveAttribute('type', /password/i);

  await page.getByRole('textbox', { name: /full name/i }).fill('testt');
  await page.getByRole('textbox', { name: /email address/i }).fill('test@jwt.com');
  await passwordInput.fill('test');
  await page.getByRole('button', { name: /register/i }).click();

  // Let SPA settle (header re-render, /me fetch, etc.)
  await page.waitForLoadState('networkidle');

  // Open the user menu via initials, then assert Logout visible
  const initials = page.getByRole('link', { name: /^t$/i });
  await expect(initials).toBeVisible();
  await initials.click();
  await expect(page.getByRole('link', { name: /logout/i })).toBeVisible();
  // Reload not required anymore
});

test('logout redirects home and clears user state', async ({ page }) => {
  let currentUser: any = null;
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: currentUser }));
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }] })
  );
  await page.route('**/api/auth', async (r) => {
    const body = r.request().postDataJSON?.() || {};
    currentUser = { id: '3', name: 'Kai Chen', email: body.email, roles: [{ role: 'diner' }] };
    await r.fulfill({ json: { user: currentUser, token: 'fake' } });
  });

  await page.goto('/');
  await page.getByRole('link', { name: /login/i }).click();
  await page.getByRole('textbox', { name: /email/i }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: /password/i }).fill('a');
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page.getByRole('link', { name: /login/i })).toHaveCount(0);
  await page.goto('/logout');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
});

test('dinerdashboard', async ({ page }) => {
  let currentUser: any = null;
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: currentUser }));
  await page.route(/\/api\/(auth\/)?register$/i, async (r) => {
    const body = r.request().postDataJSON?.() || {};
    currentUser = { id: 'u1', name: body.name ?? body.fullName ?? 'testt', email: body.email ?? 'test@jwt.com', roles: [{ role: 'diner' }] };
    await r.fulfill({ json: { user: currentUser, token: 'new-user-token' } });
  });
  await page.route(/\/api\/order\/history(\?.*)?$/i, async (r) =>
    r.fulfill({ json: { id: 'h1', dinerId: 'u1', orders: [] } })
  );
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'Yum' }] })
  );

  await page.goto('/');
  await page.getByRole('link', { name: /register/i }).click();
  await page.getByRole('textbox', { name: /full name/i }).fill('testt');
  await page.getByRole('textbox', { name: /email address/i }).fill('test@jwt.com');
  await page.getByRole('textbox', { name: /password/i }).fill('test');
  await page.getByRole('button', { name: /register/i }).click();

  // Give the header time to show initials
  await page.waitForLoadState('networkidle');

  const initials = page.getByRole('link', { name: /^t$/i });
  await expect(initials).toBeVisible({ timeout: 15000 });
  await initials.click();
  const buyOne = page.getByRole('link', { name: /buy one/i });
  await expect(buyOne).toBeVisible();
  await expect(buyOne).toHaveAttribute('href', '/menu');
});

test.describe('Admin Dashboard', () => {
  test.setTimeout(15000);

  test('close Store navigates to /close-store', async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
    await page.goto('/admin-dashboard');

    const lehiRow = page.locator('tbody tr', { hasText: 'Lehi' });
    await expect(lehiRow).toBeVisible();
    await lehiRow.getByRole('button', { name: /^Close$/ }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/close-store$/);
  });

  test('pagination: next enabled when more=true, disabled when last page; prev re-enables', async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
    await page.goto('/admin-dashboard');

    const prevBtn = page.locator('button', { hasText: '«' });
    const nextBtn = page.locator('button', { hasText: '»' });

    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    await nextBtn.click();
    await expect(page.getByText('TopSpot')).toBeVisible();
    await expect(nextBtn).toBeDisabled();
    await expect(prevBtn).toBeEnabled();

    await prevBtn.click();
    await expect(page.getByText('LotaPizza')).toBeVisible();
    await expect(nextBtn).toBeEnabled();
    await expect(prevBtn).toBeDisabled();
  });
});

test('admin page (non-admin sees NotFound)', async ({ page }) => {
  await page.route('**/api/user/me', async (r) =>
    r.fulfill({ json: { id: 'u1', name: 'Kai', email: 'd@jwt.com', roles: [{ role: 'diner' }] } })
  );
  await page.route('**/api/order/menu', async (r) => r.fulfill({ json: [] }));
  await page.route(/\/api\/franchise(\?.*)?$/i, async (r) => r.fulfill({ json: { franchises: [], more: false } }));

  await page.goto('/admin-dashboard');
  await expect(page.getByText(/dropped a pizza on the floor\. please try another page\./i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('columnheader', { name: /franchise/i })).toHaveCount(0);
});

test.describe('CreateFranchise', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Cancel navigates back to admin dashboard (breadcrumb parent)', async ({ page }) => {
    await page.goto('/admin-dashboard/create-franchise');
    await page.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/);
  });

  test('native validation prevents submit when required fields are empty', async ({ page }) => {
    await page.goto('/admin-dashboard/create-franchise');

    let createCalled = false;
    await page.route('**/api/franchise', async (r) => {
      createCalled = true;
      await r.fulfill({ json: {} });
    });

    await page.getByRole('button', { name: /^Create$/ }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/create-franchise$/);
    expect(createCalled).toBe(false);
  });
});

test.describe('CloseFranchise', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
  });

  test('Cancel navigates back to admin dashboard without calling close API', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await page.locator('tbody >> role=button[name="Close"]').first().click();
    await expect(page).toHaveURL(/\/admin-dashboard\/close-franchise$/);

    let closeCalled = false;

    await page.route(/\b\/api\/franchise\/\d+\/close\b/i, async (r) => {
      closeCalled = true;
      await r.fulfill({ json: {} });
    });
    await page.route(/\b\/api\/franchise\/\d+\b/i, async (r) => {
      if (r.request().method() !== 'GET') {
        closeCalled = true;
        await r.fulfill({ json: {} });
      } else {
        await r.continue();
      }
    });

    await page.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/);
    expect(closeCalled).toBe(false);
  });

  test('Close calls service (DELETE/POST/PUT accepted) and navigates back', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await page.locator('tbody >> role=button[name="Close"]').first().click();
    await expect(page).toHaveURL(/\/admin-dashboard\/close-franchise$/);

    let called = false;
    let method = '';
    let url = '';

    await page.route(/\b\/api\/franchise\/\d+\/close\b/i, async (r) => {
      called = true;
      method = r.request().method();
      url = r.request().url();
      await r.fulfill({ status: 200, json: { ok: true } });
    });

    await page.route(/\b\/api\/franchise\/\d+\b/i, async (r) => {
      if (r.request().method() === 'DELETE') {
        called = true;
        method = r.request().method();
        url = r.request().url();
        await r.fulfill({ status: 200, json: { ok: true } });
      } else {
        await r.continue();
      }
    });

    await page.getByRole('button', { name: /^Close$/ }).click();

    await expect(page).toHaveURL(/\/admin-dashboard$/);

    expect(called).toBe(true);
    expect(method).toMatch(/DELETE|POST|PUT/);
    expect(url).toMatch(/\/api\/franchise\/1(\b|\/close\b)/);
  });
});

test('About: renders title, hero image, and main copy', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  await page.goto('/about');

  await expect(page.getByRole('heading', { name: /the secret sauce/i })).toBeVisible();
  await expect(page.locator('img[src$="jwt-pizza-logo.png"]')).toBeVisible();
  await expect(page.getByText(/our amazing employees/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /our employees/i })).toBeVisible();
  await expect(page.getByText(/pizza enthusiasts/i)).toBeVisible();
});

test('About: hero and avatar classes (spot-check styles)', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  await page.goto('/about');

  const hero = page.locator('img[src$="jwt-pizza-logo.png"]');
  await expect(hero).toHaveClass(/border-orange-700/);
  await expect(hero).toHaveClass(/w-64/);

  const avatars = page.getByRole('img', { name: /employee stock photo/i });
  await expect(avatars.nth(0)).toHaveClass(/rounded-full/);
  await expect(avatars.nth(0)).toHaveClass(/ring-2/);
});

test('FranchiseDashboard: empty state shows whyFranchise with login link, phone, image, and table headers', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }] })
  );

  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  await page.route(/\/api\/franchise(\/.*)?(\?.*)?$/i, async (r) => r.fulfill({ json: [] }));

  await page.goto('/franchise-dashboard');
  await expect(page.getByRole('heading', { name: /so you want a piece of the pie\?/i })).toBeVisible();

  const bodyLoginLink = page.locator('a[href="/franchise-dashboard/login"]');
  await expect(bodyLoginLink).toBeVisible();

  await expect(page.locator('img[src$="jwt-pizza-logo.png"]')).toBeVisible();

  await expect(page.getByRole('link', { name: '800-555-5555' })).toHaveAttribute('href', 'tel:800-555-5555');

  for (const h of ['Year', 'Profit', 'Costs', 'Franchise Fee']) {
    await expect(page.getByRole('columnheader', { name: new RegExp(h, 'i') })).toBeVisible();
  }
  await expect(page.getByRole('cell', { name: '2020' })).toBeVisible();
});

test('History: hero image has expected sizing and float class', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );

  await page.goto('/history');

  const hero = page.locator('img[src$="mamaRicci.png"]');
  await expect(hero).toBeVisible();

  await expect(hero).toHaveAttribute('class', /w-64/);
  await expect(hero).toHaveAttribute('class', /float-right/);
  await expect(hero).toHaveAttribute('class', /m-4/);
});
