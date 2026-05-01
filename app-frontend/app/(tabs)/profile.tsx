import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Image, Switch } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSettings, getCheckIns, getSavedMessages } from '@/storage/storage'
import { getCurrentUser, signOutUser } from '@/services/auth'
import type { AppSettings, AuthUser, CheckInEvent, SavedMessage } from '@/types'
import { useTheme } from '@/theme'

const PHOTO_KEY = '@soft_landing/profile_photo_uri'

function calcStreak(checkIns: CheckInEvent[]): number {
  if (checkIns.length === 0) return 0
  const dates = [...new Set(checkIns.map((e) => e.timestamp.slice(0, 10)))]
    .sort()
    .reverse()
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  let cursor = today
  for (const date of dates) {
    if (date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().slice(0, 10)
    } else if (date < cursor) {
      break
    }
  }
  return streak
}

const FAITH_BACKGROUND_LABELS: Record<NonNullable<AppSettings['faithBackground']>, string> = {
  established: 'Established faith',
  exploring: 'Exploring faith',
  between: 'Between faiths',
}

const PRIMARY_INTENT_LABELS: Record<NonNullable<AppSettings['primaryIntent']>, string> = {
  peace: 'Peace',
  strength: 'Strength',
  comfort: 'Comfort',
  guidance: 'Guidance',
  exploring: 'Still exploring',
}

const LIFE_STAGE_LABELS: Record<NonNullable<AppSettings['lifeStage']>, string> = {
  early: 'Early life',
  middle: 'Midlife',
  later: 'Later life',
}

function faithBackgroundLabel(value: AppSettings['faithBackground']): string {
  return value ? FAITH_BACKGROUND_LABELS[value] : 'Not set'
}

function primaryIntentLabel(value: AppSettings['primaryIntent']): string {
  return value ? PRIMARY_INTENT_LABELS[value] : 'Not set'
}

function lifeStageLabel(value: AppSettings['lifeStage']): string {
  return value ? LIFE_STAGE_LABELS[value] : 'Not set'
}

type LoadState = 'loading' | 'ready' | 'error'

const PRIMARY_BUTTON_TEXT_STYLE = {
  fontFamily: 'DMSans_500Medium',
  fontSize: 14,
  color: '#FFFFFF',
} as const

interface SectionLabelProps {
  children: string
}

function SectionLabel({ children, color }: SectionLabelProps & { color: string }) {
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        color,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  )
}

interface InfoRowProps {
  label: string
  value: string
  isFirst?: boolean
  labelColor: string
  valueColor: string
  borderColor: string
}

function InfoRow({ label, value, isFirst = false, labelColor, valueColor, borderColor }: InfoRowProps) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: borderColor,
      }}
    >
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: labelColor }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: valueColor }}>
        {value}
      </Text>
    </View>
  )
}

export default function ProfileScreen() {
  const { isDark, colors, toggle: toggleTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [checkIns, setCheckIns] = useState<CheckInEvent[]>([])
  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setLoadState('loading')
      ;(async () => {
        try {
          const [s, c, m, storedPhoto] = await Promise.all([
            getSettings(),
            getCheckIns(),
            getSavedMessages(),
            AsyncStorage.getItem(PHOTO_KEY),
          ])
          const u = getCurrentUser()
          if (cancelled) return
          setSettings(s)
          setCheckIns(c)
          setSavedMessages(m)
          setUser(u)
          setPhotoUri(storedPhoto)
          setLoadState('ready')
        } catch {
          if (cancelled) return
          setLoadState('error')
        }
      })()
      return () => {
        cancelled = true
      }
    }, [])
  )

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access in Settings to add a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri
      await AsyncStorage.setItem(PHOTO_KEY, uri)
      setPhotoUri(uri)
    }
  }

  if (loadState === 'loading') {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <ActivityIndicator color={colors.amber} />
      </View>
    )
  }

  if (loadState === 'error' || !settings) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: colors.bg }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 18,
            color: '#3D2F2A',
            marginBottom: 8,
          }}
        >
          Something went wrong
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: '#9A8F82',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          We couldn't load your profile right now.
        </Text>
        <Pressable
          onPress={() => {
            // Force a reload by toggling state — useFocusEffect re-runs on navigation.
            setLoadState('loading')
            ;(async () => {
              try {
                const [s, c, m] = await Promise.all([
                  getSettings(),
                  getCheckIns(),
                  getSavedMessages(),
                ])
                setSettings(s)
                setCheckIns(c)
                setSavedMessages(m)
                setUser(getCurrentUser())
                setLoadState('ready')
              } catch {
                setLoadState('error')
              }
            })()
          }}
          style={{
            backgroundColor: '#C4956A',
            paddingHorizontal: 24,
            paddingVertical: 10,
            borderRadius: 999,
          }}
        >
          <Text style={PRIMARY_BUTTON_TEXT_STYLE}>
            Try again
          </Text>
        </Pressable>
      </View>
    )
  }

  const isPremium = settings.subscription.tier === 'premium'
  const streak = calcStreak(checkIns)
  const displayName = settings.name?.trim() ? settings.name.trim() : 'Friend'

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <View className="px-6 pt-14 pb-2">
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 24, color: colors.inkPrimary }}
        >
          Profile
        </Text>
      </View>

      {/* Identity Card */}
      <View
        className="mx-6 mt-4 rounded-2xl"
        style={{ padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.profileCard, borderWidth: 1, borderColor: colors.cardBorder }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: colors.inkPrimary }}>
            {displayName}
          </Text>
          {user?.email ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: colors.inkMuted,
                marginTop: 4,
              }}
            >
              {user.email}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={handlePickPhoto}
          accessibilityRole="button"
          accessibilityLabel={photoUri ? 'Change profile photo' : 'Add profile photo'}
          style={{ marginLeft: 16 }}
        >
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#F5EBD8',
                borderWidth: 1.5,
                borderColor: '#E8DFD0',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 11,
                  color: '#C4956A',
                  textAlign: 'center',
                  lineHeight: 14,
                }}
              >
                {'Add\nPhoto'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Faith Section */}
      <View className="mx-6 mt-5">
        <SectionLabel color={colors.sectionLabel}>FAITH</SectionLabel>
        <View style={{ backgroundColor: colors.profileCard, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
          <InfoRow label="Background" value={faithBackgroundLabel(settings.faithBackground)} isFirst labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
          <InfoRow label="Seeking" value={primaryIntentLabel(settings.primaryIntent)} labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
          <InfoRow label="Life Stage" value={lifeStageLabel(settings.lifeStage)} labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
        </View>
      </View>

      {/* Stats Section */}
      <View className="mx-6 mt-5">
        <SectionLabel color={colors.sectionLabel}>STATS</SectionLabel>
        <View style={{ backgroundColor: colors.profileCard, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
          <InfoRow label="Total check-ins" value={String(checkIns.length)} isFirst labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
          <InfoRow label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
          <InfoRow label="Saved verses" value={String(savedMessages.length)} labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
        </View>
      </View>

      {/* Subscription Section */}
      <View className="mx-6 mt-5">
        <SectionLabel color={colors.sectionLabel}>SUBSCRIPTION</SectionLabel>
        <View style={{ backgroundColor: colors.profileCard, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
          <InfoRow label="Plan" value={isPremium ? 'Premium' : 'Free'} isFirst labelColor={colors.inkMuted} valueColor={colors.inkPrimary} borderColor={colors.cardBorder} />
          {!isPremium && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <Pressable
                onPress={() => router.push('/paywall')}
                style={{ backgroundColor: colors.amber, borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Upgrade to premium"
              >
                <Text style={PRIMARY_BUTTON_TEXT_STYLE}>Upgrade →</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Appearance Section */}
      <View className="mx-6 mt-5">
        <SectionLabel color={colors.sectionLabel}>APPEARANCE</SectionLabel>
        <View style={{ backgroundColor: colors.profileCard, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }}>
          <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>
              Dark mode
            </Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.cardBorder, true: colors.amber }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
              accessibilityLabel="Toggle dark mode"
            />
          </View>
        </View>
      </View>

      {/* Settings Row */}
      <View className="mx-6 mt-5">
        <Pressable
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: colors.profileCard, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.inkPrimary }}>
            Settings
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 18, color: colors.amber }}>
            ›
          </Text>
        </Pressable>
      </View>

      {/* Sign out */}
      <Pressable
        onPress={() => {
          Alert.alert('Sign out?', 'You can sign back in at any time.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign out',
              style: 'destructive',
              onPress: async () => {
                await signOutUser()
                router.replace('/welcome')
              },
            },
          ])
        }}
        className="mt-8 mb-2"
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text
          style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkSubtle, textAlign: 'center' }}
        >
          Sign out
        </Text>
      </Pressable>

      {/* Version */}
      <Text
        style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.inkSubtle, textAlign: 'center', marginTop: 4 }}
      >
        Soft Landing v1.5.0
      </Text>
    </ScrollView>
  )
}
