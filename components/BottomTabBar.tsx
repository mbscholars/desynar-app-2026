import { AddActionPopover } from "@/components/AddActionPopover";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { colors, typography } from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TAB_BAR_HEIGHT = 80;
const ADD_BUTTON_SIZE = 56;

export type TabRoute = "home" | "orders" | "inbox" | "account";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: 2 }} {...props} />;
}

function AddTabButton({
  isPopoverOpen,
  onToggle,
}: {
  isPopoverOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.addButton,
        pressed && styles.addButtonPressed,
      ]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityRole="button"
      accessibilityLabel={isPopoverOpen ? "Close add menu" : "Open add menu"}
      accessibilityState={{ expanded: isPopoverOpen }}
    >
      <FontAwesome
        name={isPopoverOpen ? "times" : "plus"}
        size={28}
        color={colors.primary[900]}
      />
    </Pressable>
  );
}

export type BottomTabBarProps = {
  /** Which tab to show as active; omit or null when outside tabs (e.g. search). */
  activeTab?: TabRoute | null;
};

export function BottomTabBar({ activeTab = null }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const toggleAddPopover = useCallback(() => {
    setAddPopoverOpen((v) => !v);
  }, []);

  const closeAddPopover = useCallback(() => {
    setAddPopoverOpen(false);
  }, []);

  const handleManageMeasurements = useCallback(() => {
    setAddPopoverOpen(false);
    router.push("/measurements");
  }, [router]);

  const handleTabPress = useCallback(
    (path: string) => {
      router.push(path as any);
    },
    [router],
  );

  const activeColor = "#FFFFFF";
  const inactiveColor = themeColors.tabIconDefault;

  return (
    <>
      <AddActionPopover
        visible={addPopoverOpen}
        onClose={closeAddPopover}
        onUploadDesign={() => {}}
        onManageMeasurements={handleManageMeasurements}
        onCreateWithAi={() => {}}
      />
      <View
        style={[
          styles.container,
          {
            height: TAB_BAR_HEIGHT + Math.max(insets.bottom, 0),
            paddingBottom: Math.max(insets.bottom, 0),
          },
        ]}
      >
        <View style={styles.inner}>
          {/* Home */}
          <Pressable
            onPress={() => handleTabPress("/(tabs)")}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityLabel="Home"
            accessibilityState={{ selected: activeTab === "home" }}
          >
            <TabBarIcon
              name="home"
              color={activeTab === "home" ? activeColor : inactiveColor}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === "home" ? activeColor : inactiveColor },
              ]}
            >
              Home
            </Text>
          </Pressable>

          {/* Orders */}
          <Pressable
            onPress={() => handleTabPress("/(tabs)/orders")}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityLabel="Orders"
            accessibilityState={{ selected: activeTab === "orders" }}
          >
            <TabBarIcon
              name="shopping-cart"
              color={activeTab === "orders" ? activeColor : inactiveColor}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === "orders" ? activeColor : inactiveColor },
              ]}
            >
              Orders
            </Text>
          </Pressable>

          {/* Add (center) */}
          <View style={styles.addWrap}>
            <AddTabButton
              isPopoverOpen={addPopoverOpen}
              onToggle={toggleAddPopover}
            />
          </View>

          {/* Inbox */}
          <Pressable
            onPress={() => handleTabPress("/(tabs)/inbox")}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityLabel="Inbox"
            accessibilityState={{ selected: activeTab === "inbox" }}
          >
            <TabBarIcon
              name="comment"
              color={activeTab === "inbox" ? activeColor : inactiveColor}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === "inbox" ? activeColor : inactiveColor },
              ]}
            >
              Inbox
            </Text>
          </Pressable>

          {/* Account */}
          <Pressable
            onPress={() => handleTabPress("/(tabs)/account")}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityLabel="Account"
            accessibilityState={{ selected: activeTab === "account" }}
          >
            <TabBarIcon
              name="user"
              color={activeTab === "account" ? activeColor : inactiveColor}
            />
            <Text
              style={[
                styles.label,
                { color: activeTab === "account" ? activeColor : inactiveColor },
              ]}
            >
              Account
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: TAB_BAR_HEIGHT,
    backgroundColor: colors.gray[900],
    borderTopWidth: 0,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TAB_BAR_HEIGHT,
    paddingTop: 8,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.sans,
  },
  addWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TAB_BAR_HEIGHT,
  },
  addButton: {
    width: ADD_BUTTON_SIZE,
    height: ADD_BUTTON_SIZE,
    borderRadius: ADD_BUTTON_SIZE / 2,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 6 },
    }),
  },
  addButtonPressed: { opacity: 0.9 },
});
