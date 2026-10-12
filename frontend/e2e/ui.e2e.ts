import { expect, test, type Page } from '@playwright/test';
import { createOffer, createPurchase, createSession, signIn } from './helpers';

async function expectInsideViewport(page: Page) {
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const box = (await tooltip.boundingBox())!;
  const viewport = page.viewportSize()!;

  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('el tooltip del formulario de oferta no se recorta dentro del modal', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  await signIn(page, session);
  await page.goto(`/purchases/${purchase.id}`);
  await page.getByRole('button', { name: 'Añadir la primera oferta' }).click();

  await page.getByText('¿Qué diferencia hay entre TIN y TAE?').hover();

  await expectInsideViewport(page);
  await expect(page.getByRole('tooltip')).toContainText('Coste real total anual');

  await page.mouse.move(0, 0);
  await expect(page.getByRole('tooltip')).toBeHidden();
});

test('los tooltips junto al borde derecho no se salen de la pantalla', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  // "TIN" es la última columna de los detalles financieros
  await page.getByText('TIN', { exact: true }).hover();

  await expectInsideViewport(page);
});

test('el glosario busca sin distinguir tildes', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/glossary');
  const terms = page.locator('dt');
  const total = await terms.count();
  expect(total).toBeGreaterThan(5);

  await page.getByLabel('Buscar un término').fill('amortizacion');

  await expect(terms).toHaveCount(1);
  await expect(terms).toHaveText('Comisión por amortización anticipada');

  await page.getByLabel('Buscar un término').fill('zzzz');
  await expect(page.getByText(/No hay ningún término/)).toBeVisible();
});

test.describe('en móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('las pantallas principales no tienen scroll horizontal', async ({ page, request }) => {
    const session = await createSession(request);
    const purchase = await createPurchase(request, session);
    const offer = await createOffer(request, session, purchase.id);
    await signIn(page, session);

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Seat León' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto(`/purchases/${purchase.id}`);
    await expect(page.getByRole('heading', { name: 'Banco Ejemplo' })).toBeVisible();
    await expectNoHorizontalScroll(page);

    await page.goto(`/compare/${purchase.id}/${offer.id}`);
    await expect(page.getByRole('heading', { name: 'Análisis y alertas' })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test('el menú de navegación se abre y navega', async ({ page, request }) => {
    await signIn(page, await createSession(request));
    await page.goto('/dashboard');

    // El pie también enlaza al glosario: se mira solo la barra de navegación
    const nav = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(nav.getByRole('link', { name: 'Glosario' })).toBeHidden();
    await nav.locator('button[aria-controls="mobile-menu"]').click();
    await nav.getByRole('link', { name: 'Glosario' }).click();

    await expect(page.getByRole('heading', { name: 'Glosario financiero' })).toBeVisible();
  });
});

test('el formulario en modal retiene el foco y se cierra con Escape', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/dashboard');
  const opener = page.getByRole('button', { name: 'Añadir mi primera compra' });
  await opener.click();

  const dialog = page.getByRole('dialog', { name: 'Nueva compra' });
  await expect(dialog).toBeVisible();
  // El foco entra en el modal y, por muchas veces que se tabule, no sale a la página de debajo
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const focusInPage = await page.evaluate(() => {
      const active = document.activeElement;
      return active !== null && active !== document.body && active.closest('dialog') === null;
    });
    expect(focusInPage).toBe(false);
  }

  // Un clic fuera no cierra el formulario: se perdería lo escrito
  await page.getByLabel('Nombre').fill('Lavadora');
  await page.mouse.click(5, 5);
  await expect(page.getByLabel('Nombre')).toHaveValue('Lavadora');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});
