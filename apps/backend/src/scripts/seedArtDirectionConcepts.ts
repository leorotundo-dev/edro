import { upsertArtDirectionConcept } from '../services/ai/artDirectionMemoryService';
import { CORE_ART_DIRECTION_CONCEPTS } from '../services/ai/artDirectionCoreConcepts';

async function main() {
  for (const concept of CORE_ART_DIRECTION_CONCEPTS) {
    await upsertArtDirectionConcept(concept);
  }
  console.log(`[seedArtDirectionConcepts] upserted ${CORE_ART_DIRECTION_CONCEPTS.length} concepts`);
}

main().catch((err) => {
  console.error('[seedArtDirectionConcepts] failed:', err);
  process.exit(1);
});
