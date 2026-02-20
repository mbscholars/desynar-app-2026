import { UserLogin } from "@/components/UserLogin";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

/**
 * Login route — uses the shared UserLogin component (atelier design).
 * Navigate here from account/logout or deep links. Success or close (guest) goes to home.
 */
export default function LoginScreen() {
  const router = useRouter();
  const { setAuthenticated } = useAuth();

  const handleClose = useCallback(() => {
    setAuthenticated(true);
    router.replace("/(tabs)");
  }, [router, setAuthenticated]);

  const handleSuccess = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  return (
    <View style={styles.container}>
      <UserLogin onClose={handleClose} onSuccess={handleSuccess} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
