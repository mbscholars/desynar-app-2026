import { AddActionPopover } from "@/components/AddActionPopover";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { colors, typography } from "@/constants/theme";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

const TAB_BAR_HEIGHT = 80;
const ADD_BUTTON_SIZE = 56;

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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
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

  return (
    <>
      <AddActionPopover
        visible={addPopoverOpen}
        onClose={closeAddPopover}
        onUploadDesign={() => {}}
        onManageMeasurements={handleManageMeasurements}
        onCreateWithAi={() => {}}
      />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: themeColors.tabIconDefault,
          tabBarStyle: {
            backgroundColor: colors.gray[900],
            borderTopColor: "transparent",
            height: TAB_BAR_HEIGHT,
          },
          tabBarLabelStyle: {
            fontSize: typography.fontSize.xs,
            fontFamily: typography.fontFamily.sans,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: "Orders",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="shopping-cart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "",
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={styles.addWrap}>
                <AddTabButton
                  isPopoverOpen={addPopoverOpen}
                  onToggle={toggleAddPopover}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color }) => (
              <TabBarIcon name="comment" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
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
