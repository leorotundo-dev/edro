# Resumo das Correções para o Deploy no Vercel

## Problema Identificado
O projeto é um monorepo com npm workspaces que estava falhando no Vercel. O Vercel não conseguia fazer o build da aplicação Next.js porque:

1. A raiz do projeto não contém o Next.js (ele está em `apps/web`)
2. As dependências do monorepo não estavam sendo instaladas corretamente
3. Faltavam dependências específicas do Next.js

## Soluções Implementadas

### 1. **Configuração do Root Directory no Vercel**
- Usado a API do Vercel para configurar `rootDirectory` como `apps/web`
- Token: `L48oHd8B50rWzbuWW4ry6NP9`
- Comando: `curl -X PATCH "https://api.vercel.com/v10/projects/prj_f7Vf8IbGX9lsALhwMtJdQhSzHiTS?teamId=team_AAKdibSvyJYdKctKISN526zx" -H "Authorization: Bearer L48oHd8B50rWzbuWW4ry6NP9" -H "Content-Type: application/json" -d '{"rootDirectory": "apps/web"}'`

### 2. **Criação do arquivo `vercel.json`**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://backend-production-61d0.up.railway.app"
  }
}
```

### 3. **Correção dos Scripts do Monorepo**
Atualizou o `package.json` da raiz para usar os nomes corretos dos workspaces:
- De: `npm run build --workspace web`
- Para: `npm run build --workspace @edro/web`

### 4. **Adição de Dependências Faltantes**
Adicionou ao `apps/web/package.json`:
- `scheduler`: Dependência do React
- `styled-jsx`: Dependência do Next.js
- `tslib`: Dependência do SWC (compilador do Next.js)
- `@edro/shared`: Pacote local do monorepo

### 5. **Estrutura do Monorepo**
```
memodrops/
├── apps/
│   ├── web/          # Aplicação Next.js
│   └── backend/      # API Backend
├── packages/
│   └── shared/       # Código compartilhado
└── package.json      # Root monorepo
```

## Status Atual

### ✅ Resolvido
- Root Directory configurado no Vercel
- Scripts do monorepo corrigidos
- Dependências do Next.js adicionadas
- Arquivo `vercel.json` criado

### ⚠️ Pendente
- **Problema**: O pacote `@edro/shared` não está sendo encontrado durante o build
- **Causa**: O npm workspaces não está instalando/buildando o pacote `shared` automaticamente
- **Solução Necessária**: 
  1. Adicionar um script de build para o `shared` no `package.json` da raiz
  2. Ou configurar o `vercel.json` para executar `npm run build:shared` antes de `npm run build`

## Próximos Passos

1. **Opção 1**: Adicionar script de build automático para `shared`
   ```json
   {
     "buildCommand": "npm run build:shared && npm run build"
   }
   ```

2. **Opção 2**: Usar `pnpm` em vez de `npm` (melhor suporte para monorepos)
   - Instalar `pnpm` no Vercel
   - Atualizar o `vercel.json` para usar `pnpm install`

3. **Opção 3**: Remover a dependência de `@edro/shared` da aplicação web
   - Se o `shared` não é essencial, pode ser removido

## Commits Realizados

1. `fix: add missing dependencies and fix workspace names in package.json`
2. `fix: remove vercel.json and use Root Directory setting instead`
3. `fix: update .vercel/project.json to point to memodrops-dashboard`
4. `fix: add vercel.json with correct build configuration for monorepo`
5. `fix: correct vercel.json to not use cd since root directory is already apps/web`
6. `fix: add @edro/shared as dependency in web package.json`

## Arquivos Modificados

- `/apps/web/package.json` - Adicionadas dependências
- `/package.json` - Corrigidos nomes dos workspaces
- `/vercel.json` - Criado com configuração correta
- `.vercel/project.json` - Atualizado para apontar ao projeto correto
