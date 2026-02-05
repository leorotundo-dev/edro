# Social Media Mockups - 38 Componentes React Minimalistas

Coleção completa de 38 componentes React/TypeScript que replicam as interfaces de 12 plataformas sociais com estética minimalista consistente.

## 📦 Plataformas Incluídas

### Facebook (5 mockups)
- **FacebookPost** - Post do feed com likes, comments, shares
- **FacebookStory** - Story vertical
- **FacebookCover** - Foto de capa + perfil
- **FacebookAd** - Anúncio patrocinado
- **FacebookCarousel** - Carrossel de imagens

### LinkedIn (4 mockups)
- **LinkedInPost** - Post profissional
- **LinkedInArticle** - Artigo com capa
- **LinkedInProfile** - Perfil com cover
- **LinkedInAd** - Post patrocinado

### Twitter/X (4 mockups)
- **TwitterPost** - Tweet com imagem
- **TwitterThread** - Thread de tweets
- **TwitterProfile** - Perfil com cover
- **TwitterAd** - Tweet patrocinado

### YouTube (5 mockups)
- **YouTubeVideo** - Card de vídeo
- **YouTubeThumbnail** - Thumbnail customizável
- **YouTubeShorts** - Short vertical
- **YouTubeBanner** - Banner do canal
- **YouTubeCommunity** - Post da comunidade

### TikTok (3 mockups)
- **TikTokVideo** - Vídeo vertical com overlay
- **TikTokProfile** - Perfil com grid
- **TikTokComment** - Seção de comentários

### WhatsApp (3 mockups)
- **WhatsAppMessage** - Mensagem com foto
- **WhatsAppStatus** - Status/Story
- **WhatsAppBusiness** - Perfil comercial

### Pinterest (3 mockups)
- **PinterestPin** - Pin com descrição
- **PinterestBoard** - Board com grid
- **PinterestIdeaPin** - Idea Pin multi-página

### Spotify (2 mockups)
- **SpotifyPlaylist** - Capa de playlist
- **SpotifyPodcast** - Capa de podcast

### Google Ads (4 mockups)
- **GoogleSearchAd** - Anúncio de pesquisa
- **GoogleDisplayAd** - Banner display
- **GoogleShoppingAd** - Anúncio de produto
- **GoogleVideoAd** - Anúncio em vídeo

### Telegram (2 mockups)
- **TelegramMessage** - Mensagem com foto
- **TelegramChannel** - Post em canal

### Snapchat (2 mockups)
- **SnapchatSnap** - Snap vertical
- **SnapchatStory** - Story com barra

### Reddit (1 mockup)
- **RedditPost** - Post com upvotes

---

## 🎨 Design System

### Estética Minimalista
- Fundo branco limpo
- Apenas elementos essenciais
- Cores neutras (preto, cinza, branco)
- Cada plataforma mantém apenas sua cor de marca principal
- Tipografia system-ui
- Bordas arredondadas sutis (8px, 12px)
- Sombras minimalistas (shadow-sm)
- Layout respirável

### Paleta de Cores
- Fundo: `#FFFFFF`
- Texto primário: `#000000` / `#1C1C1E`
- Texto secundário: `#8E8E93`
- Bordas: `#E5E5EA`

### Cores de Marca
- Facebook: `#1877F2`
- LinkedIn: `#0A66C2`
- Twitter: `#000000`
- YouTube: `#FF0000`
- TikTok: `#FE2C55`
- WhatsApp: `#25D366`
- Pinterest: `#E60023`
- Spotify: `#1DB954`
- Telegram: `#0088CC`
- Snapchat: `#FFFC00`
- Reddit: `#FF4500`

---

## 📥 Instalação

### 1. Dependências

```bash
# Principais
npm install react react-dom lucide-react

# Desenvolvimento
npm install -D typescript @types/react @types/react-dom tailwindcss postcss autoprefixer
```

### 2. Configurar Tailwind CSS

```bash
npx tailwindcss init -p
```

**tailwind.config.js:**
```js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### 3. Copiar Componentes

Copie os arquivos `.tsx` para seu projeto e importe conforme necessário.

---

## 💻 Exemplos de Uso

### Facebook Post
```tsx
import { FacebookPost } from './FacebookPost';

<FacebookPost 
  username="Minha Marca"
  profileImage="/logo.png"
  postImage="/produto.jpg"
  postText="Confira nosso novo produto! 🚀"
  likes={1234}
  comments={89}
  shares={23}
/>
```

### Instagram (do pacote anterior)
```tsx
import { InstagramFeedMockup } from './InstagramFeedMockup';

<InstagramFeedMockup 
  username="minha_marca"
  profileImage="/logo.png"
  postImage="/post.jpg"
  likes={5678}
  caption="Descrição do post #hashtag"
/>
```

### YouTube Video
```tsx
import { YouTubeVideo } from './YouTubeVideo';

<YouTubeVideo 
  thumbnail="/thumb.jpg"
  title="Título do Vídeo"
  channelName="Meu Canal"
  channelImage="/channel.png"
  views="1.2M views"
  timeAgo="2 days ago"
/>
```

### TikTok Video
```tsx
import { TikTokVideo } from './TikTokVideo';

<TikTokVideo 
  thumbnail="/video.jpg"
  username="@meuuser"
  profileImage="/avatar.png"
  caption="Legenda do vídeo #fyp"
  likes="124K"
  comments="2.3K"
/>
```

---

## 🔧 Props Comuns

Todos os componentes seguem padrões similares:

### Imagens
- `profileImage?: string` - URL da foto de perfil
- `postImage?: string` - URL da imagem do post
- `coverImage?: string` - URL da foto de capa

### Texto
- `username?: string` - Nome do usuário
- `caption?: string` / `postText?: string` - Texto do post
- `description?: string` - Descrição adicional

### Métricas
- `likes?: number` - Número de likes
- `comments?: number` - Número de comentários
- `shares?: number` - Número de compartilhamentos
- `views?: string` - Visualizações (formato: "1.2M views")

### Tempo
- `timeAgo?: string` - Tempo relativo (ex: "2h", "1 day ago")

**Todas as props são opcionais e possuem valores default.**

---

## 📊 Estatísticas

- **Total de componentes:** 38
- **Plataformas cobertas:** 12
- **Tamanho total:** ~150KB (código fonte)
- **Linhas de código:** ~2,500
- **Dependências:** 3 (React, Lucide, Tailwind)

---

## ✅ Características

- ✨ **Minimalista** - Design limpo e focado
- 🎨 **Consistente** - Mesma estética em todos
- 📱 **Responsivo** - Adapta-se a diferentes telas
- ⚡ **Leve** - Sem dependências pesadas
- 🔧 **Customizável** - Todas as props configuráveis
- 💪 **TypeScript** - Tipagem completa
- 🚀 **Zero Config** - Funciona out-of-the-box

---

## 📝 Notas

### Aspect Ratios
- **Feed Post:** 1:1 (quadrado)
- **Story/Status:** 9:16 (vertical)
- **Video Thumbnail:** 16:9 (horizontal)
- **Profile Cover:** Varia por plataforma

### Responsividade
Componentes usam `max-w-*` para limitar largura em telas grandes. Em mobile, ocupam 100% da largura disponível.

### Customização
Para alterar cores, edite as classes Tailwind diretamente nos componentes ou use o `tailwind.config.js` para sobrescrever o tema.

---

## 🚀 Próximos Passos

1. Integre os mockups em seu projeto
2. Customize cores e estilos conforme sua marca
3. Conecte com dados reais via props
4. Use em ferramentas de design, apresentações ou demos

---

## 📄 Licença

Componentes de uso livre. Sem restrições comerciais ou pessoais.

---

## 🤝 Suporte

Para dúvidas ou sugestões, entre em contato.

**Versão:** 1.0.0  
**Data:** Janeiro 2026  
**Criado para:** MemoDrops
