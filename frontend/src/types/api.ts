// Tipos compartidos con el backend (Pydantic -> TypeScript)

export interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface AllowedEmail {
  // Las entradas fijadas en la configuración del servidor no tienen id ni se pueden quitar
  id: string | null;
  entry: string;
  source: 'admin' | 'config';
  is_domain: boolean;
  registered: boolean;
  created_at: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  // false tras restablecer la contraseña, hasta que la persona vuelve a crear su cuenta
  has_password: boolean;
  created_at: string;
}

export interface AdminSettings {
  registration_code: string | null;
  admin_email: string | null;
}

export type PurchaseCategory = 'vehicle' | 'home' | 'renovation' | 'electronics' | 'other';

export interface Purchase {
  id: string;
  user_id: string;
  name: string;
  price_cash: string; // Decimal as string
  category: PurchaseCategory;
  brand: string | null;
  model: string | null;
  year: number | null;
  is_used: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancingOffer {
  id: string;
  purchase_id: string;
  source_name: string;
  down_payment: string;
  tin: string;
  tae: string;
  months: number;
  monthly_payment: string;
  opening_fee: string;
  opening_fee_percent: string;
  early_repayment_fee_percent: string;
  mandatory_insurance_year: string;
  residual_value: string | null;
  residual_value_percent: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AlertType = 'warning' | 'info' | 'success' | 'error';

export interface AlertParam {
  value: string;
  kind: 'percent' | 'currency' | 'number';
}

export interface Alert {
  type: AlertType;
  // Texto con marcadores como "{tae}"; las cifras llegan en params
  message: string;
  code: string;
  // No existe en las comparativas guardadas antes de separar las cifras del texto
  params?: Record<string, AlertParam>;
}

export interface AmortizationRow {
  month: number;
  payment: string;
  interest: string;
  principal: string;
  // Capital pendiente después de esta cuota
  balance: string;
}

export interface Amortization {
  // % nominal anual que resulta de las cuotas (puede no coincidir con el TIN declarado)
  annual_rate: string;
  total_interest: string;
  rows: AmortizationRow[];
}

export interface ScenarioRequest {
  purchase_id: string;
  financing_offer_id: string;
  down_payment: string;
  months: number;
}

export interface ScenarioResult {
  down_payment: string;
  months: number;
  monthly_payment: string;
  total_financing_cost: string;
  total_interest_fees: string;
  annual_rate: string;
}

export interface ComparisonResult {
  price_cash: string;
  down_payment: string;
  tin: string;
  tae: string;
  months: number;
  monthly_payment: string;
  opening_fee: string;
  early_repayment_fee_percent: string;
  mandatory_insurance_year: string;
  residual_value: string | null;
  financed_amount: string;
  total_payments: string;
  total_insurance: string;
  total_fees: string;
  total_financing_cost: string;
  total_interest_fees: string;
  savings_vs_cash: string;
  effective_annual_rate: string;
  monthly_income_percent: string | null;
  savings_after_down_payment: string | null;
  alerts: Alert[];
  amortization: Amortization;
}

export interface OfferSummary {
  offer_id: string;
  source_name: string;
  down_payment: string;
  monthly_payment: string;
  months: number;
  tin: string;
  tae: string;
  effective_annual_rate: string;
  residual_value: string | null;
  total_payments: string;
  total_financing_cost: string;
  // Lo que cuesta de más frente al contado (negativo si financiar sale más barato)
  total_interest_fees: string;
  is_cheapest: boolean;
  has_lowest_payment: boolean;
}

export interface OfferRanking {
  purchase_id: string;
  price_cash: string;
  // De la más barata a la más cara
  offers: OfferSummary[];
}

export interface Comparison {
  id: string;
  user_id: string;
  purchase_id: string;
  financing_offer_id: string;
  purchase_name: string | null;
  source_name: string | null;
  total_financing_cost: string;
  total_interest_fees: string;
  savings_vs_cash: string;
  monthly_income_percent: string | null;
  alerts_json: Alert[];
  shared_slug: string;
  is_public: boolean;
  user_monthly_income: string | null;
  user_available_savings: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComparisonPublic {
  purchase_name: string;
  price_cash: string;
  source_name: string;
  down_payment: string;
  tin: string;
  tae: string;
  months: number;
  monthly_payment: string;
  residual_value: string | null;
  total_financing_cost: string;
  total_interest_fees: string;
  savings_vs_cash: string;
  alerts: Alert[];
  created_at: string;
}

// Request types
export interface PurchaseCreate {
  name: string;
  price_cash: string;
  category?: PurchaseCategory;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  is_used?: boolean;
  notes?: string | null;
}

export interface FinancingOfferCreate {
  purchase_id: string;
  source_name: string;
  down_payment: string;
  tin: string;
  tae: string;
  months: number;
  monthly_payment: string;
  opening_fee?: string;
  opening_fee_percent?: string;
  early_repayment_fee_percent?: string;
  mandatory_insurance_year?: string;
  residual_value?: string | null;
  residual_value_percent?: string | null;
  notes?: string | null;
}

export interface ComparisonCreate {
  purchase_id: string;
  financing_offer_id: string;
  user_monthly_income?: string;
  user_available_savings?: string;
}
