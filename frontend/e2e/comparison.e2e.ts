import { expect, test } from '@playwright/test';
import { BALLOON_LOAN, CAR, createOffer, createPurchase, createSession, saveComparison, signIn } from './helpers';

test('añadir una oferta desde el formulario', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  await signIn(page, session);
  await page.goto(`/purchases/${purchase.id}`);

  await page.getByRole('button', { name: 'Añadir la primera oferta' }).click();
  await page.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(page.getByText('Cuota requerida')).toBeVisible();

  await page.getByLabel('Entidad que financia').fill('Banco Ejemplo');
  await page.getByLabel('Entrada inicial').fill('5000');
  await page.getByLabel('TIN %').fill('6.5');
  await page.getByLabel('TAE %').fill('7.2');
  await page.getByLabel('Plazo (meses)').fill('60');
  await page.getByLabel('Cuota mensual').fill('391.32');
  await page.getByLabel('Comisión apertura %').fill('1.5');
  await page.getByLabel('Seguro obligatorio/año').fill('300');
  await page.getByRole('button', { name: 'Crear oferta' }).click();

  await expect(page.getByRole('heading', { name: 'Banco Ejemplo' })).toBeVisible();
  // 5.000 entrada + 23.479,20 cuotas + 1.500 seguro + 300 comisión
  await expect(page.getByText(/30\.279,20\s€/)).toBeVisible();
  await expect(page.getByText(/Cuesta de más 5279,20\s€/)).toBeVisible();
});

test('analizar una oferta y aplicar la situación personal', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  await expect(page.getByText('Financiar te cuesta de más')).toBeVisible();
  await expect(page.getByText(/30\.279,20\s€/).first()).toBeVisible();
  await expect(page.getByText('7,37%')).toBeVisible(); // TAE efectiva, por encima de la declarada por la comisión
  await expect(page.getByText(/Comisión de apertura del 1\.50%: es alta/)).toBeVisible();
  await expect(page.getByText('Cuota / Ingresos mensuales')).toBeHidden();

  await page.getByLabel('Ingresos netos al mes').fill('1100');
  await page.getByLabel('Ahorros disponibles').fill('6000');
  await page.getByRole('button', { name: 'Actualizar análisis' }).click();

  await expect(page.getByText('35,57%')).toBeVisible(); // 391,32 / 1.100
  await expect(page.getByText(/Riesgo alto de sobreendeudamiento/)).toBeVisible();
  await expect(page.getByText(/Tras la entrada te quedarían 1000\.00€/)).toBeVisible();
});

test('la cuota final cuenta en el coste total', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id, BALLOON_LOAN);
  await signIn(page, session);

  await page.goto(`/purchases/${purchase.id}`);
  await expect(page.getByText(/Cuota final: 10\.000,00\s€/)).toBeVisible();

  await page.goto(`/compare/${purchase.id}/${offer.id}`);
  await expect(page.getByText('Cuota final para que sea tuyo')).toBeVisible();
  // 5.000 entrada + 13.983,36 cuotas + 10.000 cuota final
  await expect(page.getByText(/28\.983,36\s€/).first()).toBeVisible();
  await expect(page.getByText(/Al terminar las cuotas quedan 10000\.00€ por pagar/)).toBeVisible();
});

test('guardar una comparativa y abrir su enlace sin sesión', async ({ page, request, browser }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  await page.getByLabel('Ingresos netos al mes').fill('1100');
  await page.getByRole('button', { name: 'Actualizar análisis' }).click();
  await expect(page.getByText('35,57%')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar comparativa' }).click();
  const shareUrl = await page.getByLabel('Enlace para compartir').inputValue();
  expect(shareUrl).toMatch(/\/c\/[\w-]+$/);

  await page.goto('/comparisons');
  await expect(page.getByText(CAR.name)).toBeVisible();
  await expect(page.getByText('Banco Ejemplo')).toBeVisible();

  // Otra persona, sin sesión, abre el enlace
  const visitor = await (await browser.newContext({ locale: 'es-ES' })).newPage();
  await visitor.goto(shareUrl);
  await expect(visitor.getByRole('heading', { name: CAR.name })).toBeVisible();
  await expect(visitor.getByText(/30\.279,20\s€/)).toBeVisible();
  await expect(visitor.getByRole('heading', { name: 'Análisis y alertas' })).toBeVisible();
  // Ni los datos personales ni las alertas que los delatan viajan en el enlace
  await expect(visitor.getByText(/Financiar cuesta .* más que pagar al contado/)).toBeVisible();
  await expect(visitor.getByText(/ingresos|sobreendeudamiento|35[.,]57/)).toHaveCount(0);
  await visitor.context().close();
});

test('el enlace compartido no cambia si después se edita la oferta', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  const comparison = await saveComparison(request, session, purchase.id, offer.id);
  await signIn(page, session);
  page.on('dialog', dialog => dialog.accept());

  await page.goto(`/purchases/${purchase.id}`);
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Cuota mensual').fill('500');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/500,00\s€/)).toBeVisible();

  await page.goto(`/c/${comparison.shared_slug}`);
  await expect(page.getByText(/391,32\s€/)).toBeVisible();
  await expect(page.getByText(/30\.279,20\s€/)).toBeVisible();
});

test('un enlace que no existe muestra un aviso', async ({ page }) => {
  await page.goto('/c/no-existe');

  await expect(page.getByRole('heading', { name: 'Comparativa no encontrada' })).toBeVisible();
});
