import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000';
export const PASSWORD = 'una-clave-larga-1';

export interface Session {
  email: string;
  token: string;
  user: unknown;
  headers: { Authorization: string };
}

export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@familia.com`;
}

/**
 * Sesión del usuario de pruebas de este worker, sin datos de tests anteriores.
 * Un usuario fijo por worker (y no uno nuevo por test) evita llenar la base de
 * datos, y los tests de un mismo worker nunca se ejecutan a la vez.
 */
export async function createSession(request: APIRequestContext): Promise<Session> {
  const email = `e2e-worker-${test.info().parallelIndex}@familia.com`;
  const response = await request.post(`${API_URL}/auth/dev-token`, { data: { email } });
  expect(response.ok()).toBeTruthy();
  const { access_token, user } = await response.json();
  const headers = { Authorization: `Bearer ${access_token}` };

  const purchases = await (await request.get(`${API_URL}/purchases`, { headers })).json();
  for (const purchase of purchases) {
    await request.delete(`${API_URL}/purchases/${purchase.id}`, { headers });
  }
  return { email, token: access_token, user, headers };
}

/** Deja la sesión iniciada sin pasar por la pantalla de login. */
export async function signIn(page: Page, session: Session): Promise<void> {
  await page.addInitScript(
    ([token, user]) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', user);
    },
    [session.token, JSON.stringify(session.user)] as const,
  );
}

/** Crea una cuenta con contraseña por API. Hay que borrarla al acabar con deleteAccount. */
export async function registerAccount(request: APIRequestContext, email = uniqueEmail()): Promise<string> {
  const response = await request.post(`${API_URL}/auth/register`, { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  return email;
}

/**
 * Borra una cuenta creada por un test. Entra con el acceso de desarrollo y no con la
 * contraseña, para que funcione también cuando el test la ha cambiado o restablecido.
 */
export async function deleteAccount(request: APIRequestContext, email: string): Promise<void> {
  const session = await request.post(`${API_URL}/auth/dev-token`, { data: { email } });
  if (!session.ok()) return;
  const { access_token } = await session.json();
  await request.delete(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${access_token}` } });
}

export const CAR = { name: 'Seat León', price_cash: '25000', category: 'vehicle', brand: 'Seat', model: 'León', year: 2024 };

// 20.000 € al 6,5 % TIN a 60 meses -> cuota francesa de 391,32 €
export const CAR_LOAN = {
  source_name: 'Banco Ejemplo',
  down_payment: '5000',
  tin: '6.5',
  tae: '7.2',
  months: 60,
  monthly_payment: '391.32',
  opening_fee_percent: '1.5',
  mandatory_insurance_year: '300',
};

// Mismo capital a 48 meses con el 40 % del precio como cuota final
export const BALLOON_LOAN = {
  source_name: 'Financiera Multiopción',
  down_payment: '5000',
  tin: '6.5',
  tae: '6.7',
  months: 48,
  monthly_payment: '291.32',
  residual_value_percent: '40',
};

export async function createPurchase(request: APIRequestContext, session: Session, data: object = CAR) {
  const response = await request.post(`${API_URL}/purchases`, { data, headers: session.headers });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function createOffer(request: APIRequestContext, session: Session, purchaseId: string, data: object = CAR_LOAN) {
  const response = await request.post(`${API_URL}/financing-offers`, {
    data: { ...data, purchase_id: purchaseId },
    headers: session.headers,
  });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function saveComparison(request: APIRequestContext, session: Session, purchaseId: string, offerId: string) {
  const response = await request.post(`${API_URL}/comparisons`, {
    data: { purchase_id: purchaseId, financing_offer_id: offerId },
    headers: session.headers,
  });
  expect(response.status()).toBe(201);
  return response.json();
}

/** Pulsa el botón de confirmar del diálogo de la aplicación (ya no se usa el confirm() nativo). */
export async function confirmDialog(page: Page, label: string): Promise<void> {
  await page.getByRole('alertdialog').getByRole('button', { name: label, exact: true }).click();
}
