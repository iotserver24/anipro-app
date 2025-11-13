---
title: Anisurge Expo/React Native Deep Dive
description: End-to-end breakdown of the Anisurge codebase, covering architecture, feature flows, services, stores, utilities, and native integrations.
---

# Anisurge Expo/React Native Deep Dive

## 1. Runtime Architecture
- **Expo Router Shell:** `app/_layout.tsx` loads fonts, restores auth with Firebase, initializes Zustand stores, and wires responsive navigation, keyboard navigation, and background media. It listens to orientation changes to toggle fullscreen playback flags in `useGlobalStore`.
- **Navigation Structure:** Files inside `app/` follow Expo Router conventions (e.g., `app/anime/[id].tsx`, modals, stacked routes). Tabs and stacked navigation options are registered in `_layout.tsx` and dedicated layout files when a directory contains `(tabs)` or `(modal)` groups.
- **State Management:** Zustand stores in `store/` and `stores/` manage global flags (`globalStore.ts`), watch history persistence (`watchHistoryStore.ts`), my list collection (`myListStore.ts`), character data (`stores/characterStore.ts`), and UI toggles. Many stores hydrate from AsyncStorage for offline continuity.
- **Services Layer:** `services/api.ts` wraps the anisurge proxy endpoints for search, detail, and streaming metadata. Additional services coordinate comments, donations, user profiles, update announcements, and media session controls.
- **Firebase Integration:** `services/firebase.ts` initializes the Firebase app and exports `auth`, `db`, and helper references used across the app. Cloud Functions are in `functions/` for premium/donation workflows.
- **Theming Context:** `contexts/ThemeContext.tsx` and `hooks/useTheme.ts` expose theming tokens (from `constants/themes.ts`) and background media config. Components watch `statusBarStyle`, `hasBackgroundMedia`, and `backgroundMedia` to render dynamic backdrops.

## 2. Feature Areas & Key Entry Points
- **Home Feed & Discovery**
  - `app/index.tsx` combines trending, continue watching, and collections.
  - UI: `components/TrendingSlider.js`, `components/ContinueWatching.tsx`, `components/AnimeCard.js`.
  - Data: `services/api.ts` for trending/recent lists, `store/watchHistoryStore.ts` for resume progress.
- **Anime Detail & Playback**
  - Routes: `app/anime/[id].tsx`, `app/anime/watch/[episodeId].tsx`.
  - Components: `components/VideoPlayer.tsx`, `components/VideoSettings.tsx`, `components/ControlsOverlay.tsx`, `components/CommentSection.tsx`.
  - Services: `services/api.ts` for metadata and streaming sources, `services/commentService.ts` for comment threads.
  - Global flags in `useGlobalStore` drive UI adjustments (fullscreen, nav visibility).
- **Search & Scheduling**
  - `app/search.tsx`, `app/schedule.tsx`, `components/SearchBar.tsx`.
  - Uses `services/api.ts` to fetch search results, airing schedules, and genre filters.
- **AI Chat & Community**
  - Routes: `app/aichat.tsx`, `app/chat.tsx`, `app/chat-history.tsx`, `app/character-select.tsx`, `app/character-store.tsx`.
  - Stores: `stores/characterStore.ts` for persona definitions, `store/globalStore.ts` for chat state flags.
  - Components: `components/PublicChat.tsx`, `components/AvatarSelectionModal.tsx`, `components/CharacterStore.tsx`.
  - Services: Pollinations integration through `services/userService.ts` or dedicated helpers (token via `.env`).
- **User Profile & Settings**
  - `app/profile.tsx`, `app/theme-settings.tsx`, `app/notifications.tsx`.
  - Components: `components/UserProfileModal.tsx`, `components/EmailVerificationBanner.tsx`, `components/UpdateModal.tsx`.
  - Services: `services/userService.ts` for restoring sessions, `services/themesApi.ts` for theme packs, `services/updateService.ts` for release notes.
- **Donations & Premium**
  - UI: `components/DonationStats.tsx`, `components/UserDonationBadge.tsx`.
  - Backend: Firebase Cloud Functions `functions/processDonation.js` & `setPremiumStatus.js`.
  - Data surfaces in Firestore user documents read inside `_layout.tsx` header avatar loader.
- **Notifications & History**
  - `app/history.tsx` shows watch logs backed by `store/watchHistoryStore.ts`.
  - `app/notifications.tsx` reads from Firebase/REST endpoints (see `services/userService.ts`).

## 3. Directory Walkthrough
- `app/` — Route components for every screen; dynamic segments for anime IDs and modals, plus special flows (`continue.tsx`, `importExport.tsx`).
- `components/` — Reusable UI: navigation (`BottomNav.tsx`, `ResponsiveNav.tsx`), modals (`AuthModal.tsx`, `CommentModal.tsx`, `DownloadOptionsModal.tsx`), load states (`LoadingOverlay.tsx`), analytics-driven UI (`DonationStats.tsx`), media players, and chat modules.
- `constants/` — API endpoints (`api.ts`, `apiKeys.ts`), static app config (`appConfig.ts`), cached avatars, themes, and caching intervals.
- `hooks/` — Device-aware helpers: `useResponsive.ts` (layout breakpoints), `useTVRemoteHandler.ts` (hardware remote mapping), `useKeyboardNavigation.ts` (web/desktop navigation), `useTheme.ts`.
- `services/` — Fetchers and orchestrators: 
  - `api.ts` for anime metadata & streams,
  - `commentService.ts` for posting/retrieving comments,
  - `donationService.ts` to query donation status,
  - `firebase.ts` bootstraps Firebase,
  - `mediaSessionService.ts` integrates with Web Media Session API,
  - `themesApi.ts` fetches theme packs,
  - `syncService.ts` handles watch history sync,
  - `updateService.ts` fetches release notes,
  - `userService.ts` manages auth restore, verification, and profile updates.
- `store/` and `stores/` — Zustand slices segmented by concern (global state, lists, watch history, character data) with AsyncStorage persistence in watch history and my list modules.
- `utils/` — Utility helpers (formatters, caching, string manipulations, analytics). Inspect `utils/*.ts` for specifics like `debounce`, `memoizedFetch`, or time formatters.
- `assets/` — Fonts, avatars, static imagery, background videos/gifs for theming.
- `scripts/` — Automation for release packaging, environment bootstrap, and maintenance tasks; check `.ps1` and `.js` scripts for CLI tooling.
- `updates/` (now archived under `docs/shis/updates/`) — Version changelogs consumed by `services/updateService.ts`.
- `android/`, `flutter/` — Native variants. `android/` is a full Gradle project for building native bundles; `flutter/` contains Dart client experiments and guides (all docs archived under `docs/shis/flutter/`).

## 4. Data Flow & Persistence
- **Authentication:** `services/userService.ts` wraps Firebase Auth, providing `restoreUserSession`, `isEmailVerified`, and helpers to fetch Firestore user data. `_layout.tsx` uses these to gate features and show verification prompts.
- **Watch History:** `store/watchHistoryStore.ts` loads from AsyncStorage at startup, syncs with remote endpoints (via `services/syncService.ts`), and refreshes every minute from `_layout.tsx`.
- **Comments & Community:** `services/commentService.ts` posts to backend endpoints (often Firebase Cloud Functions or REST API). `components/CommentSection.tsx` handles pagination and optimistic updates.
- **AI Chat:** Persona definitions from `constants/characters.ts` and `stores/characterStore.ts`; Pollinations requests include Bearer auth token from `.env`. Chat history stored locally (likely AsyncStorage) and optionally synced through Firebase.
- **Themes & Backgrounds:** `constants/themes.ts` defines color palettes; `ThemeContext` merges theme selection with remote background media references. `useTheme` exposes `backgroundMedia`, enabling `app/_layout.tsx` to render dynamic backgrounds with overlays.
- **Donations/Premium:** Cloud Functions write premium status and donation totals into Firestore user documents, read by header UI to show premium badge and gating features.

## 5. UI & Interaction Patterns
- **Responsive Layout:** `components/ResponsiveNav.tsx` switches between bottom tabs and side nav based on `useIsLargeScreen` from the same module; `useResponsive.ts` powers width breakpoints.
- **Video Playback:** `components/VideoPlayer.tsx` orchestrates Expo AV, hooking into `ControlsOverlay.tsx`, `VideoSettings.tsx`, and `mediaSessionService.ts` for remote controls. Orientation listeners in `_layout.tsx` toggle fullscreen nav suppression.
- **Modals & Overlays:** `components/AuthModal.tsx`, `LoadingModal.tsx`, `CommentModal.tsx`, `DownloadOptionsModal.tsx` rely on React Native modal primitives with theme-aware styling.
- **Feedback & Status:** `components/LoadingOverlay.tsx`, `components/LoadingAnimation.tsx`, and `components/DonationStats.tsx` present progress and analytics; `components/AppVersionInfo.jsx` surfaces version/build data.

## 6. Configuration Files
- `.env` — Secrets for APIs, Firebase config, Pollinations token. Required for local builds.
- `app.json` — Expo configuration: bundle ID, icons, deep links, updates.
- `eas.json` — Build profiles for Expo Application Services.
- `metro.config.js` — Custom asset and transformer settings.
- `tsconfig.json` — TypeScript compiler settings tuned for React Native.
- `firebase.rules`, `firestore.rules`, `firestore.indexes.json`, `database.rules.json` — Security configuration for Firebase; must match deployed backend.
- `expo-docs-index.md` (archived) — Legacy doc now under `docs/shis/`.

## 7. Build & Deployment Workflow
- **Install & Run:** `npm install`, `npx expo start` for Metro bundler + Expo DevTools.
- **Platform Targets:** `npm run android` (Expo Go) and `npm run ios` (simulator when available); use `eas build --platform <android|ios>` for binaries.
- **Native Android:** `android/gradlew assembleRelease` for native builds; ensure Gradle environment configured.
- **Flutter Prototype:** Navigate to `flutter/` (docs now under `docs/shis/flutter/`) and run `flutter run` for experiments.
- **Firebase Functions:** Deploy via `firebase deploy --only functions`; ensure Node version compatibility.
- **CI/CD:** GitHub Actions setup notes archived in `docs/shis/GITHUB_ACTIONS_SETUP.md`; replicate steps when wiring automated pipelines.

## 8. Testing & Quality Gates
- **Unit Tests:** Jest configured in `package.json`. Tests colocated with components/hooks (expand coverage for stores/services).
- **Type Safety:** Strict TypeScript across stores, services, and screens; keep interfaces (like `AnimeResult`, `AnimeDetails`) in sync with backend API.
- **Linting & Formatting:** ESLint + Prettier tasks (`npm run lint` if script defined). Maintain consistent style to avoid runtime style regressions.
- **Manual QA:** Focus on orientation handling, watch history syncing, chat responsiveness, and premium gating after significant changes.

## 9. Tooling & Automation
- `scripts/` directory contains Powershell/Node scripts for releases, environment preparation, and asset management.
- `run commands.txt` lists frequently used Expo/Firebase commands (archived in `docs/shis/run-commands.md` but still relevant).
- Release assets and notes reside under `releases/` and `updates/` (now archived).

## 10. Native & Platform-Specific Notes
- **Android (`android/`):** Gradle project with app module, supports generating APK/AAB outside Expo managed workflow. Ensure `google-services.json` is in place for Firebase.
- **Flutter (`flutter/`):** Experimental alternative client. Contains setup guides, Firebase instructions, and platform-specific notes (relocated to `docs/shis/flutter/`).
- **Cloud Functions (`functions/`):** Node.js environment for donation and premium logic; dependencies defined in each function folder.

## 11. Maintenance Guidelines
1. Keep `docs/app-info.md` for high-level summary and this deep dive updated when architectural changes occur.
2. Update `constants/api.ts` and related services if backend endpoints move.
3. Sync Firebase rules with deployed project whenever modifying Firestore structure.
4. Maintain AsyncStorage schemas (watch history, my list) during store refactors to avoid breaking persisted data.
5. Coordinate theme updates across `constants/themes.ts`, `ThemeContext`, and key components to maintain visual consistency.

## 12. Onboarding Checklist
- Install Node, npm, Expo CLI, and Firebase CLI.
- Clone repo, run `npm install`, and configure `.env`.
- Launch with `npx expo start`; test Android/iOS/web targets.
- Review `docs/app-info.md` and this deep dive to understand feature ownership.
- Set up Firebase credentials and Pollinations token locally.
- Run `npm run lint` and available tests before committing.

---

**Document Maintenance:** Revise this file whenever you introduce new routes, stores, services, or platform targets to keep institutional knowledge centralized. File archived docs or obsolete guides under `docs/shis/` to avoid clutter in the main documentation set.

