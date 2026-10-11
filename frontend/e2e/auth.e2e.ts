import { expect, test } from '@playwright/test';
import { loginThroughUi } from './helpers';

test('las rutas privadas redirigen al login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('el login valida el email', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText('Email inválido')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);

  // Un email mal escrito lo frena el propio navegador antes de enviar
  await page.getByLabel('Email').fill('esto-no-es-un-email');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('iniciar y cerrar sesión', async ({ page }) => {
  await loginThroughUi(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Todavía no hay compras')).toBeVisible();

  // La sesión sobrevive a una recarga
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis compras' })).toBeVisible();

  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
