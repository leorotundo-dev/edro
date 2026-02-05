# Design System - Mockups Minimalistas

## Princípios de Design

### 1. Minimalismo Consistente
- Remover elementos decorativos desnecessários
- Focar apenas nos elementos essenciais de cada plataforma
- Manter hierarquia visual clara

### 2. Paleta de Cores Neutra
- Fundo: `#FFFFFF` (branco)
- Texto primário: `#000000` ou `#1C1C1E` (preto/cinza escuro)
- Texto secundário: `#8E8E93` (cinza médio)
- Bordas: `#E5E5EA` (cinza claro)
- Cada plataforma mantém apenas sua cor de marca principal

### 3. Tipografia
- Font family: `system-ui, -apple-system, sans-serif`
- Tamanhos: 12px (small), 14px (body), 16px (subtitle), 18px+ (title)
- Weights: 400 (regular), 600 (semibold), 700 (bold)

### 4. Espaçamento
- Base: 4px
- Padding interno: 12px, 16px, 20px
- Gap entre elementos: 8px, 12px, 16px

### 5. Elementos Visuais
- Bordas arredondadas sutis: 8px, 12px
- Sombras minimalistas: `shadow-sm` apenas
- Ícones: Lucide React, tamanho 20px ou 24px
- Imagens: aspect ratio correto, sem filtros

### 6. Layout
- Largura máxima definida por plataforma
- Alinhamento consistente
- Espaçamento respirável
- Grid/flex simples

## Estrutura de Cada Mockup

```tsx
<div className="w-[largura] bg-white rounded-lg shadow-sm">
  {/* Header minimalista */}
  <div className="flex items-center gap-3 p-4 border-b">
    <img className="w-10 h-10 rounded-full" />
    <div>
      <p className="font-semibold text-sm">Username</p>
      <p className="text-xs text-gray-500">Metadata</p>
    </div>
  </div>
  
  {/* Conteúdo principal */}
  <div className="p-4">
    {/* Texto ou imagem */}
  </div>
  
  {/* Footer com ações */}
  <div className="flex items-center gap-4 p-4 border-t">
    {/* Botões minimalistas */}
  </div>
</div>
```

## Cores por Plataforma

- **Instagram**: `#E4405F` (gradiente simplificado)
- **Facebook**: `#1877F2`
- **LinkedIn**: `#0A66C2`
- **Twitter/X**: `#000000`
- **YouTube**: `#FF0000`
- **TikTok**: `#000000` + `#FE2C55`
- **WhatsApp**: `#25D366`
- **Pinterest**: `#E60023`
- **Spotify**: `#1DB954`
- **Telegram**: `#0088CC`
- **Snapchat**: `#FFFC00`
- **Reddit**: `#FF4500`

## Componentes Reutilizáveis

### Avatar
```tsx
<img className="w-10 h-10 rounded-full object-cover" />
```

### Botão de Ação
```tsx
<button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
  <Icon className="w-5 h-5" />
  <span className="text-sm">Action</span>
</button>
```

### Contador
```tsx
<span className="text-sm text-gray-600">
  {count.toLocaleString()}
</span>
```

### Imagem de Post
```tsx
<img className="w-full aspect-square object-cover" />
```

## Regras de Implementação

1. ✅ Usar apenas Tailwind CSS (sem CSS customizado)
2. ✅ Manter props simples e tipadas
3. ✅ Valores default para todas as props
4. ✅ Componentes auto-contidos (sem dependências externas além de Lucide)
5. ✅ Responsivo quando aplicável
6. ✅ Acessível (alt text, aria-labels quando necessário)
7. ✅ Sem animações complexas
8. ✅ Sem estados interativos (apenas visual)
