# Edro Mobile (MVP)

App Expo com onboarding, login e dashboard basico para o beta.

## Requisitos
- Node.js 18+
- pnpm
- Expo Go (mobile) ou emulador

## Configuracao
Defina a API local/remota:
```
EXPO_PUBLIC_API_URL=http://localhost:3333
```

## Rodar local
```
pnpm install
pnpm start
```

## Fluxos cobertos
- Onboarding simples
- Login via `/api/auth/login`
- Dashboard basico via `/api/plan/stats`
