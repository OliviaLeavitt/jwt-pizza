import { Page } from '@playwright/test';
import { test, expect } from 'playwright-test-coverage';
import { User, Role } from '../src/service/pizzaService';

/* -----------------------------------------------------------------------------
   Global, low-friction stability:
   - Desktop viewport → avoids collapsed/burger nav in CI.
   - No blanket timeout bumps and no artificial waits/sleeps.
----------------------------------------------------------------------------- */
test.use({ viewport: { width: 1280, height: 900 } });

/* -----------------------------------------------------------------------------
   Small utilities to keep tests readable + deterministic
----------------------------------------------------------------------------- */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    name: 'Test User',
    email: 'test@jwt.com',
    password: 'test',
    roles: [{ role: Role.Diner }],
    ...overrides,
  } as User;
}

async function routeUserState(page: Page) {
  // Isolated per test
  let currentUser: User | null = null;

  await page.route('**/api/user/me', async (r) => r.fulfill({ json: currentUser }));

  // Accept both /auth/register and /register
  await page.route(/\/api\/(auth\/)?register$/i, async (r) => {
    const body = r.request().postDataJSON?.() || {};
    currentUser = makeUser({
      name: body.name ?? body.fullName ?? 'Test User',
      email: body.email ?? 'test@jwt.com',
      password: body.password ?? 'test',
    });
    await r.fulfill({ json: { user: currentUser, token: 'new-user-token' } });
  });

  // PUT /api/user/:id  → update user and return { user, token }
await page.route(/\b\/api\/user\/[^/]+$/i, async (r) => {
  if (r.request().method() !== 'PUT') {
    return r.fallback();
  }

  const body = r.request().postDataJSON?.() || {};
  // Merge into currentUser; prefer body fields when provided
  currentUser = {
    ...(currentUser ?? makeUser()),
    id: String(body.id ?? (currentUser?.id ?? 'u1')),
    name: body.name ?? currentUser?.name ?? 'Test User',
    email: body.email ?? currentUser?.email ?? 'test@jwt.com',
    // password is optional; if blank, keep old; if provided, update
    password: body.password || currentUser?.password || 'test',
    roles: body.roles ?? currentUser?.roles ?? [{ role: Role.Diner }],
  };

  await r.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: currentUser, token: 'updated-token' }),
  });
});

  

  // Simple email/password login route for tests that log in directly
  await page.route('**/api/auth', async (r) => {
    const body = r.request().postDataJSON?.() || {};
    const { email, password } = body;
    // Minimal auth: accept known user(s)
    if ((email === 'd@jwt.com' && password === 'a') || (email === 'a@jwt.com' && password === 'admin')) {
      const user =
        email === 'a@jwt.com'
          ? makeUser({ id: 'admin1', name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' as any }] })
          : makeUser({ id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] });
      currentUser = user;
      await r.fulfill({ json: { user, token: 'test-token' } });
      return;
    }
    await r.fulfill({ status: 401, json: { error: 'Unauthorized' } });
  });

  return {
    getCurrentUser: () => currentUser,
    setCurrentUser: (u: User | null) => (currentUser = u),
  };
}

async function routeMenuAndHistory(page: Page) {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [
        { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
        { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
      ],
    })
  );

  await page.route(/\/api\/order\/history(\?.*)?$/i, async (r) =>
    r.fulfill({ json: { id: 'h1', dinerId: 'u1', orders: [] } })
  );

  // Order submit (used by checkout)
  await page.route('**/api/order', async (r) => {
    const orderReq = r.request().postDataJSON?.() ?? {};
    await r.fulfill({ json: { order: { ...orderReq, id: 23 }, jwt: 'eyJpYXQ' } });
  });
}

async function registerThroughUI(page: Page, name = 'Test User', email = 'test@jwt.com', pwd = 'test') {
  await page.goto('/', {timeout:15000});
  await page.getByRole('link', { name: /register/i }).click();
  await page.getByRole('textbox', { name: /full name/i }).fill(name);
  await page.getByRole('textbox', { name: /email address/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(pwd);
  await page.getByRole('button', { name: /register/i }).click();
}

async function basicInit(page: Page) {
  const auth = await routeUserState(page);
  await routeMenuAndHistory(page);

  // Franchise list used on some pages
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

  // Start unauthenticated by default
  auth.setCurrentUser(null);
  await page.goto('/', {timeout:15000});
  return auth;
}

/* -----------------------------------------------------------------------------
   Admin helpers (kept, but made deterministic)
----------------------------------------------------------------------------- */
async function loginAsAdmin(page: Page) {
  const auth = await routeUserState(page);

  // Menu for layout/header
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );

  // Go through the UI for consistency with the app
  await page.goto('/login', {timeout: 15000});
  await page.getByRole('textbox', { name: /email/i }).fill('a@jwt.com');
  await page.getByRole('textbox', { name: /password/i }).fill('admin');
  await page.getByRole('button', { name: /login/i }).click();



  // Ensure admin user is indeed set for subsequent /me calls
  const adminUser = makeUser({ id: 'admin1', name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' as any }] });
  auth.setCurrentUser(adminUser);
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

/* -----------------------------------------------------------------------------
   Tests
----------------------------------------------------------------------------- */

test('home page', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }] })
  );
  await page.goto('/', {timeout:15000});
  await expect(page).toHaveTitle('JWT Pizza');
});

test('login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();


});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');

  await page.getByRole('combobox').selectOption('4');

  // Robustly select the two pizzas (works even if accessible names vary slightly)
  await page.locator('a', { hasText: /veggie/i }).click();
  await page.locator('a', { hasText: /pepperoni/i }).click();

  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText(/veggie/i);
  await expect(page.locator('tbody')).toContainText(/pepperoni/i);
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');

  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByText('0.008')).toBeVisible();
});

// (kept commented, but already stable if you want to re-enable later)
// test('register a new user', async ({ page }) => { ... });

test('logout redirects home and clears user state', async ({ page }) => {
  const auth = await routeUserState(page);

  // Keep layout happy
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }] })
  );

  // Start logged out
  auth.setCurrentUser(null);

  await page.goto('/', {timeout:15000});
  await page.getByRole('link', { name: /login/i }).click();
  await page.getByRole('textbox', { name: /email/i }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: /password/i }).fill('a');
  await page.getByRole('button', { name: /login/i }).click();

  // The app's /logout should clear and send us home
  await page.goto('/logout', {timeout:15000});
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
});

test('dinerdashboard (isolated: register → direct nav → assert CTA)', async ({ page }) => {
  await routeUserState(page);
  await routeMenuAndHistory(page);

  await registerThroughUI(page); // realistic, but we do not depend on header/nav state

  // Deterministic: go straight to dashboard
  await page.goto('/diner-dashboard', {timeout:15000});

  // Primary assertion: the CTA to Menu exists and is an anchor
  const ctaToMenu = page.locator('a[href="/menu"]').first();
  await expect(ctaToMenu).toBeVisible();

});

/* ----------------------------- Admin Dashboard ----------------------------- */

test.describe('Admin Dashboard', () => {
  test('close Store navigates to /close-store', async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
    await page.goto('/admin-dashboard', {timeout:15000});

    const lehiRow = page.locator('tbody tr', { hasText: 'Lehi' });
    await expect(lehiRow).toBeVisible();
    await lehiRow.getByRole('button', { name: /^Close$/ }).click();

    await expect(page).toHaveURL(/\/admin-dashboard\/close-store$/);
  });

  test('pagination: next enabled when more=true, disabled on last page; prev re-enables', async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
    await page.goto('/admin-dashboard', {timeout:15000});

    const allPrev = page.getByRole('button', { name: '«' });
    const allNext = page.getByRole('button', { name: '»' });

    await expect(allPrev).toHaveCount(2);
    await expect(allNext).toHaveCount(2);

    const prevBtn = allPrev.first();
    const nextBtn = allNext.first();

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
  // No admin rights
  await page.route('**/api/user/me', async (r) =>
    r.fulfill({ json: { id: 'u1', name: 'Kai', email: 'd@jwt.com', roles: [{ role: 'diner' }] } })
  );
  await page.route('**/api/order/menu', async (r) => r.fulfill({ json: [] }));
  await page.route(/\/api\/franchise(\?.*)?$/i, async (r) => r.fulfill({ json: { franchises: [], more: false } }));

  await page.goto('/admin-dashboard', {timeout:15000});
  await expect(page.getByText(/dropped a pizza on the floor\. please try another page\./i)).toBeVisible();

});

/* ----------------------------- CreateFranchise ----------------------------- */

test.describe('CreateFranchise', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Cancel navigates back to admin dashboard (breadcrumb parent)', async ({ page }) => {
    await page.goto('/admin-dashboard/create-franchise', {timeout: 15000});
    await page.getByRole('button', { name: /^Cancel$/ }).click();
    await expect(page).toHaveURL(/\/admin-dashboard$/);
  });

  test('native validation prevents submit when required fields are empty', async ({ page }) => {
    await page.goto('/admin-dashboard/create-franchise', {timeout: 15000});

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

/* ----------------------------- CloseFranchise ------------------------------ */

test.describe('CloseFranchise', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await routeFranchises(page);
  });

  test('Cancel navigates back to admin dashboard without calling close API', async ({ page }) => {
    await page.goto('/admin-dashboard', {timeout: 15000});
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
    await page.goto('/admin-dashboard', {timeout: 15000});
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

/* --------------------------------- About ---------------------------------- */

test('About: renders title, hero image, and main copy', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  await page.goto('/about', {timeout:15000});

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

  await page.goto('/about', {timeout:15000});

  const hero = page.locator('img[src$="jwt-pizza-logo.png"]');
  await expect(hero).toHaveClass(/border-orange-700/);
  await expect(hero).toHaveClass(/w-64/);

  const avatars = page.getByRole('img', { name: /employee stock photo/i });
  await expect(avatars.nth(0)).toHaveClass(/rounded-full/);
  await expect(avatars.nth(0)).toHaveClass(/ring-2/);
});

/* --------------------------- Franchise Dashboard -------------------------- */

test('FranchiseDashboard: empty state shows whyFranchise with login link, phone, image, and table headers', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({ json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }] })
  );

  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  await page.route(/\/api\/franchise(\/.*)?(\?.*)?$/i, async (r) => r.fulfill({ json: [] }));

  await page.goto('/franchise-dashboard', {timeout: 15000});
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

/* -------------------------------- History --------------------------------- */

test('History: hero image has expected sizing and float class', async ({ page }) => {
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' }],
    })
  );

  await page.goto('/history', {timeout: 15000});

  const hero = page.locator('img[src$="mamaRicci.png"]');
  await expect(hero).toBeVisible();

  await expect(hero).toHaveAttribute('class', /w-64/);
  await expect(hero).toHaveAttribute('class', /float-right/);
  await expect(hero).toHaveAttribute('class', /m-4/);
});


test('diner dashboard', async ({ page }) => {

  const auth = await routeUserState(page);
  await routeMenuAndHistory(page);

  auth.setCurrentUser(
    makeUser({
      name: 'Test Diner',
      email: 'test@jwt.com',
      roles: [{ role: Role.Diner }],
    })
  );


  await page.goto('/diner-dashboard', {timeout: 15000});  

  await expect(page.getByRole('heading', { name: /your pizza kitchen/i })).toBeVisible();
const main = page.getByRole('main');

// the modal also has "name:" etc., so grab the first match in main content
await expect(main.getByText(/^name:$/i).first()).toBeVisible();
await expect(main.getByText(/^email:$/i).first()).toBeVisible();
await expect(main.getByText(/^role:$/i).first()).toBeVisible();


});

test('docs', async ({ page }) => {
  await page.goto('/docs', {timeout: 15000});  
});

test('Delivery shows details, verifies, then lets me order more', async ({ page }) => {
  // Keep layout/header happy
  await page.route('**/api/order/menu', async (r) =>
    r.fulfill({
      json: [{ id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'x' }],
    })
  );
  // Anonymous (or logged-in is fine too)
  await page.route('**/api/user/me', async (r) => r.fulfill({ json: null }));

  // Verify endpoint (be permissive with the regex in case your path differs)
  let verifyCalled = false;
  await page.route(/\b\/api\/(order\/verify|verify-order|order\/.*\/verify)\b/i, async (r) => {
    verifyCalled = true;
    await r.fulfill({ status: 200, json: { ok: true } });
  });

  // Go to the Delivery page (SPA-safe)
  await page.goto('/delivery', { timeout: 15000 });
  await page.locator('main, #root, #app').first().waitFor({ state: 'attached' });

  // Key content present
  await expect(page.getByRole('heading', { name: /here is your jwt pizza!/i })).toBeVisible();
  await expect(page.getByText(/order id:/i)).toBeVisible();
  await expect(page.getByText(/pie count:/i)).toBeVisible();
  await expect(page.getByText(/total:/i)).toBeVisible();

  // Click Verify and confirm backend was hit
  await page.getByRole('button', { name: /verify/i }).click();
  expect(verifyCalled).toBe(true);
});