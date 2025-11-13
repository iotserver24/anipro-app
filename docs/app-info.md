---
title: Anisurge Expo App Reference
description: Comprehensive technical overview and operational guide for the Anisurge Expo/React Native codebase.
---

# Anisurge Expo App Reference

## 1. Project Overview
- **Purpose:** Cross-platform anime streaming, discovery, and community experience with AI-assisted chat and personalization features.
- **Primary Stack:** Expo Router + React Native (TypeScript), Zustand for state, Firebase (Firestore, Realtime Database, Storage, Cloud Functions), and custom services for external anime APIs.
- **Secondary Targets:** Native Android project (`android/`) and Flutter prototype (`flutter/`), treated as auxiliary clients.

## 2. Runtime Architecture
- **Expo Router:** Files under `app/` map to navigation routes, modals, and stacked layouts. Dynamic segments such as `app/anime/[...404].tsx` handle fallbacks.
- **State Layer:** Global app state via Zustand stores (`store/`, `stores/`) with modular slices for authentication, watch history, character data, and chat drafts.
- **UI Toolkit:** Shared, Expo-compatible components in `components/` combine React Native primitives with custom styling, animated overlays, and video playback (`VideoPlayer.tsx`).
- **Services Layer:** Network helpers in `services/` abstract REST calls, caching, and error normalization against third-party anime APIs and Pollinations AI endpoints.
- **Theming:** `contexts/ThemeContext.tsx` + `hooks/useTheme.ts` deliver responsive, light/dark aware styling and allow per-user overrides saved in persistent storage.

## 3. Key Features & Entry Points
- **Home & Discovery:** `app/index.tsx`, `components/TrendingSlider.js`, and `components/ContinueWatching.tsx` orchestrate personalized feeds.
- **Anime Details & Search:** `app/anime/*`, `app/search.tsx`, `components/AnimeCard.js` deliver metadata-driven browsing with pagination and filtering.
- **Watch Management:** `app/history.tsx`, `app/mylist.tsx`, `store/watchHistoryStore.ts` manage progress tracking and offline-friendly caching.
- **AI Chat Experience:** `app/aichat.tsx`, `app/chat.tsx`, `components/PublicChat.tsx`, `store/characterStore.ts` combine persona selection, chat history, and Pollinations interactions.
- **User & Settings:** `app/profile.tsx`, `app/notifications.tsx`, `app/theme-settings.tsx` expose profile editing, alert preferences, and theme controls.
- **Donations & Premium:** Firebase Cloud Functions (`functions/processDonation.js`, `functions/setPremiumStatus.js`) update premium flags; UI surfaces in `components/UserDonationBadge.tsx` and `components/DonationStats.tsx`.

## 4. Directory Guide
- `app/` – Route files describing screens, modals, and grouped layouts.
- `components/` – Reusable UI, including modals (`AuthModal.tsx`), overlays (`LoadingOverlay.tsx`), nav shells (`BottomNav.tsx`), media loaders, and forms.
- `constants/` – API endpoints, static configuration (`api.ts`, `appConfig.ts`, `avatars.ts`, `themes.ts`).
- `hooks/` – Custom React hooks for remote navigation, responsiveness, TV inputs, and keyboard support.
- `services/` – API clients, download handlers, media streaming utilities, and Pollinations integration helpers.
- `store/` & `stores/` – Zustand slices keyed by feature (watch history, personal lists, character data, global UI state).
- `utils/` – Formatting, data normalization, caching, debounce helpers, analytics helpers.
- `assets/` – Shared imagery, fonts, adaptive icons, and background loops.
- `scripts/` – Automation for releases, environment setup, and maintenance.
- `functions/` – Firebase backend logic triggered by donation or subscription events.
- `updates/` – Versioned release notes; archived Markdown copies now live under `docs/shis/updates/`.

## 5. Data & Integrations
- **Anime Metadata:** External providers (e.g., AniList, Kitsu) proxied via `services/animeService.ts` (see code for specific endpoints).
- **Authentication:** Firebase Auth tokens managed in services; theme and chat personalization tied to user documents.
- **Pollinations AI:** Requests to `https://text.pollinations.ai/openai?token=uNoesre5jXDzjhiY` with `Authorization: Bearer uNoesre5jXDzjhiY` (see workspace memory).
- **Realtime Features:** Firebase Realtime Database + Firestore for chat logs, watch state, and donation history.
- **Local Persistence:** AsyncStorage wrappers within `store/` to retain user choices offline.

## 6. Styling & UX Patterns
- **Theme Tokens:** Colors and typography defined in `constants/themes.ts` and consumed through `useTheme`.
- **Responsive Layout:** `hooks/useResponsive.ts` selects layout components (e.g., `ResponsiveNav.tsx`) based on viewport class.
- **TV & Remote Support:** `hooks/useTVRemoteHandler.ts` ensures focus navigation on Android TV / smart devices.
- **Media Playback:** `components/VideoPlayer.tsx` composes Expo AV, settings overlay (`components/VideoSettings.tsx`), and remote control actions.
- **Loading & Skeletons:** `components/LoadingOverlay.tsx`, `components/LoadingModal.tsx`, and `components/LoadingAnimation.tsx`.

## 7. Configuration & Environment
- `.env` – API keys, Firebase config, Pollinations tokens. Never commit secrets.
- `app.json` / `app.config.js` – Expo manifest (icons, deeplinks, extra config).
- `firebase.rules`, `firestore.rules`, `database.rules.json` – Security rules; must align with deployed Firebase project.
- `eas.json` – Expo Application Services build profiles.
- `metro.config.js` – Bundler overrides for asset resolution and SVG support.

## 8. Build & Deployment
- **Local Development:** `npm install`, `npx expo start` (Metro bundler, web preview). Use `expo-doctor` for diagnostics.
- **Android:** `npm run android` (Expo Go) or build via EAS. Native module adjustments live in `android/`.
- **iOS:** `npm run ios` for simulator when macOS available; iOS-specific assets captured under `assets/`.
- **Standalone Builds:** `eas build --platform <android|ios>` referencing profiles in `eas.json`.
- **Firebase Functions:** Deploy with `firebase deploy --only functions` after editing `functions/`.

## 9. Testing & Quality
- **Unit/Integration:** Jest configuration resides in `package.json`; tests placed adjacent to components (not yet comprehensive).
- **Type Safety:** TypeScript enforced via `tsconfig.json`; keep store/services definitions typed to prevent runtime regressions.
- **Linting:** Project expects ESLint/Prettier (see `.eslintrc` / `.prettierrc` if present). Run `npm run lint`.
- **Performance Considerations:** Memoize heavy component props, leverage `React.memo` and virtualization for list-heavy screens (`FlatList` optimizations).

## 10. Scripts & Tooling
- `scripts/` directory contains Powershell/bash helpers for release packaging, environment sync, and backup operations.
- `run commands.txt` enumerates frequently used CLI commands.
- `eas.json` and `package.json` scripts manage OTA updates and CI integration.

## 11. Assets & Content Pipeline
- **Adaptive Icons & Splash:** Managed under `assets/adaptive-icon/` and root PNGs.
- **Backgrounds & Animations:** `.gif`, `.mp4`, and `.jpg` backgrounds for chat/home experiences.
- **Avatars:** `assets/avatars/` and `constants/avatars.ts` map characters to image assets.
- **Fonts:** Custom font families under `assets/fonts/` registered in app entrypoint (`index.ts`).

## 12. Developer Workflow
1. Clone and install dependencies (`npm install`).
2. Configure `.env` with Firebase + Pollinations tokens.
3. Launch Metro (`npx expo start`) and choose platform (web, Android, iOS).
4. Modify routes in `app/` and components under `components/`.
5. Maintain type safety and lint before committing.
6. Update `docs/app-info.md` when introducing structural or architectural changes.

## 13. Future Enhancements (Suggestions)
- Strengthen Jest coverage for core hooks and critical screens.
- Consider extracting analytics/tracking into dedicated service to centralize event schema.
- Explore code-splitting or lazy-loading for heavy feature screens to improve startup time.
- Integrate CI checks (lint/test/build) via GitHub Actions for consistent quality gates.

---

**Maintainers:** Update this document alongside major architectural changes or new platform support to keep the team aligned.

