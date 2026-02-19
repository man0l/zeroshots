export const colors = {
  primary: '#38BDF8',
  background: '#0F172A',
  backgroundDeep: '#070B14',
  surface: '#1E293B',
  surfaceHighlight: '#334155',
  delete: '#EF4444',
  keep: '#10B981',
  archive: '#8B5CF6',
  textPrimary: '#F1F5F9',
  textMuted: '#94A3B8',
  slateBorder: '#334155',
  cyanGlow: '#06B6D4',
  purpleGlow: '#A855F7',
} as const

export const fonts = {
  display: 'SpaceGrotesk',
  body: 'Inter',
  mono: 'JetBrainsMono',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 24,
  full: 9999,
} as const

export const shadows = {
  glowRed: {
    shadowColor: colors.delete,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  glowGreen: {
    shadowColor: colors.keep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  glowSky: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  glowPurple: {
    shadowColor: colors.archive,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
} as const

export const swipeThresholds = {
  distance: 100,
  velocity: 500,
} as const

export const trustLimits = {
  free: 15,
  premium: Infinity,
} as const
