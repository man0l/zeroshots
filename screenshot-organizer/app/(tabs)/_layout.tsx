import { Tabs } from 'expo-router'
import { Platform, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../../src/lib/theme'
import { BlurView } from 'expo-blur'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'web' ? colors.surface : 'rgba(30, 41, 59, 0.4)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
        },
        tabBarBackground: () =>
          Platform.OS === 'web'
            ? (
              <View
                pointerEvents="none"
                style={{ position: 'absolute', inset: 0, backgroundColor: colors.surface }}
              />
            )
            : (
              <BlurView
                pointerEvents="none"
                intensity={40}
                tint="dark"
                style={{ position: 'absolute', inset: 0 }}
              />
            ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          textTransform: 'none',
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Stack',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'layers' : 'layers-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'grid' : 'grid-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  )
}
