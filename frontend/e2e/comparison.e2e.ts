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
  await expect(page.getByText(/Cuesta de más 5\.279,20\s€/)).toBeVisible();
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
  await expect(page.getByText(/Comisión de apertura del 1,5%: es alta/)).toBeVisible();
  await expect(page.getByText('Cuota / Ingresos mensuales')).toBeHidden();

  await page.getByLabel('Ingresos netos al mes').fill('1100');
  await page.getByLabel('Ahorros disponibles').fill('6000');
  await page.getByRole('button', { name: 'Actualizar análisis' }).click();

  await expect(page.getByText('35,57%', { exact: true })).toBeVisible(); // 391,32 / 1.100
  await expect(page.getByText(/Riesgo alto de sobreendeudamiento/)).toBeVisible();
  await expect(page.getByText(/Tras la entrada te quedarían 1\.000,00\s€/)).toBeVisible();
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
  await expect(page.getByText(/Al terminar las cuotas quedan 10\.000,00\s€ por pagar \(40% del precio\)/)).toBeVisible();
});

test('guardar una comparativa y abrir su enlace sin sesión', async ({ page, request, browser }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  await page.getByLabel('Ingresos netos al mes').fill('1100');
  await page.getByRole('button', { name: 'Actualizar análisis' }).click();
  await expect(page.getByText('35,57%', { exact: true })).toBeVisible();
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

test('con varias ofertas se comparan lado a lado y se señala la más barata', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/purchases/${purchase.id}`);

  // Con una sola oferta no hay nada que comparar
  await expect(page.getByText(/Cuesta de más 5\.279,20\s€/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comparativa de ofertas' })).toHaveCount(0);

  // Más entrada y menos plazo: cuota más alta, pero 26.200 € en total
  await createOffer(request, session, purchase.id, {
    source_name: 'Banco Corto', down_payment: '10000', tin: '5', tae: '5.2', months: 36, monthly_payment: '450',
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Comparativa de ofertas' })).toBeVisible();
  const rows = page.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Banco Corto');
  await expect(rows.nth(0)).toContainText('La más barata');
  await expect(rows.nth(0)).toContainText(/26\.200,00\s€/);
  await expect(rows.nth(1)).toContainText('Banco Ejemplo');
  await expect(rows.nth(1)).toContainText('Cuota más baja');
  await expect(page.getByTestId('verdict')).toContainText('La más barata es Banco Corto');
  await expect(page.getByTestId('verdict')).toContainText('Ojo: Banco Ejemplo tiene la cuota más baja');

  // Desde la tabla se llega al análisis de cada oferta, que abre con su veredicto
  await rows.nth(0).getByRole('link', { name: 'Banco Corto' }).click();
  await expect(page.getByTestId('verdict')).toContainText(/Financiar con Banco Corto te cuesta 1\.200,00\s€ más que pagar al contado/);
});

test('el cuadro de amortización reparte cada cuota entre intereses y capital', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  const card = page.getByTestId('amortization');
  await expect(card.getByText(/De la primera cuota, 108,33\s€ son intereses/)).toBeVisible();
  await expect(card.getByRole('img', { name: /Reparto de cada cuota/ })).toBeVisible();

  // Por años: 5 filas, y los intereses suman lo pagado de más sobre los 20.000 € prestados
  const rows = card.locator('tbody tr');
  await expect(rows).toHaveCount(5);
  await expect(card.locator('tfoot')).toContainText(/3\.479,20\s€/);
  await expect(rows.last()).toContainText(/0,00\s€/);

  await card.getByRole('button', { name: 'Ver mes a mes' }).click();
  await expect(rows).toHaveCount(60);
  await expect(rows.first()).toContainText(/282,99\s€/);
});

test('el simulador recalcula la oferta con otra entrada y otro plazo', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id);
  await signIn(page, session);
  await page.goto(`/compare/${purchase.id}/${offer.id}`);

  await expect(page.getByText(/Ahora ves la oferta tal como es: 391,32\s€ al mes/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver a la oferta' })).toBeDisabled();

  await page.getByLabel('Entrada').fill('10000');
  await page.getByLabel('Plazo').fill('36');

  // 15.000 € al mismo 6,5 % a 36 meses; el seguro de 300 €/año son 900 €
  const scenario = page.getByTestId('scenario');
  await expect(scenario).toContainText(/459,73\s€/);
  await expect(scenario).toContainText(/27\.675,28\s€/);
  await expect(scenario).toContainText(/acabarías pagando 2\.603,92\s€ menos/);

  await page.getByRole('button', { name: 'Volver a la oferta' }).click();
  await expect(scenario).toHaveCount(0);
  await expect(page.getByLabel('Plazo')).toHaveValue('60');
});
