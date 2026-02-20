import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/**
 * Root gate: on app open, check auth via /session.
 * - If loading: show spinner.
 * - Once loaded: always go to home (tabs). Login is shown as a full-screen modal on home when not authenticated.
 */
export default function IndexScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      router.replace("/(tabs)");
    }
  }, [isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray[50],
  },
});
