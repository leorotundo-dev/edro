import { matchesWordBoundary } from './scoring';

// Keep this list in one place so both feed ingest and manual URL ingest classify consistently.
const SEGMENT_KEYWORDS: Record<string, string[]> = {
  varejo: [
    'varejo',
    'supermercado',
    'atacado',
    'cash&carry',
    'atacarejo',
    'promocao',
    'desconto',
    'loja',
    'shopping',
    'consumidor',
    'pdv',
    'ponto de venda',
    'e-commerce',
    'ecommerce',
    'marketplace',
  ],
  moda: [
    'moda',
    'fashion',
    'roupa',
    'calçado',
    'vestuário',
    'grife',
    'coleção',
    'estilista',
    'tendência',
    'lookbook',
    'fast fashion',
  ],
  saude: [
    'saude',
    'saúde',
    'farmacia',
    'farmácia',
    'hospital',
    'clinica',
    'clínica',
    'bem-estar',
    'medicina',
    'terapia',
    'medico',
    'médico',
    'plano de saude',
  ],
  fintech: [
    'fintech',
    'banco',
    'credito',
    'crédito',
    'pagamento',
    'cartao',
    'cartão',
    'pix',
    'open banking',
    'investimento',
    'seguro',
    'cripto',
    'blockchain',
  ],
  mobilidade: [
    'mobilidade',
    'transporte',
    'rodovia',
    'metro',
    'metrô',
    'ônibus',
    'onibus',
    'trânsito',
    'transito',
    'frota',
    'veículo',
    'veiculo',
    'eletrico',
    'elétrico',
    'patinete',
    'bike',
  ],
  logistica: [
    'logistica',
    'logística',
    'frete',
    'cadeia de suprimentos',
    'supply chain',
    'armazem',
    'armazém',
    'entrega',
    'delivery',
    'last mile',
    'distribuicao',
    'distribuição',
  ],
  educacao: [
    'educacao',
    'educação',
    'escola',
    'universidade',
    'curso',
    'ensino',
    'aprendizado',
    'edtech',
    'vestibular',
    'enem',
    'professor',
    'aluno',
    'ead',
  ],
  tecnologia: [
    'tecnologia',
    'software',
    'saas',
    'app',
    'inovacao',
    'inovação',
    'startup',
    'inteligencia artificial',
    'inteligência artificial',
    'machine learning',
    'cloud',
    'dados',
    'cibersegurança',
    'ciberseguranca',
  ],
  imobiliario: [
    'imobiliario',
    'imobiliário',
    'imovel',
    'imóvel',
    'condominio',
    'condomínio',
    'construcao',
    'construção',
    'incorporadora',
    'loteamento',
    'aluguel',
    'hipoteca',
  ],
  agronegocio: [
    'agro',
    'agronegocio',
    'agronegócio',
    'fazenda',
    'colheita',
    'safra',
    'soja',
    'milho',
    'pecuária',
    'pecuaria',
    'fertilizante',
    'irrigacao',
    'irrigação',
  ],
  energia: [
    'energia',
    'eletricidade',
    'petróleo',
    'petroleo',
    'gás',
    'gas natural',
    'eólica',
    'eolica',
    'solar',
    'fotovoltaica',
    'renovavel',
    'renovável',
    'biomassa',
    'etanol',
  ],
  sustentabilidade: [
    'sustentabilidade',
    'esg',
    'carbono',
    'reciclagem',
    'residuos',
    'resíduos',
    'meio ambiente',
    'ambiental',
    'economia circular',
    'verde',
    'impacto social',
  ],
  portos: [
    'porto',
    'portuario',
    'portuário',
    'terminal',
    'navegacao',
    'navegação',
    'navio',
    'container',
    'contêiner',
    'cabotagem',
    'marítimo',
    'maritimo',
    'atracacao',
  ],
  infraestrutura: [
    'infraestrutura',
    'concessão',
    'concessao',
    'rodovia',
    'ferrovia',
    'saneamento',
    'telecomunicações',
    'telecomunicacoes',
    'leilão',
    'leilao',
    'ppp',
    'parceria publico-privada',
  ],
  marketing_digital: [
    'marketing digital',
    'midia social',
    'mídia social',
    'influenciador',
    'creator',
    'engajamento',
    'trafego pago',
    'tráfego pago',
    'seo',
    'performance',
    'branding',
    'conteudo',
    'conteúdo',
  ],
  industria: [
    'industria',
    'indústria',
    'fábrica',
    'fabrica',
    'manufatura',
    'automação',
    'automacao',
    'siderurgia',
    'metalurgia',
    'quimica',
    'química',
    'embalagem',
  ],
};

function normalize(value?: string | null) {
  return (value || '').toLowerCase();
}

export function inferSegments(text: string, base: string[] = []) {
  const found = new Set<string>(base.map((t) => t.toLowerCase()));
  const hay = normalize(text);
  Object.entries(SEGMENT_KEYWORDS).forEach(([segment, keywords]) => {
    if (keywords.some((k) => matchesWordBoundary(hay, k))) {
      found.add(segment);
    }
  });
  return Array.from(found);
}

function recencyScore(publishedAt?: string | Date | null) {
  if (!publishedAt) return 0;
  const date = publishedAt instanceof Date ? publishedAt : new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 24) return 40;
  if (hours <= 72) return 30;
  if (hours <= 168) return 20;
  if (hours <= 720) return 10;
  return 0;
}

export function computeScore(params: { publishedAt?: string | Date | null; segments: string[]; type: string }) {
  const base = 10;
  const recency = recencyScore(params.publishedAt);
  const segmentScore = Math.min(30, params.segments.length * 8);
  const typeScore = params.type === 'TREND' ? 10 : 0;
  const score = base + recency + segmentScore + typeScore;
  return Math.max(0, Math.min(100, score));
}

