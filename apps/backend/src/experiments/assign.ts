export function chooseVariant(variants: Array<{ variant_key: string; weight: number }>) {
  const total = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
  if (total <= 0) return variants[0]?.variant_key;

  let roll = Math.random() * total;
  for (const v of variants) {
    roll -= v.weight || 0;
    if (roll <= 0) return v.variant_key;
  }
  return variants[0]?.variant_key;
}
