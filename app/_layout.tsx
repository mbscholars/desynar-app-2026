import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { MeasurementProfilesProvider } from "@/context/MeasurementProfilesContext";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Metropolis: brand font per docs/MetropolisFont.md; weights from assets/fonts/metropolis/.
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Metropolis: require("../assets/fonts/metropolis/Metropolis-Regular.otf"),
    MetropolisMedium: require("../assets/fonts/metropolis/Metropolis-Medium.otf"),
    MetropolisSemiBold: require("../assets/fonts/metropolis/Metropolis-SemiBold.otf"),
    MetropolisBold: require("../assets/fonts/metropolis/Metropolis-Bold.otf"),
    MetropolisLight: require("../assets/fonts/metropolis/Metropolis-Light.otf"),
    MetropolisExtraBold: require("../assets/fonts/metropolis/Metropolis-ExtraBold.otf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <MeasurementProfilesProvider>
          <CartProvider>
            <BottomSheetModalProvider>
              <RootLayoutNav />
            </BottomSheetModalProvider>
          </CartProvider>
        </MeasurementProfilesProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="order/[reference]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="measurements" />
        <Stack.Screen name="review" />
        <Stack.Screen name="search" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
