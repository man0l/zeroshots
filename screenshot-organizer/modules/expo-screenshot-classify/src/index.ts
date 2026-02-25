import { requireOptionalNativeModule } from 'expo'

export interface ScreenshotClassifyModule {
  classifyImageAsync(uri: string): Promise<string[]>
}

export default requireOptionalNativeModule<ScreenshotClassifyModule>('ExpoScreenshotClassify')
