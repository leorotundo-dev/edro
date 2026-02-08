export type Locality = {
  country?: string | null;
  uf?: string | null;
  city?: string | null;
};

function normalizeAlpha(value?: string | null): string {
  return String(value || '').trim().toUpperCase();
}

function normalizeCity(value?: string | null): string {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Computes a multiplicative factor to adjust relevance based on geography.
 *
 * Goal: prevent cross-state noise (e.g. RS news surfacing for SP-local clients),
 * without fully hiding national/unknown-location sources that can still be relevant.
 */
export function computeGeoFactor(params: { client: Locality; item: Locality }): { factor: number; reason: string } {
  const clientCountry = normalizeAlpha(params.client.country);
  const clientUf = normalizeAlpha(params.client.uf);
  const clientCity = normalizeCity(params.client.city);

  const itemCountry = normalizeAlpha(params.item.country);
  const itemUf = normalizeAlpha(params.item.uf);
  const itemCity = normalizeCity(params.item.city);

  const clientHasAny = Boolean(clientCountry || clientUf || clientCity);
  if (!clientHasAny) {
    return { factor: 1, reason: 'client_unset' };
  }

  const itemHasAny = Boolean(itemCountry || itemUf || itemCity);
  if (!itemHasAny) {
    if (clientCity) return { factor: 0.75, reason: 'item_location_unknown_city' };
    if (clientUf) return { factor: 0.8, reason: 'item_location_unknown_uf' };
    return { factor: 0.9, reason: 'item_location_unknown_country' };
  }

  if (clientCountry && itemCountry && clientCountry !== itemCountry) {
    return { factor: 0.1, reason: 'country_mismatch' };
  }

  if (clientUf && itemUf && clientUf !== itemUf) {
    return { factor: 0.2, reason: 'uf_mismatch' };
  }

  if (clientUf && !itemUf && (itemCity || itemCountry)) {
    return { factor: 0.85, reason: 'item_uf_unknown' };
  }

  if (clientCity && itemCity && clientCity !== itemCity) {
    const sameUf = Boolean(clientUf && itemUf && clientUf === itemUf);
    return { factor: sameUf ? 0.85 : 0.7, reason: sameUf ? 'city_mismatch_same_uf' : 'city_mismatch' };
  }

  if (clientCity && !itemCity && (itemUf || itemCountry)) {
    return { factor: 0.9, reason: 'item_city_unknown' };
  }

  return { factor: 1, reason: 'geo_match' };
}

