import { View, Text, Pressable, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { getSavedMessages } from '@/storage/storage'
import type { SavedMessage, Message } from '@/types'
import catalog from '@/messages/catalog.json'

const messages = catalog as Message[]

function getVerse(messageId: string): { body: string; reference?: string } {
  const msg = messages.find((m) => m.id === messageId)
  return { body: msg?.body ?? '…', reference: msg?.reference }
}

export default function SessionSummaryScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>()
  const [saved, setSaved] = useState<SavedMessage[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!ids) {
      setLoaded(true)
      return
    }
    const idList = ids.split(',').filter(Boolean)
    getSavedMessages().then((all) => {
      setSaved(all.filter((m) => idList.includes(m.id)))
      setLoaded(true)
    })
  }, [ids])

  useEffect(() => {
    if (loaded && saved.length === 0) {
      router.replace('/(tabs)')
    }
  }, [loaded, saved])

  if (!loaded || saved.length === 0) return null

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}
      >
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 22,
            color: '#3D2F2A',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          Today's verses
        </Text>

        {saved.map((item) => {
          const { body, reference } = getVerse(item.messageId)
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {reference ? (
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: '#C4956A',
                    letterSpacing: 0.3,
                    marginBottom: 6,
                  }}
                >
                  {reference}
                </Text>
              ) : null}

              <Text
                style={{
                  fontFamily: 'Lora_400Regular',
                  fontSize: 15,
                  color: '#3D2F2A',
                  lineHeight: 24,
                  marginBottom: 16,
                }}
                numberOfLines={3}
              >
                {body}
              </Text>

              <View style={{ alignItems: 'flex-end' }}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/check-in/letter-compose',
                      params: { savedMessageId: item.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Write a letter for this verse"
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#B5845A' : '#C4956A',
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                    borderRadius: 20,
                  })}
                >
                  <Text
                    style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FFFFFF' }}
                  >
                    Write a letter →
                  </Text>
                </Pressable>
              </View>
            </View>
          )
        })}

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          accessibilityRole="button"
          accessibilityLabel="Done, go home"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, alignItems: 'center', marginTop: 8 })}
        >
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#A09080' }}
          >
            Done — go home
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
