import { View, Text, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import type { PurchasesPackage } from 'react-native-purchases'
import { useTheme } from '@/theme'
import { getOfferingPackages, purchase, restorePurchases } from '@/services/purchases'

const FEATURES = [
  'Unlimited daily letters',
  'All four voices — Kind, Still, Steady, Wise',
  'More Say messages each day',
  'Gentle reach-outs when it has been a while',
]

function packageLabel(p: PurchasesPackage): string {
  const t = String(p.packageType)
  if (t === 'ANNUAL') return 'Yearly'
  if (t === 'MONTHLY') return 'Monthly'
  if (t === 'WEEKLY') return 'Weekly'
  return p.product.title || 'Premium'
}

export default function PaywallScreen() {
  const { colors } = useTheme()
  const [packages, setPackages] = useState<PurchasesPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getOfferingPackages()
      .then((pkgs) => setPackages(pkgs))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleBuy(p: PurchasesPackage) {
    if (busy) return
    setBusy(true)
    const ok = await purchase(p)
    setBusy(false)
    if (ok) {
      Alert.alert('Welcome to Premium', 'Everything is unlocked. Thank you for supporting Soft Landing.')
      router.replace('/(tabs)')
    }
  }

  async function handleRestore() {
    if (busy) return
    setBusy(true)
    const ok = await restorePurchases()
    setBusy(false)
    Alert.alert(
      ok ? 'Purchases restored' : 'Nothing to restore',
      ok ? 'Your Premium is active.' : 'No active subscription was found for this account.',
    )
    if (ok) router.replace('/(tabs)')
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 }}>
        <Text style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 28, color: colors.inkPrimary, textAlign: 'center', marginBottom: 10 }}>
          Soft Landing Premium
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted, textAlign: 'center', marginBottom: 26, lineHeight: 21 }}>
          More room to land — whenever you need it.
        </Text>

        <View style={{ gap: 12, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ color: colors.amber, fontSize: 14, marginTop: 1 }}>✦</Text>
              <Text style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkPrimary, lineHeight: 20 }}>{f}</Text>
            </View>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginVertical: 20 }} />
        ) : packages.length > 0 ? (
          packages.map((p, i) => (
            <Pressable
              key={p.identifier}
              onPress={() => handleBuy(p)}
              disabled={busy}
              style={{
                borderRadius: 16,
                paddingVertical: 15,
                alignItems: 'center',
                marginBottom: 12,
                backgroundColor: i === 0 ? colors.amber : 'transparent',
                borderWidth: i === 0 ? 0 : 1,
                borderColor: colors.amber,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: i === 0 ? '#FFFFFF' : colors.amber }}>
                {packageLabel(p)} · {p.product.priceString}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.inkMuted, textAlign: 'center', marginBottom: 12 }}>
            Subscriptions are being set up. Check back soon.
          </Text>
        )}

        {busy ? <ActivityIndicator color={colors.amber} style={{ marginBottom: 8 }} /> : null}

        <Pressable onPress={handleRestore} disabled={busy} style={{ alignItems: 'center', marginTop: 8, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.amber }}>Restore purchases</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(tabs)')} style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.inkMuted }}>Not now</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}
