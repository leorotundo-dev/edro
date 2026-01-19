# Etapa 5 — Pacote Shared (@edro/shared)

Este pacote concentra tipos e utilitários compartilhados entre:

- apps/backend
- apps/web
- apps/ai

Conteúdo desta etapa:
- package.json com scripts de build
- tsconfig.json configurado para gerar `dist/`
- src/index.ts reexportando tipos principais
- src/types/drops.ts com tipagem de Drops
- src/types/blueprint.ts com tipagem de Blueprints

Como usar (na raiz do monorepo):

- Adicionar `"packages/*"` em `workspaces` do package.json raiz.
- Rodar `npm install`.
- Rodar `npm run build --workspace shared` (caso o workspace se chame "shared").

Em outros workspaces:

```ts
import type { Drop, ExamBlueprint } from '@edro/shared';
```
