# @edro/ui

Conjunto de componentes React compartilhados entre os apps Web Admin e Web Aluno. Nasce para centralizar os elementos básicos (botões, cartões, badges, tabelas) e também o shell responsivo + navegação mobile.

## Componentes principais

- `Button`, `Badge`, `Card`, `StatCard`, `DataTable`
- `Sidebar` e `MobileNavBar` baseados em configurações
- `ResponsiveShell` para lidar com header fixo, drawer mobile e bottom tabs

## Como usar

1. Adicione o pacote aos workspaces (`"@edro/ui": "workspace:*"`).
2. Rode `npm install` na raiz para garantir o link simbólico.
3. Execute `npm run build --workspace @edro/ui` para gerar `dist/` sempre que editar o pacote (o script `prepare` já cuida disso durante installs).
4. Aponte o `tailwind.config` dos apps para `../../packages/ui/dist/**/*.{js,ts,tsx}` para que as classes sejam rastreadas.

## Desenvolvimento

- Código-fonte fica em `src/` e o build é feito via `tsc`.
- Evite dependências desnecessárias; mantenha apenas utilitários de estilização no pacote.
- Sempre documente novos componentes aqui e na `ANALISE_UI_UX_SYSTEM.md` para manter o plano alinhado.
