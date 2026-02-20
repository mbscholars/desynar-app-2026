import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { atelier, radius, spacing, typography } from "@/constants/theme";
import { useMeasurementProfiles } from "@/context/MeasurementProfilesContext";
import { useImagePicker } from "@/hooks/useImagePicker";
import {
    RELATIONSHIP_OPTIONS,
    type GenderValue,
    type RelationshipValue,
} from "@/types/measurement";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const specimenImages = {
  female: {
    front: require("@/assets/images/female-front-view.webp"),
    side: require("@/assets/images/female-side-view.webp"),
  },
  male: {
    front: require("@/assets/images/male-front-view.webp"),
    side: require("@/assets/images/male-side-view.webp"),
  },
};

export default function EditMeasurementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getProfile, updateProfile } = useMeasurementProfiles();
  const profile = id ? getProfile(id) : null;

  const [name, setName] = useState("");
  const [gender, setGender] = useState<GenderValue | "">("");
  const [relationship, setRelationship] = useState<RelationshipValue | "">("");
  const [relationshipCustom, setRelationshipCustom] = useState("");
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [sideImageUri, setSideImageUri] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const { pickImage } = useImagePicker();
  const specimen =
    gender === "male" ? specimenImages.male : specimenImages.female;

  const handleFrontPhoto = useCallback(async () => {
    if (frontImageUri) {
      Alert.alert("Front view photo", "Replace or remove this photo?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setFrontImageUri(null),
        },
        {
          text: "Replace",
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setFrontImageUri(uri);
          },
        },
      ]);
    } else {
      const uri = await pickImage();
      if (uri) setFrontImageUri(uri);
    }
  }, [frontImageUri, pickImage]);

  const handleSidePhoto = useCallback(async () => {
    if (sideImageUri) {
      Alert.alert("Side view photo", "Replace or remove this photo?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setSideImageUri(null),
        },
        {
          text: "Replace",
          onPress: async () => {
            const uri = await pickImage();
            if (uri) setSideImageUri(uri);
          },
        },
      ]);
    } else {
      const uri = await pickImage();
      if (uri) setSideImageUri(uri);
    }
  }, [sideImageUri, pickImage]);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setGender(profile.gender);
      setRelationship(
        RELATIONSHIP_OPTIONS.some((o) => o.value === profile.relationship)
          ? (profile.relationship as RelationshipValue)
          : profile.relationship === "other" || !profile.relationship
            ? "other"
            : (profile.relationship as RelationshipValue),
      );
      setRelationshipCustom(profile.relationshipCustom ?? "");
      setFrontImageUri(profile.frontImageUri);
      setSideImageUri(profile.sideImageUri);
      setHeightCm(profile.heightCm != null ? String(profile.heightCm) : "");
      setWeightKg(profile.weightKg != null ? String(profile.weightKg) : "");
    }
  }, [profile]);

  const relationshipLabel =
    relationship === "other" && relationshipCustom.trim()
      ? relationshipCustom.trim()
      : (RELATIONSHIP_OPTIONS.find((o) => o.value === relationship)?.label ??
        "Select relationship");

  const heightNum = heightCm.trim() ? parseFloat(heightCm) : null;
  const weightNum = weightKg.trim() ? parseFloat(weightKg) : null;

  const handleSave = useCallback(() => {
    if (!id || !profile) return;
    updateProfile(id, {
      name: name.trim(),
      gender: gender as GenderValue,
      relationship,
      relationshipCustom:
        relationship === "other"
          ? relationshipCustom.trim() || undefined
          : undefined,
      frontImageUri: frontImageUri || null,
      sideImageUri: sideImageUri || null,
      heightCm: heightNum,
      weightKg: weightNum,
    });
    router.back();
  }, [
    id,
    profile,
    name,
    gender,
    relationship,
    relationshipCustom,
    frontImageUri,
    sideImageUri,
    heightNum,
    weightNum,
    updateProfile,
    router,
  ]);

  if (!id || !profile) {
    return (
      <View
        style={[styles.container, styles.centered, { paddingTop: insets.top }]}
      >
        <Text style={styles.notFound}>Profile not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to list</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader onBack={() => router.back()} title="Edit profile" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + spacing[8],
            paddingHorizontal: spacing[6],
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Profile details</Text>
        <Input
          label="Profile name"
          placeholder="e.g. John’s measurements"
          value={name}
          onChangeText={setName}
          variant="dark"
          containerStyle={styles.inputBlock}
        />
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderRow}>
          <Pressable
            onPress={() => setGender("male")}
            style={({ pressed }) => [
              styles.genderBtn,
              gender === "male" && styles.genderBtnSelected,
              pressed && styles.genderBtnPressed,
            ]}
          >
            <FontAwesome
              name="mars"
              size={24}
              color={gender === "male" ? atelier.ctaText : atelier.muted}
            />
            <Text
              style={[
                styles.genderBtnText,
                gender === "male" && styles.genderBtnTextSelected,
              ]}
            >
              Male
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setGender("female")}
            style={({ pressed }) => [
              styles.genderBtn,
              gender === "female" && styles.genderBtnSelected,
              pressed && styles.genderBtnPressed,
            ]}
          >
            <FontAwesome
              name="venus"
              size={24}
              color={gender === "female" ? atelier.ctaText : atelier.muted}
            />
            <Text
              style={[
                styles.genderBtnText,
                gender === "female" && styles.genderBtnTextSelected,
              ]}
            >
              Female
            </Text>
          </Pressable>
        </View>
        <Text style={styles.label}>Relationship</Text>
        <Pressable
          onPress={() => setShowRelationshipPicker(true)}
          style={styles.pickerTrigger}
        >
          <Text style={styles.pickerTriggerText}>{relationshipLabel}</Text>
          <FontAwesome name="chevron-down" size={14} color={atelier.muted} />
        </Pressable>
        {relationship === "other" && (
          <Input
            placeholder="Custom relationship"
            value={relationshipCustom}
            onChangeText={setRelationshipCustom}
            variant="dark"
            containerStyle={styles.inputBlock}
          />
        )}

        <Text style={styles.screenTitle}>Body reference photos</Text>
        <Text style={styles.screenSubtitle}>
          Front and side views. Tap to take a photo or choose from library.
        </Text>
        <View style={styles.sampleRow}>
          <View style={styles.sampleBox}>
            <Image
              source={specimen.front}
              style={styles.specimenImage}
              resizeMode="contain"
            />
            <Text style={styles.sampleLabel}>Front view guide</Text>
          </View>
          <View style={styles.sampleBox}>
            <Image
              source={specimen.side}
              style={styles.specimenImage}
              resizeMode="contain"
            />
            <Text style={styles.sampleLabel}>Side view guide</Text>
          </View>
        </View>
        <View style={styles.uploadRow}>
          <Pressable
            onPress={handleFrontPhoto}
            style={({ pressed }) => [
              styles.uploadBox,
              frontImageUri && styles.uploadBoxFilled,
              pressed && styles.uploadBoxPressed,
            ]}
          >
            {frontImageUri ? (
              <Image
                source={{ uri: frontImageUri }}
                style={styles.uploadThumb}
              />
            ) : (
              <>
                <FontAwesome name="camera" size={28} color={atelier.muted} />
                <Text style={styles.uploadLabel}>Front view</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleSidePhoto}
            style={({ pressed }) => [
              styles.uploadBox,
              sideImageUri && styles.uploadBoxFilled,
              pressed && styles.uploadBoxPressed,
            ]}
          >
            {sideImageUri ? (
              <Image
                source={{ uri: sideImageUri }}
                style={styles.uploadThumb}
              />
            ) : (
              <>
                <FontAwesome name="camera" size={28} color={atelier.muted} />
                <Text style={styles.uploadLabel}>Side view</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text style={styles.screenTitle}>Height & weight</Text>
        <Input
          label="Height (cm)"
          placeholder="e.g. 175"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          variant="dark"
          containerStyle={styles.inputBlock}
        />
        <Input
          label="Weight (kg)"
          placeholder="e.g. 70"
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="decimal-pad"
          variant="dark"
          containerStyle={styles.inputBlock}
        />

        <View style={styles.footer}>
          <Button
            title="Save changes"
            onPress={handleSave}
            variant="primary"
            fullWidth
            style={styles.primaryBtn}
            textStyle={{ color: atelier.ctaText }}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showRelationshipPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRelationshipPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowRelationshipPicker(false)}
        />
        <View
          style={[
            styles.pickerModal,
            { paddingBottom: insets.bottom + spacing[4] },
          ]}
        >
          <Text style={styles.pickerModalTitle}>Relationship</Text>
          <ScrollView style={styles.pickerList}>
            {RELATIONSHIP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setRelationship(opt.value);
                  setShowRelationshipPicker(false);
                }}
                style={({ pressed }) => [
                  styles.pickerOption,
                  pressed && styles.pickerOptionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    relationship === opt.value &&
                      styles.pickerOptionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
                {relationship === opt.value && (
                  <FontAwesome name="check" size={16} color={atelier.accent} />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: atelier.background },
  centered: { justifyContent: "center", alignItems: "center" },
  notFound: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  backLink: { marginTop: spacing[4] },
  backLinkText: {
    fontSize: typography.fontSize.base,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing[4] },
  screenTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  screenSubtitle: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[4],
  },
  inputBlock: { marginBottom: spacing[4] },
  sampleRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  sampleBox: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    backgroundColor: atelier.panel,
    overflow: "hidden",
  },
  specimenImage: {
    flex: 1,
    width: "100%",
  },
  sampleLabel: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  genderBtn: {
    flex: 1,
    paddingVertical: spacing[5],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  genderBtnSelected: {
    borderColor: atelier.accent,
    backgroundColor: "rgba(198, 167, 94, 0.12)",
  },
  genderBtnPressed: { opacity: 0.9 },
  genderBtnText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  genderBtnTextSelected: { color: atelier.cta },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    marginBottom: spacing[4],
  },
  pickerTriggerText: {
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  uploadRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  uploadBox: {
    flex: 1,
    aspectRatio: 0.75,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: atelier.divider,
    borderStyle: "dashed",
    backgroundColor: atelier.panel,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  uploadBoxFilled: {
    borderStyle: "solid",
    borderColor: atelier.accent,
  },
  uploadBoxPressed: { opacity: 0.9 },
  uploadThumb: {
    width: "100%",
    height: "100%",
    borderRadius: radius.lg - 2,
  },
  uploadLabel: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  footer: { marginTop: spacing[8] },
  primaryBtn: { backgroundColor: atelier.accent },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerModal: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: atelier.panel,
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: atelier.panelBorder,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    maxHeight: "70%",
  },
  pickerModalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[4],
  },
  pickerList: { maxHeight: 320 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  pickerOptionPressed: { opacity: 0.8 },
  pickerOptionText: {
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  pickerOptionTextSelected: { color: atelier.accent },
});
