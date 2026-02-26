import { Platform } from 'react-native'
import { supabase, edgeFn } from '../../lib/supabase/client'
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
  const payload = {
    events: [
      {
        name: 'ml_classification',
        properties: {
          source: log.source,
          platform: Platform.OS,
          raw_labels: log.rawLabels.slice(0, 32),
          mapped_tags: log.tags,
          filename: log.filename ?? null,
        },
        timestamp,
      },
    ],
  }

  try {
    if (__DEV__) {
      console.log('[ML Logs] Sending to Supabase event-ingest', payload)
    }
    const { error } = await supabase.functions.invoke(edgeFn('event-ingest'), {
      body: payload,
    })
    if (error && __DEV__) {
      console.warn('[ML Logs] Supabase error', error)
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[ML Logs] Failed to send', e)
    }
  }
}

