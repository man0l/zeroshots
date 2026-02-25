# AI classification for screenshots

## Current behavior

- **iOS (AI enabled)**: On-device classification using **Apple Vision** (`VNClassifyImageRequest`) via the local Expo module `expo-screenshot-classify`. No network, no cost. Raw labels are mapped to app tags in `onDeviceTagMapping.ts`.
- **Android (AI enabled)**: On-device classification using **Google ML Kit** Image Labeling (`@react-native-ml-kit/image-labeling`). No network, no cost. Same tag mapping as iOS.
- **Web (AI enabled)**: Cloud classification via the **Gemini** `classify-image` edge function (requires logged-in user). Set `GEMINI_API_KEY` in your backend env for Gemini to run.
- **AI disabled**: Instant **heuristics** only (filename + aspect ratio + size) on all platforms.
- **Fallback**: If on-device classification fails or returns nothing (e.g. Expo Go, or module unavailable), the app falls back to heuristics.

## Tag set

Tags are defined in `src/features/screenshot-inbox/onDeviceTagMapping.ts` (`VALID_TAGS`) and must match the edge function: `receipt`, `chat`, `meme`, `error`, `article`, `photo`, `document`, `code`, `map`, `ticket`, `screenshot`.

## Development build required

On-device classification (Vision on iOS, ML Kit on Android) uses native code and **does not run in Expo Go**. Use a development build:

- `npx expo run:ios`
- `npx expo run:android`

After adding or changing the local module, run `npx expo prebuild --clean` if needed so native projects pick up the module.

## Performance

- **Gallery**: One `classifyAssets(slice)` call per batch (15 or 40 assets), then a single `setAssets` merge (one re-render).
- **Concurrency**: Up to 2 assets classified in parallel on native and web (Gemini path).
- **Native**: No image upload; Vision/ML Kit run on the device. Works offline.

## Quick checks

- **Native (iOS)**: Enable AI, open gallery; tags should appear from Vision. If you see only generic tags, check that asset URIs are `file://` (Vision module supports file paths; `ph://` may need resolution elsewhere).
- **Native (Android)**: Enable AI; if URIs are `content://`, the app copies to a temp file before calling ML Kit.
- **Web**: AI + logged-in user uses Gemini; ensure `GEMINI_API_KEY` is set in the edge function environment.
- **Expo Go**: On-device AI is unavailable; classification falls back to heuristics.
