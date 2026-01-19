import 'dotenv/config';
import { generateDropsFromEditais } from '../services/dropGenerationFromEditais';

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

async function main() {
  console.log('[generate-drops-v2] Starting drop generation from editais...');

  try {
    const result = await generateDropsFromEditais({
      limitEditais: toPositiveInt(process.env.GENERATE_DROPS_EDITAIS_LIMIT, 5),
      maxTopicsPerEdital: toPositiveInt(process.env.GENERATE_DROPS_MAX_TOPICS_PER_EDITAL, 25),
      maxTotalTopics: toPositiveInt(process.env.GENERATE_DROPS_MAX_TOTAL_TOPICS, 120),
    });

    console.log('[generate-drops-v2] Done.');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('[generate-drops-v2] Job failed:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
