import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { useTheme } from '@/theme'

function TabIcon({ symbol, focused, color }: { symbol: string; focused: boolean; color: string }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4, color }}>
      {symbol}
    </Text>
  )
}

export default function TabLayout() {
  const { colors } = useTheme()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.tabIconInactive,
        tabBarLabelStyle: {
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="✦" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'The Path',
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="◇" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="say"
        options={{
          title: 'Say',
          tabBarIcon: ({ focused, color }) => (
            <Text
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 22,
                opacity: focused ? 1 : 0.4,
                color,
              }}
            >
              {'"'}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIcon symbol="○" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  )
}
