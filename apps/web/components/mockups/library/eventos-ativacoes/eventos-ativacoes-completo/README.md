# Mockups Eventos e Ativações - Coleção Completa

Coleção completa de **80 componentes React/TypeScript minimalistas** para comunicação visual em feiras, congressos e ações promocionais físicas.

---

## 📦 Conteúdo Completo (80 mockups)

### Estandes & Cenografia (30 mockups) ✅

#### Estandes (15 mockups)
1. EstandePequeno - Estande pequeno (9m²)
2. EstandeMedio - Estande médio (18m²)
3. EstandeGrande - Estande grande (36m²)
4. EstandeIlha - Estande ilha
5. EstandePonta - Estande de ponta
6. EstandeBackwall - Backwall/painel de fundo
7. EstandeBalcao - Balcão de atendimento
8. EstandeTotem - Totem de estande
9. EstandeBanner - Banner roll-up
10. EstandeXBanner - X-banner
11. EstandeLBanner - L-banner
12. EstandeMesa - Mesa promocional
13. EstandeCubo - Cubo suspenso
14. EstandeArco - Arco inflável
15. EstandeTenda - Tenda promocional

#### Cenografia (15 mockups)
1. PalcoEvento - Palco de evento
2. BackdropPalco - Backdrop de palco
3. PainelLED - Painel LED
4. TelaoProjecao - Telão de projeção
5. ArcoEntrada - Arco de entrada
6. PortalInflavel - Portal inflável
7. TunelInflavel - Túnel inflável
8. EstruturaSuspensa - Estrutura suspensa
9. PainelDirecional - Painel direcional
10. TotensEntrada - Totens de entrada
11. PhotoBooth - Photo booth
12. AreaLounge - Área lounge
13. ReceptionDesk - Reception desk
14. DisplayProduto - Display de produto
15. AreaDemonstracao - Área de demonstração

---

### Brindes & Merchandising (30 mockups) ✅

#### Brindes Corporativos (15 mockups)
1. Caneta - Caneta personalizada
2. Caderno - Caderno/bloco de notas
3. Copo - Copo/caneca
4. Ecobag - Ecobag
5. Chaveiro - Chaveiro
6. Camiseta - Camiseta
7. Bone - Boné
8. Squeeze - Squeeze/garrafa
9. PowerBank - Power bank
10. PenDrive - Pen drive
11. MousePad - Mouse pad
12. Agenda - Agenda
13. GuardaChuva - Guarda-chuva
14. Mochila - Mochila
15. KitEscritorio - Kit escritório

#### Merchandising PDV (15 mockups)
1. DisplayBalcao - Display de balcão
2. DisplayChao - Display de chão
3. WobbleMobile - Wobble/mobile
4. StopperGondola - Stopper de gôndola
5. FaixaGondola - Faixa de gôndola
6. AdesivoPiso - Adesivo de piso
7. AdesivoPrateleira - Adesivo de prateleira
8. Clipstrip - Clipstrip
9. Testador - Testador de produto
10. Demonstrador - Demonstrador
11. PortaFolder - Porta folder
12. Expositor - Expositor de produtos
13. PontaGondola - Ponta de gôndola
14. CheckStand - Check-stand
15. AreaPromocional - Área promocional

---

### Sinalização Local (20 mockups) ✅

#### Sinalização Interna (10 mockups)
1. PlacaDirecional - Placa direcional
2. PlacaPorta - Placa de porta
3. PlacaParede - Placa de parede
4. AdesivoParedeInterno - Adesivo de parede
5. AdesivoPisoInterno - Adesivo de piso
6. AdesivoVidro - Adesivo de vidro
7. PlacaSuspensa - Placa suspensa
8. TotemDirecional - Totem direcional
9. SinalizacaoBanheiro - Sinalização banheiro
10. SinalizacaoEmergencia - Sinalização emergência

#### Sinalização Externa (10 mockups)
1. PlacaFachada - Placa de fachada
2. LetreiroCaixa - Letreiro caixa
3. LetreiroRecorte - Letreiro recorte
4. TotemExterno - Totem externo
5. BandeiraVento - Bandeira wind banner
6. FaixaFachada - Faixa de fachada
7. AdesivoParedeExterno - Adesivo parede externa
8. PlacaEstacionamento - Placa estacionamento
9. CavaleteCalcada - Cavalete de calçada
10. PlacaHorario - Placa de horário

---

## 🎨 Design System Minimalista

Todos os 80 mockups seguem a mesma estética consistente das coleções Mídia ON e OFF:

### Princípios de Design
- **Fundo branco/cinza limpo**
- **Apenas elementos essenciais**
- **Cores neutras como base**
- **Cores de destaque por categoria**
- **Tipografia system-ui**
- **Bordas e sombras sutis**
- **Anotações de dimensões**

### Cores por Categoria
- **Estandes/Cenografia:** Azul/Roxo (#2563eb, #6366f1)
- **Brindes:** Verde (#10b981)
- **Merchandising PDV:** Laranja (#ea580c)
- **Sinalização Interna:** Teal (#0d9488)
- **Sinalização Externa:** Indigo (#4f46e5)

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

---

## 💻 Exemplos de Uso

### Estande Médio
```tsx
import { EstandeMedio } from './EstandeMedio';

<EstandeMedio 
  brandLogo="/logo.png"
  brandName="Your Brand"
  tagline="Your tagline here"
  backgroundImage="/booth-bg.jpg"
  accentColor="#2563eb"
/>
```

### Caneta Personalizada
```tsx
import { Caneta } from './Caneta';

<Caneta 
  productImage="/pen.jpg"
  brandLogo="/logo.png"
  brandColor="#10b981"
/>
```

### Display de Balcão
```tsx
import { DisplayBalcao } from './DisplayBalcao';

<DisplayBalcao 
  displayImage="/product.jpg"
  productName="Product Name"
  brandLogo="/logo.png"
  promoText="50% OFF"
/>
```

### Placa de Fachada
```tsx
import { PlacaFachada } from './PlacaFachada';

<PlacaFachada 
  brandName="Your Business"
  brandLogo="/logo.png"
  tagline="Open 24/7"
  backgroundColor="#1f2937"
  textColor="#ffffff"
/>
```

---

## 🔧 Props Comuns

### Estandes & Cenografia
- `brandLogo?: string` - Logo da marca
- `brandName?: string` / `eventName?: string` - Nome
- `tagline?: string` - Slogan
- `backgroundImage?: string` - Imagem de fundo
- `accentColor?: string` / `themeColor?: string` - Cor de destaque

### Brindes
- `productImage?: string` - Imagem do produto
- `brandLogo?: string` - Logo da marca
- `brandColor?: string` - Cor da marca

### Merchandising PDV
- `displayImage?: string` - Imagem do display
- `productName?: string` - Nome do produto
- `brandLogo?: string` - Logo da marca
- `promoText?: string` - Texto promocional

### Sinalização
- `text?: string` - Texto da sinalização
- `brandName?: string` - Nome da marca
- `brandLogo?: string` - Logo da marca
- `backgroundColor?: string` - Cor de fundo
- `textColor?: string` - Cor do texto

**Todas as props são opcionais com valores default.**

---

## 📊 Estatísticas da Coleção

| Métrica | Valor |
|---------|-------|
| **Total de componentes** | 80 |
| **Categorias** | 3 (Estandes, Brindes, Sinalização) |
| **Linhas de código** | ~6,000 |
| **Tamanho compactado** | ~70KB |
| **Dependências** | 3 (React, Lucide, Tailwind) |

---

## ✅ Características

- ✨ **Minimalista** - Design limpo e focado
- 🎨 **Consistente** - Mesma estética das coleções anteriores
- 📱 **Responsivo** - Adapta-se a diferentes telas
- ⚡ **Leve** - Sem dependências pesadas
- 🔧 **Customizável** - Todas as props configuráveis
- 💪 **TypeScript** - Tipagem completa
- 🚀 **Zero Config** - Funciona out-of-the-box
- 📏 **Dimensões reais** - Proporções autênticas dos formatos

---

## 📝 Notas de Uso

### Dimensões dos Formatos

**Estandes:**
- Pequeno: 9m²
- Médio: 18m²
- Grande: 36m²
- Roll-up: 0.85x2m
- X-banner: 0.8x1.8m

**Brindes:**
- Caneta: standard
- Caderno: A5
- Copo: 350ml
- Ecobag: 40x35cm
- Squeeze: 500ml

**Sinalização:**
- Placa porta: 20x5cm
- Placa banheiro: 15x15cm
- Totem: variável
- Fachada: variável

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

**Versão:** 1.0.0 (Eventos e Ativações Completo)  
**Data:** Janeiro 2026  
**Categoria:** Eventos e Ativações  
**Total:** 80 mockups minimalistas
