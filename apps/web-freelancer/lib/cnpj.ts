export type CnpjLookupStatus =
  | 'found_active'
  | 'found_inactive'
  | 'not_found'
  | 'provider_unavailable'
  | 'invalid_cnpj';

export type CnpjLookupResponse = {
  status: CnpjLookupStatus;
  provider: 'brasilapi' | 'validation';
  source: 'brasilapi' | 'validation';
  cnpj: string;
  message: string;
  allow_manual_entry: boolean;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  situacao?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCnpj(value: string) {
  const digits = normalizeDigits(value);
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calc(`${digits.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits === `${digits.slice(0, 12)}${first}${second}`;
}
