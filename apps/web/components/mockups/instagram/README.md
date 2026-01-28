# Instagram Mockups - Componentes React

4 componentes React/TypeScript que replicam pixel-perfect as interfaces do Instagram.

## Componentes Incluídos

### 1. InstagramFeedMockup
Réplica completa de um post do feed do Instagram.

**Props:**
```typescript
{
  username: string;
  profileImage: string;
  postImage: string;
  likes: number;
  caption: string;
  comments: Array<{ username: string; text: string }>;
}
```

**Exemplo de uso:**
```tsx
import { InstagramFeedMockup } from './InstagramFeedMockup';

<InstagramFeedMockup 
  username="sua_marca"
  profileImage="/logo.png"
  postImage="/produto.jpg"
  likes={1523}
  caption="Descubra o novo produto! 🚀"
  comments={[
    { username: 'cliente_feliz', text: 'Amazing!' },
    { username: 'influencer', text: 'Love it!' }
  ]}
/>
```

---

### 2. InstagramStoryMockup
Story vertical (formato 9:16) com barra de progresso.

**Props:**
```typescript
{
  username: string;
  profileImage: string;
  storyImage: string;
  timeAgo: string;
}
```

**Exemplo de uso:**
```tsx
import { InstagramStoryMockup } from './InstagramStoryMockup';

<InstagramStoryMockup 
  username="sua_marca"
  profileImage="/logo.png"
  storyImage="/campanha.jpg"
  timeAgo="2h"
/>
```

---

### 3. InstagramProfileMockup
Perfil completo do Instagram com bio, stats, stories e grid.

**Props:**
```typescript
{
  username: string;
  profileImage: string;
  bio: string;
  website: string;
  posts: number;
  followers: number;
  following: number;
  stories: Array<{ image: string; label: string }>;
  gridImages: string[];
}
```

**Exemplo de uso:**
```tsx
import { InstagramProfileMockup } from './InstagramProfileMockup';

<InstagramProfileMockup 
  username="sua_marca"
  profileImage="/logo.png"
  bio="Sua parceira criativa 🎨"
  website="www.suamarca.com"
  posts={127}
  followers={15200}
  following={892}
  stories={[
    { image: '/story1.jpg', label: 'Novidades' },
    { image: '/story2.jpg', label: 'Produtos' }
  ]}
  gridImages={[
    '/post1.jpg', '/post2.jpg', '/post3.jpg',
    '/post4.jpg', '/post5.jpg', '/post6.jpg',
    '/post7.jpg', '/post8.jpg', '/post9.jpg'
  ]}
/>
```

---

### 4. InstagramGridMockup
Grid simplificado 3x3 de posts.

**Props:**
```typescript
{
  username: string;
  gridImages: string[];
}
```

**Exemplo de uso:**
```tsx
import { InstagramGridMockup } from './InstagramGridMockup';

<InstagramGridMockup 
  username="sua_marca"
  gridImages={[
    '/post1.jpg', '/post2.jpg', '/post3.jpg',
    '/post4.jpg', '/post5.jpg', '/post6.jpg',
    '/post7.jpg', '/post8.jpg', '/post9.jpg'
  ]}
/>
```

---

## Dependências

Estes componentes requerem:

1. **React 18+**
```bash
npm install react react-dom
```

2. **TypeScript** (opcional, mas recomendado)
```bash
npm install -D typescript @types/react @types/react-dom
```

3. **Tailwind CSS 3+**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure o `tailwind.config.js`:
```js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

4. **Lucide React** (ícones)
```bash
npm install lucide-react
```

---

## Instalação

1. Copie os 4 arquivos `.tsx` para seu projeto
2. Instale as dependências listadas acima
3. Importe e use os componentes conforme os exemplos

---

## Características

✅ **Pixel Perfect** - Replicação fiel da interface do Instagram  
✅ **TypeScript** - Tipagem completa das props  
✅ **Tailwind CSS** - Estilização moderna e responsiva  
✅ **Zero Config** - Funciona out-of-the-box após instalar dependências  
✅ **Customizável** - Todas as props são configuráveis  
✅ **Leve** - Apenas 22KB total (4 arquivos)

---

## Estrutura dos Arquivos

```
instagram-mockups-standalone/
├── README.md                      # Este arquivo
├── InstagramFeedMockup.tsx        # 6.3KB - Post do feed
├── InstagramStoryMockup.tsx       # 3.8KB - Story vertical
├── InstagramProfileMockup.tsx     # 8.0KB - Perfil completo
└── InstagramGridMockup.tsx        # 4.0KB - Grid 3x3
```

---

## Notas Técnicas

### Cores do Instagram
Os componentes usam as cores oficiais do Instagram:
- Texto principal: `#262626`
- Texto secundário: `#8e8e8e`
- Background: `#FAFAFA`
- Bordas: `#DBDBDB`

### Aspect Ratios
- **Feed Post**: 1:1 (quadrado)
- **Story**: 9:16 (vertical)
- **Profile Grid**: 1:1 por imagem
- **Grid**: 1:1 por imagem

### Responsividade
Todos os componentes são responsivos e se adaptam a diferentes tamanhos de tela mantendo as proporções corretas.

---

## Licença

Componentes criados para uso livre. Não há restrições de uso comercial ou pessoal.

---

## Suporte

Para dúvidas ou sugestões sobre os componentes, entre em contato.
