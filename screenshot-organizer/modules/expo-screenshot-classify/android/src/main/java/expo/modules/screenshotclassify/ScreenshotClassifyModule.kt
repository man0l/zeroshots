package expo.modules.screenshotclassify

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ScreenshotClassifyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoScreenshotClassify")

    // Stub: Android uses ML Kit from the app (getOnDeviceLabels in classifyAssets).
    // Return empty so JS falls back to filename mapping / heuristics when using this module.
    AsyncFunction("classifyImageAsync") { _: String ->
      emptyList<String>()
    }
  }
}
