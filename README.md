# Desynar Mobile App

Expo (React Native) app for Desynar customers. Product and API docs live in the **mobile-app/** folder at the project root.

## Setup

```bash
cd app
npm install
```

## Run

- **iOS:** `npm run ios`
- **Android:** `npm run android`
- **Web:** `npm run web`

## Design tokens

- **Colors, spacing, shadows, typography:** `constants/theme.ts` (from `../mobile-app/colors.md`).
- **Semantic light/dark:** `constants/Colors.ts` (used by navigation and themed components).

## Fonts & logo

- **Font:** Metropolis is the brand font. Until font files are added, the app uses a fallback. See `assets/fonts/README.md`.
- **Logo:** Replace assets in `assets/images/` when provided. See `assets/images/README.md`.

## API

- **Base URL:** Set `EXPO_PUBLIC_API_BASE_URL` in `.env` (no trailing slash). Example: `https://api.desynar.com`. See `.env.example`.
- **Auth:** Bearer token stored in SecureStore (`web_auth_token`). When your login flow returns a token, call `login(token)` from `useAuth()`. Public endpoints (e.g. shop feed) work without a token; likes and orders require auth.
- **Client:** `services/api/` — `client.ts` (request + auth header), `clothes.ts`, `orders.ts`, `measurement-profiles.ts`. Types in `services/api/types.ts`.
- **Reference:** `../mobile-app/API-AND-DATA.md`.

## Screens & navigation

Screen specs and navigation map: `../mobile-app/screens/README.md`. UX and touch rules: `../mobile-app/rules/`.
