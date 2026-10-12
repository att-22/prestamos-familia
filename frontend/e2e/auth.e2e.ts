import { expect, test } from '@playwright/test';
import {
  CAR, PASSWORD, confirmDialog, createPurchase, createSession, deleteAccount, registerAccount, signIn, uniqueEmail,
} from './helpers';

test('las rutas privadas redirigen al login', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('el login valida los campos antes de enviar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('esto-no-es-un-email');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText('Email inválido')).toBeVisible();
  await expect(page.getByText('Escribe tu contraseña')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('iniciar y cerrar sesión', async ({ page, request }) => {
  const email = await registerAccount(request);
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Todavía no hay compras')).toBeVisible();

    // La sesión sobrevive a una recarga
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mis compras' })).toBeVisible();

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  } finally {
    await deleteAccount(request, email);
  }
});

test('una contraseña incorrecta muestra el error sin salir del login', async ({ page, request }) => {
  const email = await registerAccount(request);
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill('no-es-esta-clave');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
    await expect(page).toHaveURL(/\/login$/);
    // Lo escrito sigue ahí para corregirlo
    await expect(page.getByLabel('Email')).toHaveValue(email);
  } finally {
    await deleteAccount(request, email);
  }
});

test('crear una cuenta con un email autorizado', async ({ page, request }) => {
  const email = uniqueEmail();
  try {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Crea tu cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Repite la contraseña').fill('otra-distinta-1');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();

    await page.getByLabel('Repite la contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Todavía no hay compras')).toBeVisible();
  } finally {
    await deleteAccount(request, email);
  }
});

test('un email no autorizado no puede registrarse', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Crea tu cuenta' }).click();

  await page.getByLabel('Email').fill('extrano@otro-dominio.com');
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Repite la contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('alert')).toContainText('no está autorizado');
  await expect(page).toHaveURL(/\/login$/);
});

test('al cambiar de usuario en el mismo navegador no se ven los datos del anterior', async ({ page, request }) => {
  const first = await createSession(request);
  await createPurchase(request, first, { ...CAR, name: 'Coche del primero' });
  const second = await registerAccount(request);
  try {
    await signIn(page, first);
    await page.goto('/dashboard');
    await expect(page.getByText('Coche del primero')).toBeVisible();

    await page.getByRole('button', { name: 'Salir' }).click();
    await page.getByLabel('Email').fill(second);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('heading', { name: 'Mis compras' })).toBeVisible();
    await expect(page.getByText('Todavía no hay compras')).toBeVisible();
    await expect(page.getByText('Coche del primero')).toHaveCount(0);
  } finally {
    await deleteAccount(request, second);
  }
});

test('borrar la propia cuenta desde «Mi cuenta»', async ({ page, request }) => {
  const email = await registerAccount(request);
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Mi cuenta' }).click();
    await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    // Cancelar deja la cuenta como estaba
    await page.getByRole('button', { name: 'Borrar mi cuenta' }).click();
    await expect(page.getByRole('alertdialog')).toContainText('No se puede deshacer');
    await confirmDialog(page, 'Cancelar');
    await expect(page.getByRole('heading', { name: 'Mi cuenta', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Borrar mi cuenta' }).click();
    await confirmDialog(page, 'Borrar mi cuenta');

    await expect(page).toHaveURL(/\/login$/);
    const login = await request.post(`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/login`, {
      data: { email, password: PASSWORD },
    });
    expect(login.status()).toBe(401);
  } finally {
    await deleteAccount(request, email);
  }
});

test('cambiar la contraseña desde «Mi cuenta»', async ({ page, request }) => {
  const email = await registerAccount(request);
  const newPassword = 'otra-clave-distinta-2';
  const login = (password: string) =>
    request.post(`${process.env.E2E_API_URL ?? 'http://localhost:8000'}/auth/login`, { data: { email, password } });
  try {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Contraseña').fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/account');

    // Una contraseña actual equivocada avisa sin cerrar la sesión
    await page.getByLabel('Contraseña actual').fill('no-es-esta-clave');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill(newPassword);
    await page.getByLabel('Repite la nueva contraseña').fill(newPassword);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('La contraseña actual no es correcta.')).toBeVisible();
    await expect(page).toHaveURL(/\/account$/);

    await page.getByLabel('Repite la nueva contraseña').fill('no-coincide-con-la-otra');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();

    await page.getByLabel('Contraseña actual').fill(PASSWORD);
    await page.getByLabel('Repite la nueva contraseña').fill(newPassword);
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByRole('status')).toContainText('Contraseña cambiada');
    await expect(page.getByLabel('Contraseña actual')).toHaveValue('');

    expect((await login(PASSWORD)).status()).toBe(401);
    expect((await login(newPassword)).status()).toBe(200);
  } finally {
    await deleteAccount(request, email);
  }
});
