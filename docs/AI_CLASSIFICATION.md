# AI classification for screenshots

## Current behavior

The app is **native only** (iOS/Android). Classification is **on-device only**; Gemini and the `classify-image` edge function are not used.

- **iOS (AI enabled)**: **Apple Vision** (`VNClassifyImageRequest`) via the local Expo module `expo-screenshot-classify`. No network. Raw labels are mapped to app tags in `onDeviceTagMapping.ts`.
- **Android (AI enabled)**: **Google ML Kit** Image Labeling (`@react-native-ml-kit/image-labeling`). No network. Same tag mapping as iOS.
- **AI disabled**: No classification; all assets get the default tag `screenshot`.
- **No local AI result**: If Vision/ML Kit returns no labels or throws (e.g. Expo Go, module unavailable), the asset gets the default tag only. No fallback logic.

## Tag set

Tags are defined in `src/features/screenshot-inbox/onDeviceTagMapping.ts` (`VALID_TAGS`).

## Development build required

On-device classification uses native code and **does not run in Expo Go**. Use:

- `npx expo run:ios`
- `npx expo run:android`

Run `npx expo prebuild --clean` after adding or changing the local module if needed.

## Performance

- One `classifyAssets(slice)` call per batch, then a single `setAssets` merge.
- Up to 2 assets classified in parallel. Works offline.
