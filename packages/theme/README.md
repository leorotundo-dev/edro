# Edro Theme Package

Utilitário interno com tokens compartilhados, preset Tailwind e estilos base para os apps Admin e Aluno.

## Uso

1. `@import "@edro/theme/css/base.css";` no `globals.css`.
2. Adicionar `import themePreset from "@edro/theme/tailwind-preset";` e registrar em `presets` no `tailwind.config` de cada app.
3. Usar as classes utilitárias (`btn`, `card`, `badge`, `.mds-card`, `.mds-glass`) ou os tokens exportados (`colors`, `fonts`, etc.) conforme necessário.

O pacote expõe apenas arquivos estáticos, portanto não é necessário build dedicado.
