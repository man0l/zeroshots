import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// On Android emulator, "localhost" is the device itself. Use 10.0.2.2 to reach the host machine.
export function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  if (Platform.OS === 'android' && (url.includes('localhost') || url.includes('127.0.0.1'))) {
    return url.replace(/localhost|127\.0\.0\.1/g, '10.0.2.2')
  }
  return url
}

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce' as const, // Required for Android: code in query params; hash is stripped on custom scheme redirect
  },
})

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          timezone: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          timezone?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          timezone?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          provider: string
          entitlement: 'free' | 'premium' | 'lifetime'
          status: string
          expires_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          entitlement?: 'free' | 'premium' | 'lifetime'
          status?: string
          expires_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          entitlement?: 'free' | 'premium' | 'lifetime'
          status?: string
          expires_at?: string | null
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          user_id: string
          platform_asset_id: string
          type: string
          created_at_device: string
          size_bytes: number
          hash: string | null
          tags: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          platform_asset_id: string
          type?: string
          created_at_device: string
          size_bytes: number
          hash?: string | null
          tags?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          platform_asset_id?: string
          type?: string
          created_at_device?: string
          size_bytes?: number
          hash?: string | null
          tags?: string[] | null
        }
      }
      cleanup_sessions: {
        Row: {
          id: string
          user_id: string
          started_at: string
          ended_at: string | null
          reviewed_count: number
          deleted_count: number
          archived_count: number
          saved_bytes: number
        }
        Insert: {
          id?: string
          user_id: string
          started_at?: string
          ended_at?: string | null
          reviewed_count?: number
          deleted_count?: number
          archived_count?: number
          saved_bytes?: number
        }
        Update: {
          id?: string
          user_id?: string
          started_at?: string
          ended_at?: string | null
          reviewed_count?: number
          deleted_count?: number
          archived_count?: number
          saved_bytes?: number
        }
      }
      cleanup_actions: {
        Row: {
          id: string
          session_id: string
          asset_id: string
          action: 'keep' | 'delete' | 'archive' | 'undo'
          action_at: string
        }
        Insert: {
          id?: string
          session_id: string
          asset_id: string
          action: 'keep' | 'delete' | 'archive' | 'undo'
          action_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          asset_id?: string
          action?: 'keep' | 'delete' | 'archive' | 'undo'
          action_at?: string
        }
      }
      usage_counters: {
        Row: {
          id: string
          user_id: string
          period_start: string
          period_end: string
          deletes_used: number
          trust_limit: number
        }
        Insert: {
          id?: string
          user_id: string
          period_start: string
          period_end: string
          deletes_used?: number
          trust_limit?: number
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string
          period_end?: string
          deletes_used?: number
          trust_limit?: number
        }
      }
    }
  }
}
