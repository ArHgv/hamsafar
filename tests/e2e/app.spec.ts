import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const pageErrors = new WeakMap<import('@playwright/test').Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});
const demoId = 'a81d2000-2f64-47b1-9c12-000000000001';
async function documents(page: import('@playwright/test').Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('hamsafar-v1')!).state.trips);
}
test('Persian dashboard, command search and trip navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /سفر بعدی‌ات/ })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: 'جست‌وجو', exact: true }).fill('کاشان');
  await dialog.getByRole('link', { name: /رنگ و آرامش در کاشان/ }).click();
  await expect(
    page.getByRole('heading', { name: 'رنگ و آرامش در کاشان', exact: true }),
  ).toBeVisible();
});
test('creates a two-person trip while keeping every transport detail optional', async ({
  page,
}) => {
  await page.goto('/trips/new');
  await expect(page.getByRole('heading', { name: 'کجا می‌خواهی بروی؟' })).toBeVisible();
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.getByText('این فیلد را تکمیل کنید').first()).toBeVisible();
  await page.getByLabel('اسم این سفر').fill('سفر آزمایشی به شیراز');
  await page.getByLabel('مقصد').fill('شیراز');
  await page.getByRole('button', { name: 'هواپیما', exact: true }).click();
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await page.getByRole('button', { name: 'افزایش نفرات' }).click();
  await page.getByLabel('نام هم‌سفر ۲').fill('رضا');
  await page.getByLabel('بودجه کلی').fill('۲٬۰۰۰٬۰۰۰');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'یک نگاه به مسیر.' })).toBeVisible();
  await page.getByRole('button', { name: 'سفر را بساز' }).click();
  await expect(
    page.getByRole('heading', { name: 'سفر آزمایشی به شیراز', level: 1, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'سفر آزمایشی به شیراز', level: 1, exact: true }),
  ).toBeVisible();
  const trips = await documents(page),
    trip = trips.find((t: { title: string }) => t.title === 'سفر آزمایشی به شیراز');
  expect(trip.members).toHaveLength(2);
  expect(trip.transport.mode).toBe('plane');
  expect(trip.transport.outbound.departureTime).toBeUndefined();
  expect(trip.budget).toBe(2000000);
});
test('packs a checklist, adds an item and persists both after refresh', async ({ page }) => {
  await page.goto('/checklist');
  await expect(page.getByRole('heading', { name: 'کیف سفر', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'آماده کردن کفش پیاده‌روی', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'برداشتن تیک کفش پیاده‌روی', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'افزودن وسیله', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('نام وسیله').fill('عینک آفتابی آزمایشی');
  await d.getByLabel('تعداد').fill('۲');
  await d.getByRole('button', { name: 'افزودن وسیله', exact: true }).click();
  await expect(page.getByText('عینک آفتابی آزمایشی', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('عینک آفتابی آزمایشی', { exact: true })).toBeVisible();
  const trip = (await documents(page)).find((t: { id: string }) => t.id === demoId);
  expect(
    trip.checklist.find((i: { name: string }) => i.name === 'عینک آفتابی آزمایشی').quantity,
  ).toBe(2);
});
test('records equal, custom and percentage splits with exact money conservation', async ({
  page,
}) => {
  await page.goto('/expenses');
  await expect(page.getByRole('heading', { name: 'هزینه‌های سفر', exact: true })).toBeVisible();
  for (const mode of ['equal', 'custom', 'percentage']) {
    await page.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('مبلغ هزینه').fill('۱۰۰۱');
    await d.getByLabel('بابت چی؟').fill(`هزینه آزمایشی ${mode}`);
    if (mode === 'custom') {
      await d.getByRole('button', { name: 'مبلغ دلخواه', exact: true }).click();
      for (const [name, value] of [
        ['نیکا', '۴۰۱'],
        ['آرمان', '۳۰۰'],
        ['سارا', '۲۰۰'],
        ['پویا', '۱۰۰'],
      ])
        await d.getByLabel(`سهم ${name}`).fill(value);
    }
    if (mode === 'percentage') {
      await d.getByRole('button', { name: 'درصدی', exact: true }).click();
      for (const [name, value] of [
        ['نیکا', '۵۰'],
        ['آرمان', '۲۵'],
        ['سارا', '۱۵'],
        ['پویا', '۱۰'],
      ])
        await d.getByLabel(`سهم ${name}`).fill(value);
    }
    await d.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
    await expect(page.getByText(`هزینه آزمایشی ${mode}`, { exact: true })).toBeVisible();
  }
  const trip = (await documents(page)).find((t: { id: string }) => t.id === demoId);
  const expenses = trip.expenses.filter((e: { title: string }) =>
    e.title.startsWith('هزینه آزمایشی'),
  );
  expect(expenses).toHaveLength(3);
  for (const e of expenses)
    expect(e.shares.reduce((n: number, s: { amount: number }) => n + s.amount, 0)).toBe(e.amount);
  expect(
    expenses
      .find((e: { splitMode: string }) => e.splitMode === 'equal')
      .shares.map((s: { amount: number }) => s.amount),
  ).toEqual([251, 250, 250, 250]);
  expect(
    expenses
      .find((e: { splitMode: string }) => e.splitMode === 'percentage')
      .shares.map((s: { amount: number }) => s.amount),
  ).toEqual([501, 250, 150, 100]);
});
test('blocks mismatched percentages and validates the expense in Persian', async ({ page }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('مبلغ هزینه').fill('۱۰۰۰');
  await d.getByLabel('بابت چی؟').fill('نباید ذخیره شود');
  await d.getByRole('button', { name: 'درصدی', exact: true }).click();
  await d.getByLabel('سهم نیکا').fill('۹۹');
  await d.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
  await expect(d).toBeVisible();
  expect(
    (await documents(page)).find((t: { id: string }) => t.id === demoId).expenses,
  ).toHaveLength(4);
});
test('records a real-world settlement without changing expense totals', async ({ page }) => {
  await page.goto('/settlements');
  await expect(page.getByRole('heading', { name: 'تسویه حساب', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ثبت پرداخت', exact: true }).first().click();
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'تأیید و ثبت پرداخت' }).click();
  await expect(page.getByRole('heading', { name: 'پرداخت‌های ثبت‌شده' })).toBeVisible();
  const trip = (await documents(page)).find((t: { id: string }) => t.id === demoId);
  expect(trip.settlements).toHaveLength(1);
  expect(trip.expenses.reduce((n: number, e: { amount: number }) => n + e.amount, 0)).toBe(6000000);
});
test('adds a daily plan, marks it done and cancels it', async ({ page }) => {
  await page.goto('/planning');
  await page.getByRole('button', { name: 'افزودن برنامه', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('نام برنامه').fill('قدم‌زدن آزمایشی');
  await d.getByLabel('مدت تقریبی (دقیقه)').fill('۹۰');
  await d.getByRole('button', { name: 'افزودن برنامه', exact: true }).click();
  await expect(page.getByRole('button', { name: 'قدم‌زدن آزمایشی', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'انجام‌شده کردن قدم‌زدن آزمایشی', exact: true }).click();
  await page.getByRole('button', { name: 'گزینه‌های قدم‌زدن آزمایشی', exact: true }).click();
  await page.getByRole('button', { name: 'لغو این برنامه', exact: true }).click();
  const trip = (await documents(page)).find((t: { id: string }) => t.id === demoId);
  expect(trip.activities.find((a: { title: string }) => a.title === 'قدم‌زدن آزمایشی').status).toBe(
    'cancelled',
  );
});
test('manages companions and clearly distinguishes local mode from real invitations', async ({
  page,
}) => {
  await page.goto('/groups');
  await expect(page.getByRole('heading', { name: 'هم‌سفرها', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'افزودن همراه', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('نام').fill('همراه آزمایشی');
  await d.getByLabel('ایمیل').fill('test@example.com');
  await d.getByLabel('سطح دسترسی').selectOption('viewer');
  await d.getByRole('button', { name: 'افزودن همراه', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'همراه آزمایشی', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'دعوت با لینک', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'برای دعوت واقعی، اتصال ابری لازم است.' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'لینک دعوت', exact: true })).toHaveCount(0);
});
test('saves geographic coordinates and opens the actual map selection', async ({ page }) => {
  await page.goto('/locations');
  await page.getByRole('button', { name: 'ثبت مکان', exact: true }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('نام مکان').fill('نشانی آزمایشی');
  await d.getByLabel('عرض جغرافیایی').fill('۳۷.۲۸');
  await d.getByLabel('طول جغرافیایی').fill('۴۹.۵۸');
  await d.getByRole('button', { name: 'ذخیره مکان', exact: true }).click();
  await expect(page.getByText('نشانی آزمایشی', { exact: true })).toBeVisible();
  await page
    .getByRole('complementary', { name: 'فهرست مکان‌ها' })
    .getByRole('button', { name: /^نشانی آزمایشی/ })
    .click();
  await expect(page.getByRole('link', { name: /مسیریابی در گوگل‌مپ/ })).toHaveAttribute(
    'href',
    /google.com\/maps\/dir/,
  );
});
test('updates transport data and permits missing tickets', async ({ page }) => {
  await page.goto(`/trips/${demoId}?tab=transport`);
  await page.getByRole('button', { name: 'ویرایش مسیر' }).click();
  const d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'قطار', exact: true }).click();
  await d.getByLabel('شماره قطار').fill('۱۲۳');
  await d.getByLabel('شماره سکو').fill('۳');
  await d.getByRole('button', { name: 'ذخیره مسیر' }).click();
  const trip = (await documents(page)).find((t: { id: string }) => t.id === demoId);
  expect(trip.transport.mode).toBe('train');
  expect(trip.transport.outbound.routeNumber).toBe('۱۲۳');
  expect(trip.transport.outbound.ticket).toBeUndefined();
});
test('keeps every page responsive without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of [
    '/',
    '/trips',
    '/planning',
    '/checklist',
    '/expenses',
    '/settlements',
    '/locations',
    '/groups',
    '/settings',
    '/trips/new',
    '/welcome',
    '/login',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      `Overflow at ${route}`,
    ).toBe(true);
  }
});
test('has no serious or critical accessibility violations on the main flows', async ({ page }) => {
  for (const route of ['/', '/trips/new', '/expenses', '/groups']) {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('.page-content > div[style], .landing-hero-copy')).every(
        (el) => Number(getComputedStyle(el).opacity) >= 0.999,
      ),
    );
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const important = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      important.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      `Accessibility at ${route}`,
    ).toEqual([]);
  }
});

test('switches to a readable light theme, remembers it and reduces transparency', async ({
  page,
}) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'روشن', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.getByRole('checkbox', { name: 'کاهش شفافیت', exact: true }).check();
  await expect(page.locator('html')).toHaveClass(/reduce-transparency/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  for (const route of ['/', '/trips/new', '/expenses', '/groups']) {
    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll('.page-transition')).every(
        (el) => Number(getComputedStyle(el).opacity) >= 0.999,
      ),
    );
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
  }
});
test('backs up, clears local trips and restores the JSON without fabricated cloud ownership', async ({
  page,
}) => {
  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'دریافت نسخه پشتیبان' }).click(),
  ]);
  const file = await download.path();
  expect(file).toBeTruthy();
  await page.getByRole('button', { name: 'پاک کردن سفرهای محلی', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByRole('button', { name: 'پاک کردن اطلاعات محلی', exact: true }).click();
  expect(await documents(page)).toHaveLength(0);
  await page.getByLabel('انتخاب فایل پشتیبان').setInputFiles(file!);
  d = page.getByRole('dialog');
  await expect(d.getByRole('heading', { name: 'اطلاعات پشتیبان بازیابی شود؟' })).toBeVisible();
  await d.getByRole('button', { name: 'بازیابی اطلاعات', exact: true }).click();
  expect(await documents(page)).toHaveLength(3);
  await page.goto('/trips');
  await expect(
    page.getByRole('heading', { name: 'چند روز آرام‌تر، در گیلان', exact: true }),
  ).toBeVisible();
});
test('preserves decimal and negative coordinate keystrokes instead of rewriting partial input', async ({
  page,
}) => {
  await page.goto('/locations');
  await page.getByRole('button', { name: 'ثبت مکان', exact: true }).click();
  const d = page.getByRole('dialog');
  const lat = d.getByLabel('عرض جغرافیایی');
  await lat.fill('');
  await lat.pressSequentially('-37.2');
  await expect(lat).toHaveValue('-37.2');
  await d.getByLabel('نام مکان').fill('نیم‌کره جنوبی');
  await d.getByRole('button', { name: 'ذخیره مکان', exact: true }).click();
  const t = (await documents(page)).find((trip: { id: string }) => trip.id === demoId);
  expect(
    t.locations.find((location: { name: string }) => location.name === 'نیم‌کره جنوبی').latitude,
  ).toBe(-37.2);
});
test('offers a Persian Jalali calendar and an optional twenty-four-hour clock', async ({
  page,
}) => {
  await page.goto('/trips/new');
  await page.getByLabel('تاریخ رفت').click();
  const calendar = page.locator('.calendar-popover');
  await expect(calendar.getByText('گاه‌شمار خورشیدی')).toBeVisible();
  await expect(calendar.getByRole('combobox', { name: 'ماه', exact: true })).toBeVisible();
  await calendar.getByRole('button', { name: 'امروز', exact: true }).click();
  await expect(page.getByLabel('تاریخ رفت')).toContainText(/[۰-۹]/);
  await page.goto(`/trips/${demoId}?tab=transport`);
  await page.getByRole('button', { name: 'ویرایش مسیر' }).click();
  const d = page.getByRole('dialog');
  await d.getByLabel('ساعت حرکت رفت').click();
  const clock = page.locator('.time-popover');
  await clock.getByRole('combobox', { name: 'ساعت', exact: true }).selectOption('21');
  await clock.getByRole('combobox', { name: 'دقیقه', exact: true }).selectOption('05');
  await clock.getByRole('button', { name: 'انتخاب', exact: true }).click();
  await d.getByRole('button', { name: 'ذخیره مسیر' }).click();
  expect(
    (await documents(page)).find((t: { id: string }) => t.id === demoId).transport.outbound
      .departureTime,
  ).toBe('21:05');
});
test('recovers malformed local storage without a crash or silently losing the raw backup', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('hamsafar-v1', '{"broken":'));
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: /به سلیقه/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /دریافت داده خام/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hamsafar-recovery'))).toBe('{"broken":');
});
test('keeps a PDF receipt in IndexedDB after refreshing the expense editor', async ({ page }) => {
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
  let d = page.getByRole('dialog');
  await d.getByLabel('مبلغ هزینه').fill('۵۰۰۰');
  await d.getByLabel('بابت چی؟').fill('رسید آزمایشی');
  await d.getByLabel('پیوست رسید').setInputFiles({
    name: 'receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%%EOF'),
  });
  await expect(d.getByRole('button', { name: 'receipt.pdf', exact: true })).toBeVisible();
  await d.getByRole('button', { name: 'ثبت هزینه', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^رسید آزمایشی/ }).click();
  d = page.getByRole('dialog');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    d.getByRole('button', { name: 'receipt.pdf', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('receipt.pdf');
});

test('Enter advances each form stage without creating a trip before the final review', async ({
  page,
}) => {
  await page.goto('/trips/new');
  await page.getByLabel('اسم این سفر').fill('سفر با صفحه‌کلید');
  await page.getByLabel('مقصد').fill('شیراز');
  await page.getByLabel('مقصد').press('Enter');
  await expect(page.getByLabel('بودجه کلی')).toBeVisible();
  await page.getByLabel('بودجه کلی').fill('۱۰۰۰۰۰');
  await page.getByLabel('بودجه کلی').press('Enter');
  await expect(page.getByRole('heading', { name: 'یک نگاه به مسیر.' })).toBeVisible();
  expect(await documents(page)).toHaveLength(3);
  await page.getByRole('button', { name: 'سفر را بساز', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'سفر با صفحه‌کلید', level: 1, exact: true }),
  ).toBeVisible();
  expect(await documents(page)).toHaveLength(4);
});
