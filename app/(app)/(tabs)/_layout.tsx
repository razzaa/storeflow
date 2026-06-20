import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Package, FileText, BarChart2, Settings } from 'lucide-react-native';
import { useWidgetStore } from '../../../src/stores/widgetStore';
import { LT, DT } from '../../../src/theme/design';
import { useT } from '../../../src/i18n';
import { useLangStore } from '../../../src/stores/langStore';

function TabIcon({ Icon, color, focused }: { Icon: any; color: string; focused: boolean }) {
  const T = useWidgetStore((s) => s.isDark) ? DT : LT;
  return (
    <View style={{
      width: 40, height: 28, borderRadius: 8,
      backgroundColor: focused ? T.blueL : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={20} color={color} strokeWidth={focused ? 2 : 1.75} />
    </View>
  );
}

export default function TabsLayout() {
  const isDark = useWidgetStore((s) => s.isDark);
  const T = isDark ? DT : LT;
  const t = useT();
  const isUrdu = useLangStore((s) => s.isUrdu);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.blue,
        tabBarInactiveTintColor: T.t3,
        tabBarStyle: {
          backgroundColor: T.surface,
          borderTopColor: T.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 4,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '400' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: isUrdu ? 'ہوم' : 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t.products.products,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Package} color={color} focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: t.bills.bills,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={FileText} color={color} focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.analytics.analytics,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={BarChart2} color={color} focused={focused} />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings.settings,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Settings} color={color} focused={focused} />
          ),
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
