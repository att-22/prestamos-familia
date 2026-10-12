import { expect, test, type APIRequestContext } from '@playwright/test';
import { PASSWORD, createSession, deleteAccount, signIn, uniqueEmail, type Session } from './helpers';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000';
// Debe coincidir con ADMIN_EMAIL del backend (docker-compose.yml y e2e.yml)
const ADMIN_EMAIL = 'admin@familia.com';

async function adminSession(request: APIRequestContext): Promise<Session> {
  const response = await request.post(`${API_URL}/auth/dev-token`, { data: { email: ADMIN_EMAIL } });
  expect(response.ok()).toBeTruthy();
  const { access_token, user } = await response.json();
  expect(user.is_admin).toBe(true);
  return { email: ADMIN_EMAIL, token: access_token, user, headers: { Authorization: `Bearer ${access_token}` } };
}

/** La lista es global: cada test usa entradas únicas y las quita al acabar. */
async function removeEntry(request: APIRequestContext, admin: Session, entry: string) {
  const entries = await (await request.get(`${API_URL}/admin/allowed-emails`, { headers: admin.headers })).json();
  const found = entries.find((e: { entry: string; id: string | null }) => e.entry === entry && e.id);
  if (found) await request.delete(`${API_URL}/admin/allowed-emails/${found.id}`, { headers: admin.headers });
}

test('quien no es administrador no ve ni puede abrir la administración', async ({ page, request }) => {
  await signIn(page, await createSession(request));
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Mis compras' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('el administrador autoriza un email y esa persona puede registrarse', async ({ page, request }) => {
  const admin = await adminSession(request);
  // Un dominio distinto de @familia.com, que ya está autorizado por configuración
  const email = uniqueEmail().replace('@familia.com', '@gmail-pruebas.com');
  page.on('dialog', dialog => dialog.accept());

  try {
    const before = await request.post(`${API_URL}/auth/register`, { data: { email, password: PASSWORD } });
    expect(before.status()).toBe(403);

    await signIn(page, admin);
    await page.goto('/dashboard');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Administración' }).click();
    await expect(page.getByRole('heading', { name: 'Correos autorizados' })).toBeVisible();

    await page.getByLabel('Email o dominio').fill(email);
    await page.getByRole('button', { name: 'Autorizar' }).click();

    const row = page.getByRole('listitem').filter({ hasText: email });
    await expect(row.getByText('Pendiente de registrarse')).toBeVisible();
    await expect(page.getByLabel('Email o dominio')).toHaveValue('');

    const after = await request.post(`${API_URL}/auth/register`, { data: { email, password: PASSWORD } });
    expect(after.status()).toBe(201);
    await page.reload();
    await expect(row.getByText('Cuenta creada')).toBeVisible();

    await row.getByRole('button', { name: `Quitar ${email}` }).click();
    await expect(row).toHaveCount(0);
  } finally {
    await deleteAccount(request, email);
    await removeEntry(request, admin, email);
  }
});

test('la administración rechaza entradas inválidas y repetidas', async ({ page, request }) => {
  const admin = await adminSession(request);
  await signIn(page, admin);
  await page.goto('/admin');

  await page.getByLabel('Email o dominio').fill('esto no es un email');
  await page.getByRole('button', { name: 'Autorizar' }).click();
  await expect(page.getByRole('alert')).toContainText('email válido');

  // El propio administrador ya está autorizado por configuración
  await page.getByLabel('Email o dominio').fill(ADMIN_EMAIL);
  await page.getByRole('button', { name: 'Autorizar' }).click();
  await expect(page.getByRole('alert')).toContainText('ya está autorizado');

  const adminRow = page.getByRole('listitem').filter({ hasText: ADMIN_EMAIL });
  await expect(adminRow.getByText('Fijado en la configuración')).toBeVisible();
  await expect(adminRow.getByRole('button')).toHaveCount(0);
});
