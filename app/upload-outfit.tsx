import { PageHeader } from "@/components/PageHeader";
import {
  atelier,
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { useOutfitUpload } from "@/context/OutfitUploadContext";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function UploadOutfitScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startUpload, uploadingOutfit, uploadedItem } = useOutfitUpload();
  const wasUploadingRef = useRef(false);

  useEffect(() => {
    if (uploadingOutfit) wasUploadingRef.current = true;
    if (wasUploadingRef.current && !uploadingOutfit && uploadedItem) {
      wasUploadingRef.current = false;
      router.replace("/(tabs)");
    }
  }, [uploadingOutfit, uploadedItem, router]);

  const onBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleChoosePhoto = useCallback(() => {
    startUpload();
  }, [startUpload]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader onBack={onBack} title="Upload design" />
      <View style={styles.content}>
        <Text style={styles.title}>Add your outfit design</Text>
        <Text style={styles.subtitle}>
          Choose a photo from your library. We’ll use it to create a custom
          outfit you can add to cart and order.
        </Text>
        <Pressable
          onPress={handleChoosePhoto}
          disabled={uploadingOutfit}
          style={({ pressed }) => [
            styles.chooseButton,
            pressed && !uploadingOutfit && styles.chooseButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Choose photo from library"
        >
          {uploadingOutfit ? (
            <ActivityIndicator size="large" color={colors.primary[900]} />
          ) : (
            <>
              <View style={styles.chooseIconWrap}>
                <FontAwesome
                  name="image"
                  size={32}
                  color={colors.primary[900]}
                />
              </View>
              <Text style={styles.chooseLabel}>Choose photo</Text>
              <Text style={styles.chooseHint}>
                JPG, PNG, HEIC or WebP • up to 10MB
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.semiBold,
    color: atelier.cta,
    marginBottom: spacing[3],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    lineHeight: 22,
    marginBottom: spacing[10],
  },
  chooseButton: {
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    borderRadius: radius.panel,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  chooseButtonPressed: {
    opacity: 0.9,
  },
  chooseIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  chooseLabel: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semiBold,
    color: atelier.cta,
    marginBottom: spacing[2],
  },
  chooseHint: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
});
