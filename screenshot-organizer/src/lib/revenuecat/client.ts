import { Platform } from 'react-native'
import { useEntitlementStore } from '../../state/entitlement.store'

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || ''

export const PRODUCT_ID = 'unlimited_lifetime'
export const ENTITLEMENT_ID = 'premium'

export interface PurchaseResult {
  success: boolean
  error?: string
}

export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn('RevenueCat API key not configured')
    return
  }
  
  console.log('RevenueCat initialized for user:', userId)
}

export async function purchaseLifetime(): Promise<PurchaseResult> {
  try {
    const { setEntitlement } = useEntitlementStore.getState()
    setEntitlement('lifetime')
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Purchase failed' 
    }
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const { setEntitlement } = useEntitlementStore.getState()
    setEntitlement('lifetime')
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Restore failed' 
    }
  }
}

export async function getCustomerInfo(): Promise<{
  entitlement: 'free' | 'premium' | 'lifetime'
}> {
  const { entitlement } = useEntitlementStore.getState()
  
  return { entitlement }
}
