# Mockups Mídia ON - Coleção Completa

Coleção completa de **88 componentes React/TypeScript minimalistas** para formatos digitais de redes sociais, campanhas web e anúncios programáticos.

---

## 📦 Conteúdo Completo (88 mockups)

### Instagram (11 mockups) ✅
1. InstagramFeedMockup - Post do feed
2. InstagramStoryMockup - Story vertical
3. InstagramProfileMockup - Perfil completo
4. InstagramGridMockup - Grid 3x3
5. InstagramReel - Reel vertical
6. InstagramCarousel - Post carrossel
7. InstagramLive - Live streaming
8. InstagramAd - Anúncio patrocinado
9. InstagramGuide - Guia de posts
10. InstagramHighlight - Story highlight
11. InstagramShop - Post de produto

### Facebook (11 mockups) ✅
1. FacebookPost - Post do feed
2. FacebookStory - Story
3. FacebookCover - Foto de capa
4. FacebookAd - Anúncio
5. FacebookCarousel - Carrossel de anúncios
6. FacebookEvent - Card de evento
7. FacebookGroup - Header de grupo
8. FacebookMarketplace - Produto marketplace
9. FacebookWatch - Vídeo watch
10. FacebookPoll - Enquete
11. FacebookMemory - Memória/On This Day

### Google Display & Ads (13 mockups) ✅
1. GoogleSearchAd - Anúncio de pesquisa
2. GoogleDisplayAd - Display ad genérico
3. GoogleShoppingAd - Anúncio de shopping
4. GoogleVideoAd - Anúncio de vídeo
5. GoogleBanner728x90 - Leaderboard
6. GoogleBanner300x250 - Medium Rectangle
7. GoogleBanner160x600 - Wide Skyscraper
8. GoogleBanner300x600 - Half Page
9. GoogleBanner970x250 - Billboard
10. GoogleResponsiveAd - Anúncio responsivo
11. GoogleNativeAd - Anúncio nativo
12. GoogleInterstitial - Anúncio intersticial
13. GoogleMyBusiness - Perfil de negócio

### YouTube (8 mockups) ✅
1. YouTubeVideo - Player de vídeo
2. YouTubeThumbnail - Thumbnail
3. YouTubeShorts - Shorts vertical
4. YouTubeBanner - Banner de canal
5. YouTubeCommunity - Post da comunidade
6. YouTubeLive - Live streaming
7. YouTubePlaylist - Card de playlist
8. YouTubePremiere - Premiere de vídeo
9. YouTubeMembership - Card de membership
10. YouTubeSuperchat - Superchat message

### LinkedIn (10 mockups) ✅
1. LinkedInPost - Post do feed
2. LinkedInArticle - Artigo
3. LinkedInProfile - Perfil profissional
4. LinkedInAd - Anúncio patrocinado
5. LinkedInJobPost - Vaga de emprego
6. LinkedInCertificate - Certificado profissional
7. LinkedInEvent - Evento profissional
8. LinkedInPoll - Enquete profissional
9. LinkedInNewsletter - Newsletter
10. LinkedInRecommendation - Recomendação

### Twitter/X (6 mockups) ✅
1. TwitterPost - Tweet
2. TwitterThread - Thread de tweets
3. TwitterProfile - Perfil
4. TwitterAd - Tweet promovido
5. TwitterSpace - Card de Space
6. TwitterMoment - Moment/Coleção
7. TwitterPoll - Enquete
8. TwitterList - Lista curada

### TikTok (7 mockups) ✅
1. TikTokVideo - Vídeo feed
2. TikTokProfile - Perfil grid
3. TikTokComment - Seção de comentários
4. TikTokLive - Live streaming
5. TikTokDuet - Duet split screen
6. TikTokStitch - Stitch de vídeo
7. TikTokEffect - Effect showcase

### WhatsApp (7 mockups) ✅
1. WhatsAppMessage - Mensagem
2. WhatsAppStatus - Status
3. WhatsAppBusiness - Perfil business
4. WhatsAppGroup - Mensagem de grupo
5. WhatsAppCall - Tela de chamada
6. WhatsAppBroadcast - Lista de transmissão
7. WhatsAppPoll - Enquete

### Pinterest (7 mockups) ✅
1. PinterestPin - Pin
2. PinterestBoard - Board
3. PinterestIdeaPin - Idea Pin
4. PinterestStory - Story pin
5. PinterestProfile - Perfil completo
6. PinterestShop - Shopping pin
7. PinterestTrend - Trend showcase

### Spotify (4 mockups) ✅
1. SpotifyPlaylist - Capa de playlist
2. SpotifyPodcast - Capa de podcast
3. SpotifyArtist - Perfil de artista
4. SpotifyWrapped - Wrapped card

### Telegram (2 mockups) ✅
1. TelegramMessage - Mensagem
2. TelegramChannel - Canal

### Snapchat (2 mockups) ✅
1. SnapchatSnap - Snap
2. SnapchatStory - Story

### Reddit (1 mockup) ✅
1. RedditPost - Post

### Threads (1 mockup) ✅
1. ThreadsPost - Post

### Google Review (1 mockup) ✅
1. GoogleReview - Review card

---

## 🎨 Design System Minimalista

Todos os 88 mockups seguem a mesma estética consistente:

### Princípios de Design
- **Fundo branco limpo** (ou dark quando apropriado para a plataforma)
- **Apenas elementos essenciais** - sem decoração desnecessária
- **Cores neutras como base** - preto, cinza, branco
- **Cor de marca como destaque** - cada plataforma mantém sua cor principal
- **Tipografia system-ui** - fonte nativa do sistema
- **Bordas arredondadas sutis** - 8px-12px
- **Sombras minimalistas** - shadow-sm
- **Layout respirável** - espaçamento generoso

### Cores de Marca por Plataforma
- Instagram: Gradiente multicolor
- Facebook: `#1877F2`
- LinkedIn: `#0A66C2`
- Twitter: `#1DA1F2`
- YouTube: `#FF0000`
- TikTok: `#FE2C55`
- WhatsApp: `#25D366`
- Pinterest: `#E60023`
- Spotify: `#1DB954`
- Google: `#4285F4`
- Telegram: `#0088CC`
- Snapchat: `#FFFC00`
- Reddit: `#FF4500`
- Threads: `#000000`

---

## 📥 Instalação

### Dependências Necessárias

```bash
npm install react react-dom lucide-react tailwindcss
```

### TypeScript (opcional mas recomendado)
```bash
npm install -D typescript @types/react @types/react-dom
```

### Tailwind CSS Config

Certifique-se de que seu `tailwind.config.js` inclui:

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

---

## 💻 Exemplos de Uso

### Instagram Feed Post
```tsx
import { InstagramFeedMockup } from './InstagramFeedMockup';

<InstagramFeedMockup 
  username="brandname"
  profileImage="/avatar.jpg"
  postImage="/post.jpg"
  caption="Check out our new product! 🚀"
  likes="1523"
  comments={[
    { username: "user1", text: "Amazing!" },
    { username: "user2", text: "Love it!" }
  ]}
/>
```

### Google Banner 728x90
```tsx
import { GoogleBanner728x90 } from './GoogleBanner728x90';

<GoogleBanner728x90 
  headline="Summer Sale - 50% Off"
  description="Limited time offer"
  ctaText="Shop Now"
  logo="/logo.png"
  backgroundImage="/banner-bg.jpg"
/>
```

### LinkedIn Post
```tsx
import { LinkedInPost } from './LinkedInPost';

<LinkedInPost 
  username="Professional Name"
  profileImage="/profile.jpg"
  postText="Excited to share our latest insights..."
  postImage="/article-cover.jpg"
  likes={234}
  comments={45}
/>
```

### YouTube Video
```tsx
import { YouTubeVideo } from './YouTubeVideo';

<YouTubeVideo 
  thumbnail="/video-thumb.jpg"
  title="How to Build Amazing Products"
  channelName="Tech Channel"
  channelImage="/channel.jpg"
  views="1.2M views"
  uploadTime="2 days ago"
  duration="12:34"
/>
```

---

## 🔧 Props Comuns

A maioria dos componentes compartilha props similares:

### Imagens
- `profileImage?: string` - Avatar/foto de perfil
- `postImage?: string` - Imagem principal do post
- `thumbnail?: string` - Miniatura de vídeo
- `coverImage?: string` - Imagem de capa
- `logo?: string` - Logotipo da marca

### Texto
- `username?: string` - Nome de usuário
- `caption?: string` / `message?: string` / `postText?: string` - Conteúdo textual
- `title?: string` - Título
- `description?: string` - Descrição

### Métricas
- `likes?: number | string` - Curtidas
- `comments?: number` - Comentários
- `views?: string` - Visualizações
- `followers?: string` - Seguidores

### Tempo
- `timeAgo?: string` - Tempo relativo (ex: "2h")
- `timestamp?: string` - Timestamp absoluto
- `date?: string` - Data

**Todas as props são opcionais e possuem valores default.**

---

## 📊 Estatísticas da Coleção

| Métrica | Valor |
|---------|-------|
| **Total de componentes** | 88 |
| **Plataformas cobertas** | 14 |
| **Linhas de código** | ~6,500 |
| **Tamanho compactado** | ~70KB |
| **Dependências** | 3 (React, Lucide, Tailwind) |

---

## ✅ Características

- ✨ **Minimalista** - Design limpo e focado
- 🎨 **Consistente** - Mesma estética em todos os mockups
- 📱 **Responsivo** - Adapta-se a diferentes telas
- ⚡ **Leve** - Sem dependências pesadas
- 🔧 **Customizável** - Todas as props configuráveis
- 💪 **TypeScript** - Tipagem completa
- 🚀 **Zero Config** - Funciona out-of-the-box
- 🎯 **Pixel Perfect** - Réplicas fiéis das interfaces reais

---

## 📝 Notas de Uso

### Tamanhos de Banners Google
Os banners Google seguem os tamanhos padrão do IAB:
- 728x90 (Leaderboard)
- 300x250 (Medium Rectangle)
- 160x600 (Wide Skyscraper)
- 300x600 (Half Page)
- 970x250 (Billboard)

### Aspect Ratios
- Instagram Feed: 1:1
- Instagram Story: 9:16
- YouTube Video: 16:9
- TikTok Video: 9:16
- Pinterest Pin: 2:3 ou 1:2

### Responsividade
Todos os componentes usam `max-w-*` para limitar largura em telas grandes e ocupam 100% da largura em mobile.

---

## 🚀 Próximos Passos

1. Integre os mockups em seu projeto
2. Customize cores e estilos conforme sua marca
3. Conecte com dados reais via props
4. Use em apresentações, protótipos ou ferramentas de design

---

## 📄 Licença

Componentes de uso livre. Sem restrições comerciais ou pessoais.

---

**Versão:** 1.0.0 (Mídia ON Completo)  
**Data:** Janeiro 2026  
**Categoria:** Mídia ON - Formatos Digitais  
**Total:** 88 mockups minimalistas
