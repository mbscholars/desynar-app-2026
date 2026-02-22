import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/Input";
import {
    atelier,
    radius,
    shadows,
    spacing,
    typography,
} from "@/constants/theme";
import { useCart } from "@/context/CartContext";
import { imageEditGenerate } from "@/services/api/imageEdit";
import { ordersApi, VOICE_NOTE_MAX_DURATION_SEC } from "@/services/api/orders";
import { tryOnGenerate } from "@/services/api/tryon";
import type { CartItemCustomization } from "@/types/cart";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_TAP = 44;

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type ActionChoice = "instructions" | "customize" | "tryon";

function getDisplayImageUri(item: {
  product: { imageUri: string };
  customization?: CartItemCustomization;
}): string {
  return (
    item.customization?.acceptedCustomizedImageUrl ?? item.product.imageUri
  );
}

/** Bubble/balloon config: position (%), size (pt), color. */
const CELEBRATION_BUBBLES: { left: number; top: number; size: number; color: string }[] = [
  { left: 8, top: 15, size: 28, color: atelier.accent },
  { left: 22, top: 22, size: 20, color: "rgba(255,255,255,0.7)" },
  { left: 75, top: 18, size: 24, color: atelier.accent },
  { left: 88, top: 28, size: 18, color: "rgba(255,255,255,0.6)" },
  { left: 12, top: 45, size: 22, color: "rgba(198,167,94,0.8)" },
  { left: 50, top: 38, size: 30, color: atelier.accent },
  { left: 82, top: 42, size: 20, color: "rgba(255,255,255,0.65)" },
  { left: 18, top: 62, size: 26, color: "rgba(255,255,255,0.55)" },
  { left: 68, top: 58, size: 22, color: atelier.accent },
  { left: 35, top: 72, size: 24, color: "rgba(198,167,94,0.7)" },
  { left: 90, top: 68, size: 18, color: "rgba(255,255,255,0.6)" },
  { left: 5, top: 82, size: 20, color: atelier.accent },
  { left: 55, top: 85, size: 28, color: "rgba(255,255,255,0.5)" },
  { left: 78, top: 80, size: 22, color: "rgba(198,167,94,0.75)" },
];

function TryOnCelebrationOverlay({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const opacityAnims = useRef(
    CELEBRATION_BUBBLES.map(() => new Animated.Value(0))
  ).current;
  const translateYAnims = useRef(
    CELEBRATION_BUBBLES.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const duration = 2400;
    const bubbleAnims = CELEBRATION_BUBBLES.map((_, i) => {
      const rise = Animated.timing(translateYAnims[i], {
        toValue: -280,
        duration,
        useNativeDriver: true,
      });
      const fadeInOut = Animated.sequence([
        Animated.timing(opacityAnims[i], {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(400),
        Animated.timing(opacityAnims[i], {
          toValue: 0,
          duration: duration - 600,
          useNativeDriver: true,
        }),
      ]);
      return Animated.parallel([
        rise,
        Animated.sequence([Animated.delay(i * 60), fadeInOut]),
      ]);
    });
    Animated.parallel(bubbleAnims).start();
    const t = setTimeout(() => onCompleteRef.current(), duration + 200);
    return () => clearTimeout(t);
  }, []);

  const { width, height } = Dimensions.get("window");
  return (
    <View
      style={[StyleSheet.absoluteFillObject, celebrationStyles.overlay]}
      pointerEvents="none"
    >
      {CELEBRATION_BUBBLES.map((b, i) => (
        <Animated.View
          key={i}
          style={[
            celebrationStyles.bubble,
            {
              left: (b.left / 100) * width - b.size / 2,
              top: (b.top / 100) * height - b.size / 2,
              width: b.size,
              height: b.size,
              borderRadius: b.size / 2,
              backgroundColor: b.color,
              opacity: opacityAnims[i],
              transform: [{ translateY: translateYAnims[i] }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const celebrationStyles = StyleSheet.create({
  overlay: {
    backgroundColor: "transparent",
  },
  bubble: {
    position: "absolute",
  },
});

export default function ReviewItemDetailsScreen() {
  const { lineId } = useLocalSearchParams<{ lineId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, updateItem } = useCart();

  const item = useMemo(
    () => items.find((i) => i.lineId === lineId),
    [items, lineId],
  );

  const [textInstructions, setTextInstructions] = useState(
    item?.customization?.textInstructions ?? "",
  );
  const [aiPrompt, setAiPrompt] = useState("");
  const [selectedTryOnProfileId, setSelectedTryOnProfileId] = useState<
    string | null
  >(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnProgress, setTryOnProgress] = useState("");
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [tryOnPreviewUrls, setTryOnPreviewUrls] = useState<string[]>([]);
  const [tryOnPreviewIndex, setTryOnPreviewIndex] = useState(0);
  /** When true, show balloon/bubbles celebration (try-on or image-edit success). */
  const [showCelebration, setShowCelebration] = useState(false);
  /** Customize with AI: loading, progress, error, and result preview URLs. */
  const [customizeLoading, setCustomizeLoading] = useState(false);
  const [customizeProgress, setCustomizeProgress] = useState("");
  const [customizeError, setCustomizeError] = useState<string | null>(null);
  const [customizePreviewUrls, setCustomizePreviewUrls] = useState<string[]>([]);
  const [customizePreviewIndex, setCustomizePreviewIndex] = useState(0);
  /** Which action form is shown; null = show the three choices. */
  const [selectedAction, setSelectedAction] = useState<ActionChoice | null>(
    null,
  );

  /** Voice note: from item or after upload. */
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(
    item?.customization?.voiceNoteUrl ?? null,
  );
  const [voiceTranscript, setVoiceTranscript] = useState(
    item?.customization?.voiceTranscript ?? "",
  );
  const [voiceNoteDurationSeconds, setVoiceNoteDurationSeconds] = useState<
    number | null
  >(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isUploadingVoiceNote, setIsUploadingVoiceNote] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRecordingRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const tryOnPulseAnim = useRef(new Animated.Value(0.4)).current;
  const tryOnRingScale = useRef(new Animated.Value(1)).current;
  const tryOnDotAnims = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.2)),
  ).current;
  useEffect(() => {
    if (!tryOnLoading && !customizeLoading) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(tryOnPulseAnim, {
          toValue: 0.65,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(tryOnPulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    const ringPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(tryOnRingScale, {
          toValue: 1.12,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(tryOnRingScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    const dotLoops = tryOnDotAnims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(val, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.2,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    pulse.start();
    ringPulse.start();
    dotLoops.forEach((l) => l.start());
    return () => {
      pulse.stop();
      ringPulse.stop();
      dotLoops.forEach((l) => l.stop());
    };
  }, [tryOnLoading, tryOnPulseAnim, tryOnRingScale, tryOnDotAnims]);

  useEffect(() => {
    setVoiceNoteUrl(item?.customization?.voiceNoteUrl ?? null);
    setVoiceTranscript(item?.customization?.voiceTranscript ?? "");
  }, [item?.customization?.voiceNoteUrl, item?.customization?.voiceTranscript]);

  // Keep try-on profile in sync with this cart item so we never send another item's profile image
  useEffect(() => {
    const profiles = item?.selectedProfiles ?? [];
    const ids = profiles.map((p) => p.id);
    const currentInList =
      selectedTryOnProfileId != null && ids.includes(selectedTryOnProfileId);
    if (!currentInList && ids.length > 0) {
      setSelectedTryOnProfileId(ids[0]);
    } else if (!currentInList && ids.length === 0) {
      setSelectedTryOnProfileId(null);
    }
  }, [lineId, item?.selectedProfiles, selectedTryOnProfileId]);

  const displayImageUri = item ? getDisplayImageUri(item) : "";
  const garmentImageUri =
    item?.customization?.acceptedCustomizedImageUrl ??
    item?.product.imageUri ??
    "";

  const selectedProfiles = item?.selectedProfiles ?? [];

  /** Show checkmark on action cards when user has added content. */
  const hasInstructions =
    textInstructions.trim() !== "" || !!item?.customization?.voiceNoteUrl;
  const hasCustomize = aiPrompt.trim() !== "";
  const hasTryOn = tryOnPreviewUrls.length > 0;

  const currentTryOnPreview = tryOnPreviewUrls[tryOnPreviewIndex] ?? null;

  /** When in tryon/customize: show result in hero if available, else garment; otherwise display image. */
  const heroImageUri =
    selectedAction === "tryon"
      ? tryOnPreviewUrls.length > 0
        ? (tryOnPreviewUrls[tryOnPreviewIndex] ?? garmentImageUri)
        : garmentImageUri
      : selectedAction === "customize" && customizePreviewUrls.length > 0
        ? (customizePreviewUrls[customizePreviewIndex] ?? garmentImageUri)
        : selectedAction === "customize"
          ? garmentImageUri
          : displayImageUri;

  const heroFadeAnim = useRef(new Animated.Value(1)).current;
  const prevTryOnCountRef = useRef(0);
  const prevCustomizeCountRef = useRef(0);
  useEffect(() => {
    const hasResults = tryOnPreviewUrls.length > 0;
    if (selectedAction === "tryon" && hasResults && prevTryOnCountRef.current === 0) {
      heroFadeAnim.setValue(0);
      Animated.timing(heroFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    prevTryOnCountRef.current = tryOnPreviewUrls.length;
  }, [selectedAction, tryOnPreviewUrls.length, heroFadeAnim]);
  useEffect(() => {
    const hasResults = customizePreviewUrls.length > 0;
    if (selectedAction === "customize" && hasResults && prevCustomizeCountRef.current === 0) {
      heroFadeAnim.setValue(0);
      Animated.timing(heroFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    prevCustomizeCountRef.current = customizePreviewUrls.length;
  }, [selectedAction, customizePreviewUrls.length, heroFadeAnim]);

  useEffect(() => {
    if (selectedAction === "tryon" && tryOnPreviewUrls.length > 1) {
      heroFadeAnim.setValue(0);
      Animated.timing(heroFadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [tryOnPreviewIndex, selectedAction, tryOnPreviewUrls.length, heroFadeAnim]);

  const saveInstructions = useCallback(() => {
    if (!lineId) return;
    updateItem(lineId, {
      customization: {
        ...item?.customization,
        textInstructions: textInstructions.trim() || undefined,
      },
    });
  }, [lineId, item?.customization, textInstructions, updateItem]);

  const saveVoiceToCart = useCallback(
    (
      url: string | null,
      transcript: string | null,
      duration: number | null,
    ) => {
      if (!lineId) return;
      updateItem(lineId, {
        customization: {
          ...item?.customization,
          voiceNoteUrl: url ?? undefined,
          voiceTranscript: transcript ?? undefined,
        },
      });
    },
    [lineId, item?.customization, updateItem],
  );

  const startRecording = useCallback(async () => {
    setVoiceError(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setVoiceError("Microphone permission is required to record.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSeconds(0);
      const timer = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= VOICE_NOTE_MAX_DURATION_SEC - 1) {
            if (recordingTimerRef.current) {
              clearInterval(recordingTimerRef.current);
              recordingTimerRef.current = null;
            }
            return VOICE_NOTE_MAX_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);
      recordingTimerRef.current = timer;
    } catch (e) {
      setVoiceError(
        e instanceof Error ? e.message : "Could not start recording.",
      );
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    const elapsed = recordingSeconds;
    setRecordingSeconds(0);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        setVoiceError("Recording failed: no file.");
        return;
      }
      setIsUploadingVoiceNote(true);
      setVoiceError(null);
      setVoiceTranscript("Uploading and transcribing...");
      const response = await ordersApi.uploadVoiceNote(uri);
      if (response.success && response.data) {
        setVoiceNoteUrl(response.data.url);
        setVoiceTranscript(response.data.transcript || "");
        setVoiceNoteDurationSeconds(
          response.data.duration ?? Math.round(elapsed),
        );
        saveVoiceToCart(
          response.data.url,
          response.data.transcript || null,
          response.data.duration ?? Math.round(elapsed),
        );
      } else {
        setVoiceError("Upload failed.");
      }
    } catch (e) {
      setVoiceError(
        e instanceof Error ? e.message : "Upload failed. Try again.",
      );
      setVoiceTranscript("");
    } finally {
      setIsUploadingVoiceNote(false);
    }
  }, [recordingSeconds, saveVoiceToCart]);

  const removeVoiceNote = useCallback(async () => {
    const sound = soundRef.current;
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
    }
    setIsPlayingVoice(false);
    setVoiceNoteUrl(null);
    setVoiceTranscript("");
    setVoiceNoteDurationSeconds(null);
    saveVoiceToCart(null, null, null);
  }, [saveVoiceToCart]);

  const playOrPauseVoiceNote = useCallback(async () => {
    if (!voiceNoteUrl) return;
    try {
      const sound = soundRef.current;
      if (sound) {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          soundRef.current = null;
          return;
        }
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlayingVoice(false);
        } else {
          await sound.playAsync();
          setIsPlayingVoice(true);
        }
        return;
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceNoteUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinishAndNotLoop) {
            setIsPlayingVoice(false);
          }
        },
      );
      soundRef.current = newSound;
      setIsPlayingVoice(true);
    } catch (e) {
      console.debug("Voice playback error:", e);
    }
  }, [voiceNoteUrl]);

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
      }
      const snd = soundRef.current;
      if (snd) {
        snd.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && recordingSeconds >= VOICE_NOTE_MAX_DURATION_SEC) {
      stopRecordingRef.current();
    }
  }, [isRecording, recordingSeconds]);

  const runTryOn = useCallback(async () => {
    if (!selectedTryOnProfileId || !item) return;
    const profile = item.selectedProfiles?.find(
      (p) => p.id === selectedTryOnProfileId,
    );
    const modelImage = profile?.frontImageUri;
    if (!modelImage) {
      setTryOnError(
        "No avatar photo for this profile. Add a front view photo in Measurements.",
      );
      return;
    }
    setTryOnLoading(true);
    setTryOnError(null);
    setTryOnProgress("Creating virtual try-on...");
    try {
      const numericProfileId = selectedTryOnProfileId
        ? parseInt(selectedTryOnProfileId, 10)
        : NaN;
      const result = await tryOnGenerate(
        {
          model_image: modelImage,
          garment_image: garmentImageUri,
          ...(Number.isInteger(numericProfileId) && {
            measurement_profile_id: numericProfileId,
          }),
          category: "auto",
          mode: "balanced",
          num_samples: 1,
        },
        (update) => {
          if (update.status === "IN_QUEUE")
            setTryOnProgress("Waiting in queue...");
          else if (update.status === "IN_PROGRESS")
            setTryOnProgress(
              update.logs?.[update.logs.length - 1]?.message ?? "Processing...",
            );
        },
      );
      if (result.success && result.data?.images?.length) {
        setTryOnPreviewUrls(result.data.images.map((img) => img.url));
        setTryOnPreviewIndex(0);
        setShowCelebration(true);
      } else {
        setTryOnError(result.error ?? "Try-on failed");
      }
    } catch (e) {
      setTryOnError(e instanceof Error ? e.message : "Try-on failed");
    } finally {
      setTryOnLoading(false);
      setTryOnProgress("");
    }
  }, [selectedTryOnProfileId, item, garmentImageUri]);

  const runCustomizeEdit = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || !garmentImageUri) {
      setCustomizeError("Enter a description and ensure the item has an image.");
      return;
    }
    setCustomizeLoading(true);
    setCustomizeError(null);
    setCustomizeProgress("Creating image edit...");
    try {
      const result = await imageEditGenerate(
        {
          prompt,
          image_urls: [garmentImageUri],
        },
        (update) => {
          if (update.status === "IN_QUEUE")
            setCustomizeProgress("Waiting in queue...");
          else if (update.status === "IN_PROGRESS")
            setCustomizeProgress(
              update.logs?.[update.logs.length - 1]?.message ?? "Processing...",
            );
        },
      );
      if (result.success && result.data?.images?.length) {
        setCustomizePreviewUrls(result.data.images.map((img) => img.url));
        setCustomizePreviewIndex(0);
        setShowCelebration(true);
      } else {
        setCustomizeError(result.error ?? "Image edit failed");
      }
    } catch (e) {
      setCustomizeError(e instanceof Error ? e.message : "Image edit failed");
    } finally {
      setCustomizeLoading(false);
      setCustomizeProgress("");
    }
  }, [aiPrompt, garmentImageUri]);

  const currentCustomizePreview =
    customizePreviewUrls[customizePreviewIndex] ?? null;

  const acceptTryOn = useCallback(() => {
    if (!lineId || !currentTryOnPreview) return;
    updateItem(lineId, {
      product: { imageUri: currentTryOnPreview },
      customization: {
        ...item?.customization,
        textInstructions:
          textInstructions.trim() || item?.customization?.textInstructions,
        acceptedCustomizedImageUrl: currentTryOnPreview,
      },
    });
    router.back();
  }, [
    lineId,
    currentTryOnPreview,
    item?.customization,
    textInstructions,
    updateItem,
    router,
  ]);

  const acceptCustomize = useCallback(() => {
    if (!lineId || !currentCustomizePreview) return;
    updateItem(lineId, {
      product: { imageUri: currentCustomizePreview },
      customization: {
        ...item?.customization,
        textInstructions:
          textInstructions.trim() || item?.customization?.textInstructions,
        acceptedCustomizedImageUrl: currentCustomizePreview,
      },
    });
    router.back();
  }, [
    lineId,
    currentCustomizePreview,
    item?.customization,
    textInstructions,
    updateItem,
    router,
  ]);

  const onBack = useCallback(() => {
    if (selectedAction) {
      setSelectedAction(null);
      return;
    }
    saveInstructions();
    router.back();
  }, [selectedAction, saveInstructions, router]);

  if (!item) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <PageHeader onBack={() => router.back()} title="Item details" />
        <View style={styles.centered}>
          <Text style={styles.muted}>Item not found.</Text>
        </View>
      </View>
    );
  }

  const headerTitle =
    selectedAction === "instructions"
      ? "Add instructions"
      : selectedAction === "customize"
        ? "Customize Outfit (AI)"
        : selectedAction === "tryon"
          ? "Try on"
          : item.product.outfitName;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader onBack={onBack} title={headerTitle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[6] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroImageWrap}>
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { opacity: heroFadeAnim }]}
          >
            <Image
              source={{ uri: heroImageUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          </Animated.View>
          {(selectedAction === "tryon" && tryOnLoading) ||
          (selectedAction === "customize" && customizeLoading) ? (
            <>
              <BlurView
                intensity={64}
                tint="dark"
                style={StyleSheet.absoluteFillObject}
              />
              <Animated.View
                style={[
                  styles.tryOnProcessingOverlay,
                  { opacity: tryOnPulseAnim },
                ]}
              />
              <View style={styles.tryOnProcessingGraphic}>
                {tryOnDotAnims.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.tryOnProcessingDot,
                      {
                        opacity: anim,
                        left: `${20 + (i % 4) * 22}%`,
                        top: `${25 + Math.floor(i / 4) * 28}%`,
                      },
                    ]}
                  />
                ))}
                <Animated.View
                  style={[
                    styles.tryOnProcessingCenterRing,
                    { transform: [{ scale: tryOnRingScale }] },
                  ]}
                />
              </View>
              <View style={styles.tryOnProcessingLabel}>
                <ActivityIndicator
                  size="small"
                  color={atelier.accent}
                />
                <Text style={styles.tryOnProgress}>
                  {selectedAction === "customize"
                    ? customizeProgress
                    : tryOnProgress}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {selectedAction === null ? (
          <View style={styles.actionChoices}>
            <Text style={styles.actionChoicesTitle}>
              What would you like to do?
            </Text>
            <Pressable
              onPress={() => setSelectedAction("instructions")}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add instructions for the tailor"
            >
              <FontAwesome name="align-left" size={24} color={atelier.accent} />
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>Add instructions</Text>
                <Text style={styles.actionCardDesc}>
                  Type or record notes for the tailor
                </Text>
              </View>
              {hasInstructions ? (
                <FontAwesome
                  name="check-circle"
                  size={22}
                  color={atelier.accent}
                  style={styles.actionCardCheck}
                />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setSelectedAction("customize")}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Customize Outfit with AI"
            >
              <FontAwesome name="magic" size={24} color={atelier.accent} />
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>Customize Outfit with AI</Text>
                <Text style={styles.actionCardDesc}>
                  Describe changes (e.g. color, length)
                </Text>
              </View>
              {hasCustomize ? (
                <FontAwesome
                  name="check-circle"
                  size={22}
                  color={atelier.accent}
                  style={styles.actionCardCheck}
                />
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => setSelectedAction("tryon")}
              style={({ pressed }) => [
                styles.actionCard,
                pressed && styles.actionCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Try on virtually"
            >
              <FontAwesome name="user" size={24} color={atelier.accent} />
              <View style={styles.actionCardTextWrap}>
                <Text style={styles.actionCardTitle}>Try on</Text>
                <Text style={styles.actionCardDesc}>
                  See it on your measurement profile
                </Text>
              </View>
              {hasTryOn ? (
                <FontAwesome
                  name="check-circle"
                  size={22}
                  color={atelier.accent}
                  style={styles.actionCardCheck}
                />
              ) : null}
            </Pressable>
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setSelectedAction(null)}
              style={({ pressed }) => [
                styles.backToOptions,
                pressed && styles.backToOptionsPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Back to options"
            >
              <FontAwesome
                name="chevron-left"
                size={16}
                color={atelier.muted}
              />
              <Text style={styles.backToOptionsText}>
                Choose another option
              </Text>
            </Pressable>

            {selectedAction === "instructions" && (
              <View style={styles.section}>
                <View style={styles.instructionsRow}>
                  <TextInput
                    style={styles.instructionsInput}
                    placeholder="Type instructions for the tailor..."
                    placeholderTextColor={atelier.muted}
                    value={textInstructions}
                    onChangeText={setTextInstructions}
                    onBlur={saveInstructions}
                    multiline
                    numberOfLines={3}
                  />
                  {!isRecording && !voiceNoteUrl && (
                    <Pressable
                      onPress={startRecording}
                      style={({ pressed }) => [
                        styles.micBtn,
                        pressed && styles.micBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Record voice instructions"
                    >
                      <FontAwesome
                        name="microphone"
                        size={22}
                        color={atelier.cta}
                      />
                    </Pressable>
                  )}
                </View>

                {isRecording && (
                  <View style={styles.voiceRecordingRow}>
                    <Text style={styles.voiceRecordingTime}>
                      {formatRecordingTime(recordingSeconds)} /{" "}
                      {formatRecordingTime(VOICE_NOTE_MAX_DURATION_SEC)}
                    </Text>
                    <Pressable
                      onPress={stopRecording}
                      style={({ pressed }) => [
                        styles.voiceStopBtn,
                        pressed && styles.voiceStopBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Stop recording"
                    >
                      <FontAwesome
                        name="stop"
                        size={18}
                        color={atelier.ctaText}
                      />
                      <Text style={styles.voiceStopBtnText}>Stop</Text>
                    </Pressable>
                  </View>
                )}

                {voiceError ? (
                  <Text style={styles.voiceError}>{voiceError}</Text>
                ) : null}

                {voiceNoteUrl && !isRecording && (
                  <View style={styles.voiceNoteCard}>
                    <View style={styles.voiceNoteCardHeader}>
                      <FontAwesome
                        name="check-circle"
                        size={18}
                        color={atelier.accent}
                      />
                      <Text style={styles.voiceNoteCardTitle}>
                        Voice note attached
                      </Text>
                      {voiceNoteDurationSeconds != null && (
                        <Text style={styles.voiceNoteDuration}>
                          {formatRecordingTime(voiceNoteDurationSeconds)}
                        </Text>
                      )}
                    </View>
                    {isUploadingVoiceNote ? (
                      <ActivityIndicator
                        size="small"
                        color={atelier.accent}
                        style={styles.voiceUploadLoader}
                      />
                    ) : (
                      <>
                        <Pressable
                          onPress={playOrPauseVoiceNote}
                          style={({ pressed }) => [
                            styles.voicePlayBtn,
                            pressed && styles.voicePlayBtnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPlayingVoice ? "Pause" : "Play voice note"
                          }
                        >
                          <FontAwesome
                            name={isPlayingVoice ? "pause" : "play"}
                            size={18}
                            color={atelier.ctaText}
                          />
                          <Text style={styles.voicePlayBtnText}>
                            {isPlayingVoice ? "Pause" : "Play"}
                          </Text>
                        </Pressable>
                        {voiceTranscript ? (
                          <Text
                            style={styles.voiceTranscript}
                            numberOfLines={4}
                          >
                            {voiceTranscript}
                          </Text>
                        ) : null}
                      </>
                    )}
                    <Pressable
                      onPress={removeVoiceNote}
                      style={({ pressed }) => [
                        styles.voiceRemoveBtn,
                        pressed && styles.voiceRemoveBtnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Remove voice recording"
                    >
                      <FontAwesome
                        name="trash-o"
                        size={14}
                        color={atelier.muted}
                      />
                      <Text style={styles.voiceRemoveBtnText}>
                        Remove recording
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {selectedAction === "customize" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customize Outfit with AI</Text>
                 
                <TextInput
                  style={styles.customizeTextarea}
                  placeholder="e.g. change color to navy, add pockets, shorter sleeves"
                  placeholderTextColor={atelier.muted}
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={!customizeLoading}
                />
                {customizeError ? (
                  <Text style={styles.errorText}>{customizeError}</Text>
                ) : null}
                {customizePreviewUrls.length > 0 ? (
                  <>
                    {customizePreviewUrls.length > 1 && (
                      <View style={styles.tryOnNav}>
                        <Pressable
                          onPress={() =>
                            setCustomizePreviewIndex((i) => Math.max(0, i - 1))
                          }
                          disabled={customizePreviewIndex <= 0}
                          style={styles.tryOnNavBtn}
                        >
                          <FontAwesome
                            name="chevron-left"
                            size={18}
                            color={atelier.cta}
                          />
                        </Pressable>
                        <Text style={styles.tryOnCounter}>
                          {customizePreviewIndex + 1} /{" "}
                          {customizePreviewUrls.length}
                        </Text>
                        <Pressable
                          onPress={() =>
                            setCustomizePreviewIndex((i) =>
                              Math.min(
                                customizePreviewUrls.length - 1,
                                i + 1,
                              ),
                            )
                          }
                          disabled={
                            customizePreviewIndex >=
                            customizePreviewUrls.length - 1
                          }
                          style={styles.tryOnNavBtn}
                        >
                          <FontAwesome
                            name="chevron-right"
                            size={18}
                            color={atelier.cta}
                          />
                        </Pressable>
                      </View>
                    )}
                    <View style={styles.tryOnActions}>
                      <Pressable
                        onPress={runCustomizeEdit}
                        style={({ pressed }) => [
                          styles.tryOnBtn,
                          pressed && styles.tryOnBtnPressed,
                        ]}
                      >
                        <Text style={styles.tryOnBtnText}>Regenerate</Text>
                      </Pressable>
                      <Pressable
                        onPress={acceptCustomize}
                        style={({ pressed }) => [
                          styles.tryOnBtnPrimary,
                          pressed && styles.tryOnBtnPressed,
                        ]}
                      >
                        <Text style={styles.tryOnBtnPrimaryText}>
                          Looks good
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Pressable
                    onPress={runCustomizeEdit}
                    disabled={customizeLoading || !aiPrompt.trim()}
                    style={({ pressed }) => [
                      styles.customizeSubmitBtn,
                      pressed && styles.tryOnBtnPressed,
                      (customizeLoading || !aiPrompt.trim()) &&
                        styles.tryOnBtnDisabled,
                    ]}
                  >
                    <Text style={styles.customizeSubmitBtnText}>
                      Generate customization
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {selectedAction === "tryon" && (
              <View style={styles.section}>
                <Text style={styles.sectionDesc}>
                  Choose a profile to try this outfit on virtually.
                </Text>

                {selectedProfiles.length === 0 ? (
                  <Text style={styles.muted}>
                    No measurement profiles selected for this item.
                  </Text>
                ) : (
                  <>
                    <View style={styles.profileChips}>
                      {selectedProfiles.map(({ id, name }) => (
                        <Pressable
                          key={id}
                          onPress={() => setSelectedTryOnProfileId(id)}
                          style={[
                            styles.chip,
                            selectedTryOnProfileId === id &&
                              styles.chipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selectedTryOnProfileId === id &&
                                styles.chipTextSelected,
                            ]}
                          >
                            {name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {tryOnError ? (
                      <Text style={styles.errorText}>{tryOnError}</Text>
                    ) : null}

                    {tryOnPreviewUrls.length > 0 ? (
                      <>
                        {tryOnPreviewUrls.length > 1 && (
                          <View style={styles.tryOnNav}>
                            <Pressable
                              onPress={() =>
                                setTryOnPreviewIndex((i) => Math.max(0, i - 1))
                              }
                              disabled={tryOnPreviewIndex <= 0}
                              style={styles.tryOnNavBtn}
                            >
                              <FontAwesome
                                name="chevron-left"
                                size={18}
                                color={atelier.cta}
                              />
                            </Pressable>
                            <Text style={styles.tryOnCounter}>
                              {tryOnPreviewIndex + 1} /{" "}
                              {tryOnPreviewUrls.length}
                            </Text>
                            <Pressable
                              onPress={() =>
                                setTryOnPreviewIndex((i) =>
                                  Math.min(tryOnPreviewUrls.length - 1, i + 1),
                                )
                              }
                              disabled={
                                tryOnPreviewIndex >= tryOnPreviewUrls.length - 1
                              }
                              style={styles.tryOnNavBtn}
                            >
                              <FontAwesome
                                name="chevron-right"
                                size={18}
                                color={atelier.cta}
                              />
                            </Pressable>
                          </View>
                        )}
                        <View style={styles.tryOnActions}>
                          <Pressable
                            onPress={runTryOn}
                            style={({ pressed }) => [
                              styles.tryOnBtn,
                              pressed && styles.tryOnBtnPressed,
                            ]}
                          >
                            <Text style={styles.tryOnBtnText}>Regenerate</Text>
                          </Pressable>
                          <Pressable
                            onPress={acceptTryOn}
                            style={({ pressed }) => [
                              styles.tryOnBtnPrimary,
                              pressed && styles.tryOnBtnPressed,
                            ]}
                          >
                            <Text style={styles.tryOnBtnPrimaryText}>
                              Looks good
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <Pressable
                        onPress={runTryOn}
                        disabled={!selectedTryOnProfileId}
                        style={({ pressed }) => [
                          styles.tryOnBtnPrimary,
                          pressed && styles.tryOnBtnPressed,
                          !selectedTryOnProfileId && styles.tryOnBtnDisabled,
                        ]}
                      >
                        <Text style={styles.tryOnBtnPrimaryText}>
                          Generate try-on
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
      {showCelebration && (
        <TryOnCelebrationOverlay
          onComplete={() => setShowCelebration(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  muted: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  heroImageWrap: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: radius.panel,
    overflow: "hidden",
    backgroundColor: atelier.backgroundOverlay,
    marginBottom: spacing[6],
  },
  actionChoices: {
    gap: spacing[3],
  },
  actionChoicesTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: atelier.muted,
    marginBottom: spacing[2],
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[4],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    backgroundColor: atelier.panel,
    minHeight: MIN_TAP * 1.5,
  },
  actionCardPressed: { opacity: 0.9 },
  actionCardTextWrap: {
    flex: 1,
  },
  actionCardCheck: {
    marginLeft: spacing[2],
  },
  actionCardTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
  },
  actionCardDesc: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  backToOptions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  backToOptionsPressed: { opacity: 0.8 },
  backToOptionsText: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    marginBottom: spacing[4],
  },
  sectionDesc: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[3],
  },
  instructionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  instructionsInput: {
    flex: 1,
    minHeight: 88,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
    textAlignVertical: "top",
  },
  micBtn: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnPressed: { opacity: 0.8 },
  voiceRecordingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    backgroundColor: atelier.panel,
  },
  voiceRecordingTime: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  voiceStopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: atelier.accent,
    minHeight: MIN_TAP,
    justifyContent: "center",
  },
  voiceStopBtnPressed: { opacity: 0.9 },
  voiceStopBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
  voiceError: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[2],
  },
  voiceNoteCard: {
    marginTop: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    backgroundColor: atelier.panel,
  },
  voiceNoteCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  voiceNoteCardTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
  },
  voiceNoteDuration: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  voiceUploadLoader: { marginVertical: spacing[2] },
  voicePlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    alignSelf: "flex-start",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: atelier.accent,
    marginBottom: spacing[2],
    minHeight: MIN_TAP,
    justifyContent: "center",
  },
  voicePlayBtnPressed: { opacity: 0.9 },
  voicePlayBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
  voiceTranscript: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  voiceRemoveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  voiceRemoveBtnPressed: { opacity: 0.8 },
  voiceRemoveBtnText: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  inputContainer: { marginBottom: spacing[2] },
  customizeTextarea: {
    minHeight: 100,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.divider,
    backgroundColor: "rgba(255,255,255,0.06)",
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
    marginBottom: spacing[4],
  },
  customizeSubmitBtn: {
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    backgroundColor: atelier.accent,
    alignItems: "center",
    ...shadows.soft,
  },
  customizeSubmitBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  profileChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.divider,
  },
  chipSelected: {
    borderColor: atelier.accent,
    backgroundColor: atelier.panelGlow,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
  chipTextSelected: {
    color: atelier.cta,
    fontFamily: typography.fontFamily.medium,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  tryOnLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  tryOnProcessingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: atelier.backgroundOverlay,
  },
  tryOnProcessingGraphic: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  tryOnProcessingDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: atelier.accent,
  },
  tryOnProcessingCenterRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: atelier.accent,
    opacity: 0.5,
    backgroundColor: "transparent",
  },
  tryOnProcessingLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: atelier.panel,
  },
  tryOnProgress: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  tryOnNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
    marginTop: spacing[2],
  },
  tryOnNavBtn: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: "center",
    justifyContent: "center",
  },
  tryOnCounter: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  tryOnActions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[4],
  },
  tryOnBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: atelier.divider,
    alignItems: "center",
  },
  tryOnBtnPrimary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    backgroundColor: atelier.accent,
    alignItems: "center",
    ...shadows.soft,
  },
  tryOnBtnPressed: { opacity: 0.9 },
  tryOnBtnDisabled: { opacity: 0.5 },
  tryOnBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.cta,
  },
  tryOnBtnPrimaryText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: atelier.ctaText,
  },
});
