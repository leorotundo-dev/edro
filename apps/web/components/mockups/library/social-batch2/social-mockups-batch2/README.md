# Social Media Mockups - Batch 2 (38 Componentes Adicionais)

Segunda coleção de 38 componentes React/TypeScript minimalistas que expandem as plataformas existentes e adicionam 8 novas plataformas.

## 📦 Conteúdo

### Expansões de Plataformas Existentes (20 mockups)

#### Instagram (4 novos)
- **InstagramReel** - Reel vertical com overlay de ações
- **InstagramCarousel** - Post carrossel multi-imagem
- **InstagramLive** - Live streaming
- **InstagramAd** - Anúncio patrocinado

#### Facebook (3 novos)
- **FacebookEvent** - Card de evento
- **FacebookGroup** - Header de grupo
- **FacebookMarketplace** - Produto marketplace

#### LinkedIn (3 novos)
- **LinkedInJobPost** - Vaga de emprego
- **LinkedInCertificate** - Certificado profissional
- **LinkedInEvent** - Evento profissional

#### Twitter/X (2 novos)
- **TwitterSpace** - Card de Space ao vivo
- **TwitterMoment** - Moment/Coleção de tweets

#### YouTube (2 novos)
- **YouTubeLive** - Live streaming
- **YouTubePlaylist** - Card de playlist

#### TikTok (2 novos)
- **TikTokLive** - Live streaming
- **TikTokDuet** - Duet split screen

#### WhatsApp (2 novos)
- **WhatsAppGroup** - Mensagem de grupo
- **WhatsAppCall** - Tela de chamada

#### Pinterest (2 novos)
- **PinterestStory** - Story pin
- **PinterestProfile** - Perfil completo

---

### Novas Plataformas (18 mockups)

#### Twitch (4 mockups)
- **TwitchStream** - Card de stream ao vivo
- **TwitchChat** - Chat ao vivo
- **TwitchProfile** - Perfil de streamer
- **TwitchClip** - Clip de vídeo

#### Discord (3 mockups)
- **DiscordMessage** - Mensagem em canal
- **DiscordServer** - Card de servidor
- **DiscordEmbed** - Embed rico

#### Slack (2 mockups)
- **SlackMessage** - Mensagem em canal
- **SlackThread** - Thread de respostas

#### Medium (2 mockups)
- **MediumArticle** - Artigo completo
- **MediumProfile** - Perfil de autor

#### Substack (2 mockups)
- **SubstackNewsletter** - Newsletter post
- **SubstackSubscribe** - Card de inscrição

#### Behance (2 mockups)
- **BehanceProject** - Card de projeto
- **BehanceProfile** - Perfil de designer

#### Dribbble (2 mockups)
- **DribbbleShot** - Shot de design
- **DribbbleProfile** - Perfil de designer

#### Threads (1 mockup)
- **ThreadsPost** - Post do Threads

---

## 🎨 Design System Consistente

Todos os mockups seguem a mesma estética minimalista do Batch 1:

### Princípios
- Fundo branco limpo (ou dark quando apropriado)
- Apenas elementos essenciais
- Cores neutras como base
- Cor de marca da plataforma como destaque
- Tipografia system-ui
- Bordas arredondadas sutis (8px-12px)
- Sombras minimalistas
- Layout respirável

### Novas Cores de Marca
- **Twitch:** `#9146FF`
- **Discord:** `#5865F2`
- **Slack:** `#4A154B`
- **Medium:** `#000000`
- **Substack:** `#FF6719`
- **Behance:** `#1769FF`
- **Dribbble:** `#EA4C89`
- **Threads:** `#000000`

---

## 📥 Instalação

### Dependências

```bash
npm install react react-dom lucide-react tailwindcss
```

### TypeScript (opcional)
```bash
npm install -D typescript @types/react @types/react-dom
```

---

## 💻 Exemplos de Uso

### Instagram Reel
```tsx
import { InstagramReel } from './InstagramReel';

<InstagramReel 
  username="creator"
  profileImage="/avatar.jpg"
  reelImage="/video-thumb.jpg"
  caption="Check this out! 🔥"
  likes="12.4K"
  comments="234"
  audioName="Original audio"
/>
```

### Twitch Stream
```tsx
import { TwitchStream } from './TwitchStream';

<TwitchStream 
  thumbnail="/stream.jpg"
  streamTitle="Epic Gaming Session"
  streamerName="StreamerName"
  game="Game Name"
  viewers="2.4K"
  isLive={true}
/>
```

### Discord Message
```tsx
import { DiscordMessage } from './DiscordMessage';

<DiscordMessage 
  username="Username"
  userAvatar="/avatar.jpg"
  message="Hello everyone!"
  timestamp="Today at 10:30 AM"
  userColor="#5865F2"
/>
```

### Medium Article
```tsx
import { MediumArticle } from './MediumArticle';

<MediumArticle 
  articleImage="/cover.jpg"
  title="Article Title"
  subtitle="Subtitle or excerpt"
  authorName="Author Name"
  authorImage="/author.jpg"
  readTime="5 min read"
  date="Jan 27"
/>
```

---

## 🔧 Props Comuns

### Imagens
- `profileImage?: string`
- `postImage?: string`
- `coverImage?: string`
- `thumbnail?: string`

### Texto
- `username?: string`
- `caption?: string` / `message?: string`
- `title?: string`
- `description?: string`

### Métricas
- `likes?: number | string`
- `comments?: number`
- `views?: string`
- `followers?: string`

### Tempo
- `timeAgo?: string`
- `timestamp?: string`
- `date?: string`

**Todas as props são opcionais com valores default.**

---

## 📊 Estatísticas

- **Total de componentes:** 38
- **Plataformas expandidas:** 8
- **Novas plataformas:** 8
- **Tamanho total:** ~40KB compactado
- **Linhas de código:** ~2,800

---

## ✅ Características

- ✨ **Minimalista** - Design limpo e focado
- 🎨 **Consistente** - Mesma estética do Batch 1
- 📱 **Responsivo** - Adapta-se a diferentes telas
- ⚡ **Leve** - Sem dependências pesadas
- 🔧 **Customizável** - Todas as props configuráveis
- 💪 **TypeScript** - Tipagem completa
- 🚀 **Zero Config** - Funciona out-of-the-box

---

## 🔗 Compatibilidade

Este pacote é 100% compatível com o Batch 1. Você pode usar ambos juntos no mesmo projeto sem conflitos.

**Total combinado:** 76 mockups (38 do Batch 1 + 38 do Batch 2)

---

## 📝 Notas

### Live Streaming
Componentes de live (Instagram, YouTube, TikTok, Twitch) incluem indicador "LIVE" animado e contador de viewers.

### Dark Themes
Plataformas como Twitch, Discord e Slack usam temas escuros nativos para autenticidade.

### Responsividade
Todos os componentes usam `max-w-*` para limitar largura em telas grandes e ocupam 100% em mobile.

---

## 🚀 Próximos Passos

1. Integre os mockups em seu projeto
2. Combine com os mockups do Batch 1
3. Customize cores e estilos
4. Conecte com dados reais via props

---

## 📄 Licença

Componentes de uso livre. Sem restrições comerciais ou pessoais.

---

**Versão:** 2.0.0  
**Data:** Janeiro 2026  
**Criado para:** MemoDrops  
**Batch:** 2 de 2
