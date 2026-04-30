import { View, Text } from 'react-native'

export default function WidgetsTabPlaceholder() {
  // Placeholder only — full widget gallery lives at app/widgets/index.tsx.
  // No data calls or navigation by design (loading/error/empty states are not
  // applicable to a static placeholder; intentionally omitted).
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: '#FAF8F5' }}
    >
      <Text style={{ fontSize: 40, color: '#C4956A', marginBottom: 16 }}>⊞</Text>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 22,
          color: '#3D2F2A',
          marginBottom: 10,
        }}
      >
        Widgets
      </Text>
      <Text
        style={{
          fontFamily: 'Lora_400Regular_Italic',
          fontSize: 15,
          color: '#9A8F82',
          textAlign: 'center',
          maxWidth: 260,
          lineHeight: 22,
        }}
      >
        Coming soon — your Soft Landing widgets will live here.
      </Text>
    </View>
  )
}
