import { expect, test } from '@playwright/test';
import { CAR, CAR_LOAN, createOffer, createPurchase, createSession, saveComparison, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  // Los borrados piden confirmación con el diálogo nativo
  page.on('dialog', dialog => dialog.accept());
});

test('crear una compra que no es un vehículo', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Añadir mi primera compra' }).click();

  // Los detalles de vehículo solo se piden para esa categoría
  await expect(page.getByLabel('Marca')).toBeHidden();
  await page.getByLabel('Tipo de compra').selectOption('vehicle');
  await expect(page.getByLabel('Marca')).toBeVisible();
  await page.getByLabel('Marca').fill('Bosch');
  await page.getByLabel('Tipo de compra').selectOption('home');
  await expect(page.getByLabel('Marca')).toBeHidden();

  await page.getByLabel('Nombre').fill('Lavadora y secadora');
  await page.getByLabel('Precio al contado').fill('1200');
  await page.getByRole('button', { name: 'Crear compra' }).click();

  await expect(page.getByRole('heading', { name: 'Lavadora y secadora' })).toBeVisible();
  await expect(page.getByText('Hogar y electrodomésticos')).toBeVisible();
  await expect(page.getByText(/1200,00\s€/)).toBeVisible();
  // La marca escrita mientras era "vehículo" no se guarda
  await expect(page.getByText('Bosch')).toBeHidden();
});

test('el formulario de compra valida los campos obligatorios', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Añadir mi primera compra' }).click();
  await page.getByRole('button', { name: 'Crear compra' }).click();

  await expect(page.getByText('Nombre requerido')).toBeVisible();
  await expect(page.getByText('Precio requerido')).toBeVisible();
});

test('editar un vehículo conserva sus detalles', async ({ page, request }) => {
  const session = await createSession(request);
  await createPurchase(request, session);
  await signIn(page, session);
  await page.goto('/dashboard');

  await expect(page.getByText('Seat León (2024)')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Seat León' }).click();

  await expect(page.getByLabel('Tipo de compra')).toHaveValue('vehicle');
  await expect(page.getByLabel('Marca')).toHaveValue('Seat');
  await expect(page.getByLabel('Precio al contado')).toHaveValue('25000.00');

  await page.getByLabel('Precio al contado').fill('24500');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByText(/24\.500,00\s€/)).toBeVisible();
});

test('cancelar el formulario cierra el modal sin salir de la página', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Añadir compra', exact: true }).click();
  await expect(page.getByRole('heading', { name: '¿Qué quieres comprar?' })).toBeVisible();

  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByRole('heading', { name: '¿Qué quieres comprar?' })).toBeHidden();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('borrar una compra elimina sus ofertas y comparativas', async ({ page, request }) => {
  const session = await createSession(request);
  const purchase = await createPurchase(request, session);
  const offer = await createOffer(request, session, purchase.id, CAR_LOAN);
  await saveComparison(request, session, purchase.id, offer.id);
  await signIn(page, session);

  await page.goto('/comparisons');
  await expect(page.getByText(CAR.name)).toBeVisible();

  await page.goto('/dashboard');
  await page.getByRole('button', { name: `Borrar ${CAR.name}` }).click();
  await expect(page.getByText('Todavía no hay compras')).toBeVisible();

  await page.goto('/comparisons');
  await expect(page.getByText('No hay comparativas guardadas')).toBeVisible();
});
