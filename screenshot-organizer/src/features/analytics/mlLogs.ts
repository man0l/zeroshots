import { Platform } from 'react-native'
import { supabase } from '../../lib/supabase/client'
import { ingestEvents } from './events'
import { useSettingsStore } from '../../state/settings.store'

type MlSource = 'ios_vision' | 'android_mlkit'

export interface MlClassificationLog {
  source: MlSource
  rawLabels: string[]
  tags: string[]
  filename?: string | null
  createdAt?: string
}

export async function logMlClassification(log: MlClassificationLog): Promise<void> {
  const { analyticsEnabled, mlLogsEnabled } = useSettingsStore.getState()
  if (!analyticsEnabled || !mlLogsEnabled) {
    if (__DEV__) {
      console.log('[ML Logs] Skipping send (disabled in settings)', {
        analyticsEnabled,
        mlLogsEnabled,
      })
    }
    return
  }

  const timestamp = log.createdAt ?? new Date().toISOString()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null
  if (!userId) return

  try {
    if (__DEV__) {
      console.log('[ML Logs] Sending to analytics_events', log)
    }
    const { error } = await ingestEvents([{
      user_id: userId,
      event_name: 'ml_classification',
      properties: {
        source: log.source,
        platform: Platform.OS,
        raw_labels: log.rawLabels.slice(0, 32),
        mapped_tags: log.tags,
        filename: log.filename ?? null,
      },
      timestamp,
    }])
    if (error && __DEV__) {
      console.warn('[ML Logs] Supabase error', error)
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[ML Logs] Failed to send', e)
    }
  }
}

