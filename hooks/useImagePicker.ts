import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";
import { Alert, Platform } from "react-native";

const MEDIA_TYPES = ["images"] as const;

/**
 * Presents "Take photo" / "Choose from library" / "Cancel", then launches
 * camera or library and returns the selected image URI, or null if cancelled.
 */
export function useImagePicker() {
  const pickImage = useCallback(async (): Promise<string | null> => {
    const choice = await new Promise<"camera" | "library" | "cancel">((resolve) => {
      Alert.alert(
        "Add photo",
        "Take a new photo or choose from your library.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve("cancel") },
          { text: "Take photo", onPress: () => resolve("camera") },
          { text: "Choose from library", onPress: () => resolve("library") },
        ],
        { cancelable: true }
      );
    });

    if (choice === "cancel") return null;

    if (choice === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera access",
          "Camera permission is required to take a photo."
        );
        return null;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: MEDIA_TYPES,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return null;
      return result.assets[0].uri;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo library access",
        "Photo library permission is required to choose a photo."
      );
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: MEDIA_TYPES,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
  }, []);

  return { pickImage };
}
