# Code review: On-device AI classification

## Summary

The implementation matches the plan: tag mapping module, iOS Vision via local Expo module, Android ML Kit with content:// handling, and unified flow in `classifyAssets` / `classifyAssetsBatch`. A few robustness and cleanup improvements are recommended below.

---

## 1. Correctness and logic

| Area | Status | Notes |
|------|--------|--------|
| Platform branching | OK | Web → Gemini + user; native → on-device; no user required on native. |
| Fallback | OK | Empty labels or thrown errors fall back to `classifyByHeuristics`. |
| Tag mapping | OK | `mapOnDeviceLabelsToTags` returns at least `['screenshot']`; filename hints merged. |
| Batch vs single | OK | `classifyAssets` uses concurrency 2; `classifyAssetsBatch` is sequential with progress (and 200 ms delay on native, 500 ms on web). |

**Minor:** `onDeviceTagMapping.ts` has duplicate `'form'` in the document keywords array (line 30). Harmless; can be deduplicated.

---

## 2. Error handling and edge cases

| Area | Status | Notes |
|------|--------|--------|
| Optional native module | OK | `requireOptionalNativeModule` + `ExpoScreenshotClassify?.classifyImageAsync` avoid crashes in Expo Go. |
| ML Kit require | OK | `getOnDeviceLabelsAndroid` wraps `require` and call in try/catch; returns `[]` on failure. |
| Vision on iOS | OK | Module returns `[]` when file is missing or request fails. |
| Empty assets | OK | `runWithConcurrency` and batch loops handle empty arrays. |

**Issue:** On Android, when copying `content://` to a temp file, the temp file is never deleted. Over time the cache directory can accumulate many `screenshot_classify_*.jpg` files.

**Recommendation:** Delete the temp file after use (e.g. in a `finally` block), or explicitly when `copyAsync` succeeds and labeling has run.

**Issue:** `FileSystem.cacheDirectory` is typed as `string | null`. If it is null, `${FileSystem.cacheDirectory}screenshot_classify_...` becomes `"nullscreenshot_classify_..."`, which can cause incorrect or failing behavior.

**Recommendation:** Guard: if `!FileSystem.cacheDirectory`, skip the copy and pass the original URI (or return `[]` and document that cache is required for content://).

---

## 3. Performance

| Area | Status | Notes |
|------|--------|--------|
| Concurrency | OK | `classifyAssets` uses `runWithConcurrency(assets, 2, ...)` for both web and native. |
| Batch | OK | `classifyAssetsBatch` is sequential; 200 ms (native) / 500 ms (web) delay between items is reasonable. |
| Memory | OK | No accumulation of large buffers; Android copies one file at a time. |
| useGallery | OK | Single `classifyAssets(slice)` call and one `setAssets` merge. |

**Optional:** Run Vision’s `handler.perform([request])` on a background queue in the iOS module so the main/JS thread is not blocked during classification. Expo’s async native code may already run off the main thread; if not, dispatching to a background queue would improve responsiveness.

---

## 4. Security and robustness

| Area | Status | Notes |
|------|--------|--------|
| URI handling | OK | Only `content://` triggers copy; `file://` and plain paths used as-is. |
| Input | OK | No unsanitized input sent to native; URIs come from MediaLibrary. |
| Tags | OK | `VALID_TAGS` and `add()` ensure only allowed tags are returned. |

No critical issues.

---

## 5. Maintainability and consistency

| Area | Status | Notes |
|------|--------|--------|
| Tag set | OK | `VALID_TAGS` in `onDeviceTagMapping.ts` is the single source of truth; should be kept in sync with edge function. |
| Duplication | OK | Web vs native logic is clearly separated; shared helpers (`getOnDeviceLabels`, `mapOnDeviceLabelsToTags`, `classifyByHeuristics`) reused. |
| Comments | OK | Intent of on-device vs cloud and Android stub is documented. |

**Suggestion:** In the iOS module, add a short comment that `ph://` (Photos library) URIs are not supported and that callers should resolve them to a `file://` path first, to avoid confusion when Vision returns no labels.

---

## 6. Platform-specific

| Platform | Status | Notes |
|----------|--------|--------|
| iOS | OK | Vision used; `file://` supported. `ph://` not supported (document/comment). |
| Android | OK | ML Kit + copy for `content://`; temp path uses `cacheDirectory`. Add null check and temp cleanup. |
| Web | OK | Gemini path unchanged; no native module or ML Kit. |

---

## 7. Applied fixes (from this review)

1. **Android temp file cleanup:** Delete the temp file in a `finally` block after calling ML Kit (or after copy + label), so cache does not grow indefinitely.
2. **cacheDirectory null guard:** If `FileSystem.cacheDirectory` is null, do not copy; pass original URI or return `[]` and avoid invalid path.
3. **Duplicate keyword:** Remove the duplicate `'form'` in the document entry in `onDeviceTagMapping.ts`.
4. **iOS comment:** Add a one-line comment in `ScreenshotClassifyModule.swift` that only `file://` is supported and `ph://` must be resolved by the app.

---

## Checklist (post-fix)

- [x] Android temp file is deleted after use (`finally` + `deleteAsync(..., { idempotent: true })`).
- [x] `FileSystem.cacheDirectory` is checked before building temp path; return `[]` if null.
- [x] No duplicate keywords in `LABEL_TO_TAG` (removed duplicate `'form'`).
- [x] iOS module comments mention `file://`-only / `ph://` resolution (doc comment on `classifyImage`).
