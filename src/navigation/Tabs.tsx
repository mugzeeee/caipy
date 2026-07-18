import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import type {
  BottomTabParamList,
  CharactersStackParamList,
  AssistantStackParamList,
  ImageStackParamList,
} from "./types";

// ── Per-tab native-stack navigators ───────────────────────────────────

const ChStack = createNativeStackNavigator<CharactersStackParamList>();
const AsStack = createNativeStackNavigator<AssistantStackParamList>();
const ImStack = createNativeStackNavigator<ImageStackParamList>();

// Characters tab
import { HomeScreen } from "@/screens/HomeScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { CharacterEditorScreen } from "@/screens/CharacterEditorScreen";
// Assistant tab
import { AssistantHomeScreen } from "@/screens/AssistantHomeScreen";
import { AssistantChatScreen } from "@/screens/AssistantChatScreen";
// Image tab
import { ImageStudioScreen } from "@/screens/ImageStudioScreen";
import { ImageDetailScreen } from "@/screens/ImageDetailScreen";
// Settings tab
import { SettingsScreen } from "@/screens/SettingsScreen";

// ── Reusable stack screen options factory ───────────────────────────

function stackScreenOptions(theme: ReturnType<typeof useTheme>) {
  return {
    headerStyle: { backgroundColor: theme.bgElevated },
    headerTintColor: theme.text,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: "800" as const },
    contentStyle: { backgroundColor: theme.bg },
  };
}

// ── Characters tab stack ─────────────────────────────────────────────

function CharactersTabStack() {
  const theme = useTheme();
  return (
    <ChStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ChStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <ChStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ headerBackTitle: "Back" }}
      />
      <ChStack.Screen name="CharacterEditor" component={CharacterEditorScreen} />
    </ChStack.Navigator>
  );
}

// ── Assistant tab stack ─────────────────────────────────────────────

function AssistantTabStack() {
  const theme = useTheme();
  return (
    <AsStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <AsStack.Screen
        name="AssistantHome"
        component={AssistantHomeScreen}
        options={{ headerShown: false }}
      />
      <AsStack.Screen
        name="AssistantChat"
        component={AssistantChatScreen}
        options={{ headerBackTitle: "Back" }}
      />
    </AsStack.Navigator>
  );
}

// ── Image tab stack ──────────────────────────────────────────────────

function ImageTabStack() {
  const theme = useTheme();
  return (
    <ImStack.Navigator screenOptions={stackScreenOptions(theme)}>
      <ImStack.Screen
        name="ImageStudio"
        component={ImageStudioScreen}
        options={{ headerShown: false }}
      />
      <ImStack.Screen
        name="ImageDetail"
        component={ImageDetailScreen}
        options={{ title: "Image" }}
      />
    </ImStack.Navigator>
  );
}

// ── Settings tab (single screen, no stack needed) ────────────────────

function SettingsTabScreen() {
  const theme = useTheme();
  return (
    <SettingsScreen />
  );
}

// ── Bottom tab navigator ─────────────────────────────────────────────

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="CharactersTab" component={CharactersTabStack} />
      <Tab.Screen name="AssistantTab" component={AssistantTabStack} />
      <Tab.Screen name="ImageTab" component={ImageTabStack} />
      <Tab.Screen name="SettingsTab" component={SettingsTabScreen} />
    </Tab.Navigator>
  );
}

// ── Custom tab bar with animated icons ──────────────────────────────

interface TabBarIconProps {
  focused: boolean;
  routeName: string;
  theme: ReturnType<typeof useTheme>;
}

function AnimatedTabIcon({ focused, routeName, theme }: TabBarIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.82);
  const glow = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scale.value = withTiming(focused ? 1 : 0.82, {
      duration: 250,
      easing: Easing.out(Easing.back(1)),
    });
    glow.value = withTiming(focused ? 1 : 0, { duration: 300 });
  }, [focused]);

  const iconColor = focused ? theme.primary : theme.textDim;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.4]),
    transform: [{ scale: scale.value }],
  }));

  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    CharactersTab: "chatbubbles",
    AssistantTab: "hardware-chip-outline",
    ImageTab: "image-outline",
    SettingsTab: "settings-outline",
  };

  const labelMap: Record<string, string> = {
    CharactersTab: "Characters",
    AssistantTab: "Assistant",
    ImageTab: "Images",
    SettingsTab: "Settings",
  };

  return (
    <Animated.View style={styles.iconWrap}>
      {focused && (
        <Animated.View
          style={[
            glowStyle,
            {
              position: "absolute",
              width: 40,
              height: 40,
              backgroundColor: theme.glow,
              top: -6,
              borderRadius: 20,
            },
          ]}
        />
      )}
      <Animated.View style={animStyle}>
        <Ionicons
          name={iconMap[routeName] ?? "ellipse-outline"}
          size={24}
          color={iconColor}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: iconColor },
            focused && { fontWeight: "700" },
          ]}
        >
          {labelMap[routeName] ?? routeName}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tabBar,
        { backgroundColor: theme.bgElevated, borderTopColor: theme.border },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() =>
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            }
            style={styles.tabItem}
          >
            <AnimatedTabIcon
              focused={isFocused}
              routeName={route.name}
              theme={theme}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 56,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
  },
});
