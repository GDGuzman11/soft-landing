import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, AppState } from 'react-native'

// Theme follows the user's local time of day: light 6am–4pm, dark 4pm–6am.
function themeForNow(): boolean {
  const h = new Date().getHours()
  return h >= 16 || h < 6
}

export const LIGHT = {
  bg: '#FAF8F5',
  headerBg: '#EDE6D9',
  surface: '#FFFFFF',
  amber: '#C4956A',
  sendBtn: '#3D2F2A',
  inkPrimary: '#3D2F2A',
  inkSecondary: '#1A1A1A',
  inkMuted: '#9A8F82',
  inkSubtle: '#C4B59A',
  hairline: 'rgba(61,47,42,0.12)',
  inputRow: '#F2EBE1',
  userBubble: '#C4956A',
  userBubbleText: '#FFFFFF',
  tabBar: '#FFFFFF',
  tabBorder: '#E8E3DC',
  tabIconInactive: '#6B6B6B',
  cardBorder: '#E8E3DC',
  sectionLabel: '#9C8B7E',
  profileCard: '#FFFFFF',
  searchBg: 'rgba(61,47,42,0.08)',
} as const

export const DARK = {
  bg: '#181716',
  headerBg: '#201E1C',
  surface: '#242220',
  amber: '#C4956A',
  sendBtn: '#C4956A',
  inkPrimary: '#F0EDE8',
  inkSecondary: '#F0EDE8',
  inkMuted: '#A8998C',
  inkSubtle: '#6A5E56',
  hairline: 'rgba(240,237,232,0.10)',
  inputRow: '#1E1C1A',
  userBubble: '#C4956A',
  userBubbleText: '#FFFFFF',
  tabBar: '#1A1917',
  tabBorder: '#2C2A28',
  tabIconInactive: '#888888',
  cardBorder: '#2C2A28',
  sectionLabel: '#7A6B60',
  profileCard: '#242220',
  searchBg: 'rgba(240,237,232,0.08)',
} as const

export type AppColors = { [K in keyof typeof LIGHT]: string }

type ThemeCtx = { isDark: boolean; colors: AppColors; toggle: () => void }

const ThemeContext = createContext<ThemeCtx>({ isDark: false, colors: LIGHT, toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(themeForNow())
  const fadeAnim = useRef(new Animated.Value(1)).current

  // Re-sync to the time-based theme whenever the app returns to the foreground.
  // The manual toggle below is a momentary override that resets on the next open.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setIsDark(themeForNow())
    })
    return () => sub.remove()
  }, [])

  const toggle = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 130,
      useNativeDriver: true,
    }).start(() => {
      setIsDark((prev) => !prev)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start()
    })
  }, [fadeAnim])

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggle }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext)
}

// Per-voice dark surface tints — desaturated darks that echo each voice's identity
export const VOICE_DARK: Record<string, { bg: string; border: string }> = {
  kind:   { bg: '#221E19', border: 'rgba(196,149,106,0.30)' },
  still:  { bg: '#1C1D1F', border: 'rgba(154,143,130,0.30)' },
  steady: { bg: '#1F1D1B', border: 'rgba(125,93,75,0.28)'   },
  wise:   { bg: '#1E1D1A', border: 'rgba(108,89,68,0.28)'   },
}
