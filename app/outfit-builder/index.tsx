import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import type { LookRecipe, OutfitSectionKey } from "@/types/outfitRecipe";
import { createDefaultLookRecipe } from "@/types/outfitRecipe";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import { spacing, typography } from "@/constants/theme";
import { OutfitContainerCard } from "@/components/outfit-builder/OutfitContainerCard";
import { AddToOutfitAccordion } from "@/components/outfit-builder/AddToOutfitAccordion";
import { EditorPanel } from "@/components/outfit-builder/EditorPanel";
import {
  loadOrCreateDraft,
  saveOutfitDraftLocal,
  loadVisibleOptionals,
  saveVisibleOptionals,
  type VisibleOptionalSection,
} from "@/services/outfitBuilderStorage";
import {
  saveOutfitDraft as saveDraftApi,
  submitOutfitGenerate,
  pollOutfitJob,
  buildOutfitGeneratePayload,
} from "@/services/api/outfitBuilder";

const BREAKPOINT_PANEL = 600;

/** Primary sections: always shown as containers (Model, Top, Bottom, Shoes). */
const PRIMARY_SECTIONS: OutfitSectionKey[] = ["model", "top", "bottom", "shoes"];

/** Optional sections: added via plus. Map to recipe key and display label. */
const OPTIONAL_SECTION_CONFIG: Record<
  VisibleOptionalSection,
  { key: OutfitSectionKey; label: string }
> = {
  background: { key: "background", label: "Background" },
  head: { key: "head", label: "Accessories" },
};

export default function OutfitBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winWidth } = useWindowDimensions();
  const isWide = winWidth >= BREAKPOINT_PANEL;

  const [recipe, setRecipe] = useState<LookRecipe | null>(null);
  const [visibleOptionals, setVisibleOptionals] = useState<VisibleOptionalSection[]>([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState<OutfitSectionKey | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<string | null>(null);

  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const snapPoints = React.useMemo(() => ["60%", "85%"], []);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadOrCreateDraft(), loadVisibleOptionals()]).then(
      ([draft, optionals]) => {
        if (mounted) {
          setRecipe(draft);
          setVisibleOptionals(optionals);
        }
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const updateSection = useCallback(
    (section: OutfitSectionKey, update: Partial<LookRecipe["sections"][OutfitSectionKey]>) => {
      setRecipe((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: {
            ...prev.sections,
            [section]: { ...prev.sections[section], ...update },
          },
        };
      });
    },
    []
  );

  const openEditor = useCallback(
    (section: OutfitSectionKey) => {
      setSelectedSection(section);
      setEditorOpen(true);
      if (!isWide) {
        bottomSheetRef.current?.present();
      }
    },
    [isWide]
  );

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setSelectedSection(null);
    if (!isWide) {
      bottomSheetRef.current?.dismiss();
    }
  }, [isWide]);

  const handleApply = useCallback(() => {
    closeEditor();
  }, [closeEditor]);

  const resetSection = useCallback(() => {
    if (!recipe || !selectedSection) return;
    const defaults = createDefaultLookRecipe(recipe.gender);
    updateSection(selectedSection, defaults.sections[selectedSection]);
  }, [recipe, selectedSection, updateSection]);

  const addOptional = useCallback(
    (opt: VisibleOptionalSection) => {
      if (visibleOptionals.includes(opt)) {
        openEditor(OPTIONAL_SECTION_CONFIG[opt].key);
        return;
      }
      setVisibleOptionals((prev) => {
        const next = [...prev, opt];
        saveVisibleOptionals(next).catch(() => {});
        return next;
      });
      openEditor(OPTIONAL_SECTION_CONFIG[opt].key);
    },
    [visibleOptionals, openEditor]
  );

  const availableOptionalOptions = React.useMemo(
    () =>
      (["background", "head"] as VisibleOptionalSection[]).filter(
        (o) => !visibleOptionals.includes(o)
      ),
    [visibleOptionals]
  );

  const showAddMenu = useCallback(() => {
    if (availableOptionalOptions.length === 0) {
      Alert.alert(
        "All added",
        "Background and Accessories are already in your outfit. Tap a container to edit."
      );
      return;
    }
    setAddModalVisible(true);
  }, [availableOptionalOptions.length]);

  const handleSaveDraft = useCallback(async () => {
    if (!recipe) return;
    setSaving(true);
    try {
      await saveOutfitDraftLocal(recipe);
      await saveVisibleOptionals(visibleOptionals);
      await saveDraftApi(recipe, null);
      Alert.alert("Saved", "Draft saved.");
    } catch {
      Alert.alert("Error", "Could not save draft.");
    } finally {
      setSaving(false);
    }
  }, [recipe, visibleOptionals]);

  const handleGenderChange = useCallback((newGender: "male" | "female") => {
    if (!recipe) return;
    if (recipe.gender === newGender) return;
    Alert.alert(
      "Switch gender",
      "Switching gender will reset avatar fit. Keep outfit details?",
      [
        {
          text: "Reset all",
          style: "destructive",
          onPress: () => setRecipe(createDefaultLookRecipe(newGender)),
        },
        {
          text: "Keep details",
          onPress: () =>
            setRecipe((prev) => (prev ? { ...prev, gender: newGender } : prev)),
        },
      ],
      { cancelable: true }
    );
  }, [recipe]);

  const hasModelType = Boolean(recipe?.sections?.model?.presets?.type?.trim());
  const topPresets = recipe?.sections?.top?.presets;
  const hasTop =
    Boolean(recipe?.sections?.top?.prompt?.trim()) ||
    Boolean(recipe?.sections?.top?.imageRef) ||
    Boolean(topPresets?.type?.trim()) ||
    Boolean(topPresets?.color?.trim()) ||
    Boolean(topPresets?.fit?.trim()) ||
    Boolean(topPresets?.fabric?.trim()) ||
    Boolean(topPresets?.sleeve?.trim());
  const shoesPresets = recipe?.sections?.shoes?.presets;
  const hasShoes =
    Boolean(recipe?.sections?.shoes?.prompt?.trim()) ||
    Boolean(shoesPresets?.type?.trim()) ||
    Boolean(shoesPresets?.color?.trim()) ||
    Boolean(shoesPresets?.material?.trim()) ||
    Boolean(shoesPresets?.detail?.trim());
  const canGenerate = Boolean(recipe && hasModelType && hasTop && hasShoes);

  const handleGenerate = useCallback(async () => {
    if (!recipe || !canGenerate || generating) return;
    setGenerating(true);
    setGenerateStatus("Preparing outfit…");
    try {
      const payload = buildOutfitGeneratePayload(recipe);
      const { success, jobId, error } = await submitOutfitGenerate(payload);
      if (!success || !jobId) {
        setGenerateStatus(null);
        Alert.alert("Generation failed", error ?? "Could not start.");
        return;
      }
      setGenerateStatus("Preparing outfit…");
      const result = await pollOutfitJob(jobId, (status) => {
        setGenerateStatus(
          status === "processing" ? "Preparing outfit…" : status
        );
      });
      setGenerateStatus(null);
      if (result.success && result.imageUrls?.length) {
        router.replace({
          pathname: "/outfit-builder/result",
          params: {
            imageUrls: JSON.stringify(result.imageUrls),
            jobId: jobId,
          },
        });
      } else if (result.success) {
        Alert.alert("Done", "Outfit generated. No images returned.");
      } else {
        Alert.alert("Generation failed", result.error ?? "Something went wrong.");
      }
    } catch (e) {
      setGenerateStatus(null);
      Alert.alert("Error", (e as Error)?.message ?? "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }, [recipe, canGenerate, generating, router]);

  const handleResetAll = useCallback(() => {
    setRecipe(createDefaultLookRecipe(recipe?.gender ?? "female"));
    setVisibleOptionals([]);
    saveVisibleOptionals([]).catch(() => {});
    setSelectedSection(null);
    setEditorOpen(false);
    bottomSheetRef.current?.dismiss();
  }, [recipe?.gender]);

  if (!recipe) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={outfitBuilderColors.accent} />
      </View>
    );
  }

  const orderedSections: OutfitSectionKey[] = [
    ...PRIMARY_SECTIONS,
    ...visibleOptionals.map((o) => OPTIONAL_SECTION_CONFIG[o].key),
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={12}
        >
          <FontAwesome
            name="chevron-left"
            size={20}
            color={outfitBuilderColors.text}
          />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Make Your Own Outfit
        </Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={handleSaveDraft}
            disabled={saving}
            style={styles.saveDraftBtn}
          >
            <Text style={styles.saveDraftText}>
              {saving ? "Saving…" : "Save Draft"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Reset outfit",
                "Clear all sections and start over?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reset all", style: "destructive", onPress: handleResetAll },
                ]
              );
            }}
            style={styles.menuBtn}
          >
            <FontAwesome
              name="ellipsis-v"
              size={18}
              color={outfitBuilderColors.text}
            />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.main}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {orderedSections.map((section) => (
              <OutfitContainerCard
                key={section}
                section={section}
                recipe={recipe}
                onPress={() => openEditor(section)}
                label={section === "head" ? "Accessories" : undefined}
              />
            ))}
            <Pressable
              onPress={showAddMenu}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.addBtnPressed,
              ]}
            >
              <FontAwesome
                name="plus"
                size={22}
                color={outfitBuilderColors.accent}
              />
              <Text style={styles.addBtnText}>Add Background, Accessories, or more</Text>
            </Pressable>
          </View>
        </ScrollView>

        {isWide && editorOpen && selectedSection && (
          <View style={styles.sidePanel}>
            <EditorPanel
              section={selectedSection}
              recipe={recipe}
              onUpdateSection={updateSection}
              onApply={handleApply}
              onReset={resetSection}
              onClose={closeEditor}
              onUpdateGender={selectedSection === "model" ? handleGenderChange : undefined}
            />
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate || generating}
            style={[
              styles.generateBtn,
              (!canGenerate || generating) && styles.generateBtnDisabled,
            ]}
          >
            {generating ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={outfitBuilderColors.background}
                />
                <Text style={styles.generateText}>
                  {generateStatus ?? "Generating…"}
                </Text>
              </>
            ) : (
              <Text style={styles.generateText}>Generate Outfit</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AddToOutfitAccordion
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        availableOptions={availableOptionalOptions}
        onAdd={addOptional}
      />

      {!isWide && (
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          onDismiss={closeEditor}
          backgroundStyle={styles.bottomSheetBg}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            {selectedSection && (
              <EditorPanel
                section={selectedSection}
                recipe={recipe}
                onUpdateSection={updateSection}
                onApply={handleApply}
                onReset={resetSection}
                onClose={closeEditor}
                fullWidth
                onUpdateGender={selectedSection === "model" ? handleGenderChange : undefined}
              />
            )}
          </BottomSheetView>
        </BottomSheetModal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: outfitBuilderColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: outfitBuilderColors.border,
    backgroundColor: outfitBuilderColors.surface,
  },
  headerBtn: {
    padding: spacing[2],
    marginRight: spacing[2],
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  saveDraftBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    borderRadius: 8,
  },
  saveDraftText: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.text,
    fontFamily: typography.fontFamily.sans,
  },
  menuBtn: {
    padding: spacing[2],
  },
  main: {
    flex: 1,
    flexDirection: "row",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  form: {
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    borderStyle: "dashed",
    backgroundColor: outfitBuilderColors.surfaceElevated,
  },
  addBtnPressed: {
    opacity: 0.9,
  },
  addBtnText: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
  sidePanel: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: outfitBuilderColors.border,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    alignItems: "center",
    backgroundColor: outfitBuilderColors.background,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    width: "100%",
    maxWidth: 320,
    backgroundColor: outfitBuilderColors.accent,
    paddingVertical: spacing[4],
    borderRadius: 12,
  },
  generateBtnDisabled: {
    opacity: 0.5,
  },
  generateText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.background,
  },
  bottomSheetBg: {
    backgroundColor: outfitBuilderColors.surface,
  },
  bottomSheetIndicator: {
    backgroundColor: outfitBuilderColors.textMuted,
  },
  bottomSheetContent: {
    flex: 1,
    minHeight: 400,
  },
});
