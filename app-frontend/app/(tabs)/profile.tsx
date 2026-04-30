import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator, Image } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSettings, getCheckIns, getSavedMessages } from '@/storage/storage'
import { getCurrentUser, signOutUser } from '@/services/auth'
import type { AppSettings, AuthUser, CheckInEvent, SavedMessage } from '@/types'

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

interface SectionLabelProps {
  children: string
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <Text
      style={{
        fontFamily: 'DMSans_500Medium',
        fontSize: 11,
        color: '#9C8B7E',
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
}

function InfoRow({ label, value, isFirst = false }: InfoRowProps) {
  return (
    <View
      className={isFirst ? '' : 'border-t border-border'}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#6B6B6B' }}>
        {label}
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#3D2F2A' }}>
        {value}
      </Text>
    </View>
  )
}

export default function ProfileScreen() {
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
        style={{ backgroundColor: '#FAF8F5' }}
      >
        <ActivityIndicator color="#C4956A" />
      </View>
    )
  }

  if (loadState === 'error' || !settings) {
    return (
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: '#FAF8F5' }}
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
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}>
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
      style={{ backgroundColor: '#FAF8F5' }}
      contentContainerStyle={{ paddingBottom: 48 }}
    >
      {/* Header */}
      <View className="px-6 pt-14 pb-2">
        <Text
          style={{ fontFamily: 'DMSans_500Medium', fontSize: 24, color: '#3D2F2A' }}
        >
          Profile
        </Text>
      </View>

      {/* Identity Card */}
      <View
        className="mx-6 mt-4 bg-surface rounded-2xl border border-border"
        style={{ padding: 20, flexDirection: 'row', alignItems: 'center' }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 18, color: '#3D2F2A' }}>
            {displayName}
          </Text>
          {user?.email ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: '#9A8F82',
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
        <SectionLabel>FAITH</SectionLabel>
        <View className="bg-surface rounded-2xl border border-border">
          <InfoRow label="Background" value={faithBackgroundLabel(settings.faithBackground)} isFirst />
          <InfoRow label="Seeking" value={primaryIntentLabel(settings.primaryIntent)} />
          <InfoRow label="Life Stage" value={lifeStageLabel(settings.lifeStage)} />
        </View>
      </View>

      {/* Stats Section */}
      <View className="mx-6 mt-5">
        <SectionLabel>STATS</SectionLabel>
        <View className="bg-surface rounded-2xl border border-border">
          <InfoRow label="Total check-ins" value={String(checkIns.length)} isFirst />
          <InfoRow label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} />
          <InfoRow label="Saved verses" value={String(savedMessages.length)} />
        </View>
      </View>

      {/* Subscription Section */}
      <View className="mx-6 mt-5">
        <SectionLabel>SUBSCRIPTION</SectionLabel>
        <View className="bg-surface rounded-2xl border border-border">
          <InfoRow label="Plan" value={isPremium ? 'Premium' : 'Free'} isFirst />
          {!isPremium && (
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <Pressable
                onPress={() => router.push('/paywall')}
                style={{
                  backgroundColor: '#C4956A',
                  borderRadius: 999,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                accessibilityRole="button"
                accessibilityLabel="Upgrade to premium"
              >
                <Text
                  style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#FFFFFF' }}
                >
                  Upgrade →
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Settings Row */}
      <View className="mx-6 mt-5">
        <Pressable
          onPress={() => router.push('/settings')}
          className="bg-surface rounded-2xl border border-border"
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#3D2F2A' }}>
            Settings
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 18, color: '#C4956A' }}>
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
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 14,
            color: '#C0A898',
            textAlign: 'center',
          }}
        >
          Sign out
        </Text>
      </Pressable>

      {/* Version */}
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: '#C4B59A',
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        Soft Landing v1.5.0
      </Text>
    </ScrollView>
  )
}
