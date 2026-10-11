import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8000';

export interface Session {
  email: string;
  token: string;
  user: unknown;
  headers: { Authorization: string };
}

// Cada test usa un usuario nuevo, así no comparten datos y pueden ir en paralelo
export function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@familia.com`;
}

export async function createSession(request: APIRequestContext): Promise<Session> {
  const email = uniqueEmail();
  const response = await request.post(`${API_URL}/auth/dev-token`, { data: { email } });
  expect(response.ok()).toBeTruthy();
  const { access_token, user } = await response.json();
  return { email, token: access_token, user, headers: { Authorization: `Bearer ${access_token}` } };
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

export async function loginThroughUi(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Mis compras' })).toBeVisible();
  return email;
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
