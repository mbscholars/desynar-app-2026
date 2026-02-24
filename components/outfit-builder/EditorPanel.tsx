import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeTouchEvent,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { OutfitSectionKey } from "@/types/outfitRecipe";
import type { LookRecipe } from "@/types/outfitRecipe";
import { OUTFIT_SECTION_LABELS } from "@/types/outfitRecipe";
import { outfitBuilderColors } from "@/constants/outfitBuilder";
import {
  MODEL_PRESETS,
  HEAD_PRESETS,
  TOP_PRESETS,
  BOTTOM_PRESETS,
  SHOES_TYPES,
  SHOES_PRESETS,
  BACKGROUND_PRESETS,
  GARMENT_COLORS,
} from "@/constants/outfitBuilder";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, typography, radius } from "@/constants/theme";
import { useImagePicker } from "@/hooks/useImagePicker";
import { hslToHex, hexToHsl, isHexColor } from "@/utils/colorUtils";

const TAB_NAMES = ["Presets", "Prompt", "Image"] as const;
type TabName = (typeof TAB_NAMES)[number];

const PANEL_WIDTH = Math.min(360, Dimensions.get("window").width * 0.9);

interface EditorPanelProps {
  section: OutfitSectionKey;
  recipe: LookRecipe;
  onUpdateSection: (
    section: OutfitSectionKey,
    update: Partial<LookRecipe["sections"][OutfitSectionKey]>
  ) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  /** When true (e.g. in bottom sheet), panel uses full width. */
  fullWidth?: boolean;
  /** When editing Model section, called when user changes gender. */
  onUpdateGender?: (gender: "male" | "female") => void;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function resolveColorToHex(color: string | undefined): string {
  if (!color?.trim()) return "#808080";
  const s = color.trim();
  if (isHexColor(s)) return s;
  const found = GARMENT_COLORS.find((c) => c.name.toLowerCase() === s.toLowerCase());
  return found ? found.hex : "#808080";
}

function ColorSwatchRow({
  value,
  onSelect,
  onRequestCustom,
}: {
  value: string;
  onSelect: (colorNameOrHex: string) => void;
  onRequestCustom?: () => void;
}) {
  const current = value?.toLowerCase().trim() ?? "";
  const isHex = isHexColor(value ?? "");
  return (
    <View style={styles.colorSwatchRow}>
      {GARMENT_COLORS.map(({ name, hex }) => {
        const selected = !isHex && current === name;
        return (
          <Pressable
            key={name}
            onPress={() => onSelect(name)}
            style={[
              styles.colorSwatch,
              { backgroundColor: hex },
              selected && styles.colorSwatchSelected,
            ]}
          >
            {selected && (
              <FontAwesome name="check" size={12} color={hex === "#F5F5F5" || hex === "#fef3c7" ? outfitBuilderColors.background : outfitBuilderColors.text} />
            )}
          </Pressable>
        );
      })}
      {onRequestCustom && (
        <Pressable
          onPress={onRequestCustom}
          style={[
            styles.colorSwatch,
            styles.colorSwatchCustom,
            isHex && styles.colorSwatchSelected,
          ]}
        >
          {isHex ? (
            <View style={[styles.colorSwatchCustomInner, { backgroundColor: value ?? "#808080" }]} />
          ) : (
            <FontAwesome name="plus" size={14} color={outfitBuilderColors.textMuted} />
          )}
        </Pressable>
      )}
    </View>
  );
}

function ColorWheelModal({
  visible,
  initialHex,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialHex: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
}) {
  const [h, setH] = useState(0);
  const [s, setS] = useState(50);
  const [l, setL] = useState(50);
  const hueWidth = useRef(280);
  const slWidth = useRef(280);

  useEffect(() => {
    if (visible && initialHex) {
      const { h: h0, s: s0, l: l0 } = hexToHsl(initialHex);
      setH(h0);
      setS(s0);
      setL(l0);
    }
  }, [visible, initialHex]);

  const currentHex = hslToHex(h, s, l);

  const handleHuePress = (ev: NativeSyntheticEvent<NativeTouchEvent>) => {
    const x = ev.nativeEvent.locationX;
    const w = hueWidth.current;
    if (w <= 0) return;
    const value = Math.max(0, Math.min(360, (x / w) * 360));
    setH(Math.round(value));
  };

  const handleSLPress = (
    ev: NativeSyntheticEvent<NativeTouchEvent>,
    type: "s" | "l",
  ) => {
    const x = ev.nativeEvent.locationX;
    const w = slWidth.current;
    if (w <= 0) return;
    const value = Math.max(0, Math.min(100, (x / w) * 100));
    if (type === "s") setS(Math.round(value));
    else setL(Math.round(value));
  };

  if (!visible) return null;

  const hueColors = Array.from({ length: 36 }, (_, i) => hslToHex(i * 10, 100, 50));

  const sSegments = Array.from({ length: 20 }, (_, i) => hslToHex(h, (i / 19) * 100, l));
  const lSegments = Array.from({ length: 20 }, (_, i) => hslToHex(h, s, (i / 19) * 100));

  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.colorWheelOverlay} onPress={onClose}>
        <Pressable style={styles.colorWheelCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.colorWheelTitle}>Choose color</Text>
          <View style={[styles.colorWheelPreview, { backgroundColor: currentHex }]} />
          <Text style={styles.presetLabel}>Hue</Text>
          <Pressable
            onLayout={(e) => {
              hueWidth.current = e.nativeEvent.layout.width;
            }}
            onPress={handleHuePress}
            style={styles.colorWheelStrip}
          >
            {hueColors.map((hex, i) => (
              <View key={i} style={[styles.colorWheelSegment, { backgroundColor: hex }]} />
            ))}
          </Pressable>
          <Text style={styles.presetLabel}>Saturation</Text>
          <Pressable
            onLayout={(e) => {
              slWidth.current = e.nativeEvent.layout.width;
            }}
            onPress={(ev) => handleSLPress(ev, "s")}
            style={styles.colorWheelStrip}
          >
            {sSegments.map((hex, i) => (
              <View key={i} style={[styles.colorWheelSegment, { backgroundColor: hex }]} />
            ))}
          </Pressable>
          <Text style={styles.presetLabel}>Lightness</Text>
          <Pressable
            onPress={(ev) => handleSLPress(ev, "l")}
            style={styles.colorWheelStrip}
          >
            {lSegments.map((hex, i) => (
              <View key={i} style={[styles.colorWheelSegment, { backgroundColor: hex }]} />
            ))}
          </Pressable>
          <View style={styles.colorWheelActions}>
            <Pressable onPress={onClose} style={styles.colorWheelCancelBtn}>
              <Text style={styles.resetText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSelect(currentHex)}
              style={styles.colorWheelDoneBtn}
            >
              <Text style={styles.applyText}>Use color</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function EditorPanel({
  section,
  recipe,
  onUpdateSection,
  onApply,
  onReset,
  onClose,
  fullWidth = false,
  onUpdateGender,
}: EditorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabName>("Presets");
  const insets = useSafeAreaInsets();
  const { pickImage } = useImagePicker();
  const sectionData = recipe.sections[section];
  const sectionLabel =
    section === "model"
      ? "Model"
      : section === "head"
        ? "Accessories"
        : OUTFIT_SECTION_LABELS[section];

  const hasImageTab =
    section === "model" ||
    section === "head" ||
    section === "top" ||
    section === "bottom" ||
    section === "shoes";
  const tabs = hasImageTab ? TAB_NAMES : (["Presets", "Prompt"] as const);

  const updatePrompt = (prompt: string) => {
    onUpdateSection(section, { ...sectionData, prompt } as Partial<LookRecipe["sections"][OutfitSectionKey]>);
  };

  const updatePresets = (presets: Record<string, string>) => {
    onUpdateSection(section, { ...sectionData, presets } as Partial<LookRecipe["sections"][OutfitSectionKey]>);
  };

  const handleUploadImage = async () => {
    const uri = await pickImage();
    if (uri && "imageRef" in sectionData) {
      onUpdateSection(section, { ...sectionData, imageRef: uri } as Partial<LookRecipe["sections"][OutfitSectionKey]>);
    }
  };

  return (
    <View style={[styles.panel, fullWidth ? styles.panelFullWidth : { width: PANEL_WIDTH }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit {sectionLabel}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <FontAwesome name="times" size={20} color={outfitBuilderColors.text} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: spacing[8] + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "Presets" && (
          <PresetsContent
            section={section}
            sectionData={sectionData}
            recipe={recipe}
            onUpdateSection={onUpdateSection}
            onUpdateGender={onUpdateGender}
          />
        )}
        {activeTab === "Prompt" && (
          <PromptContent
            section={section}
            sectionData={sectionData}
            updatePrompt={updatePrompt}
          />
        )}
        {activeTab === "Image" && hasImageTab && (
          <ImageContent
            section={section}
            sectionData={sectionData}
            onUpload={handleUploadImage}
            onUpdateSection={onUpdateSection}
          />
        )}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: spacing[3] + insets.bottom }]}>
        <Pressable onPress={onReset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset section</Text>
        </Pressable>
        <Pressable onPress={onApply} style={styles.applyBtn}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, "");
}

function PresetsContent({
  section,
  sectionData,
  recipe,
  onUpdateSection,
  onUpdateGender,
}: {
  section: OutfitSectionKey;
  sectionData: LookRecipe["sections"][OutfitSectionKey];
  recipe: LookRecipe;
  onUpdateSection: (s: OutfitSectionKey, u: Partial<LookRecipe["sections"][OutfitSectionKey]>) => void;
  onUpdateGender?: (gender: "male" | "female") => void;
}) {
  const [customColorPicker, setCustomColorPicker] = useState<{
    initialHex: string;
    onSelect: (hex: string) => void;
  } | null>(null);

  const updatePresets = (presets: Record<string, unknown>) => {
    onUpdateSection(section, { ...sectionData, presets } as Partial<LookRecipe["sections"][OutfitSectionKey]>);
  };

  if (section === "model") {
    const modelPresets = sectionData.presets as LookRecipe["sections"]["model"]["presets"];
    return (
      <View style={styles.presetBlock}>
        {onUpdateGender && (
          <>
            <Text style={styles.presetLabel}>Gender</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Male"
                selected={recipe.gender === "male"}
                onPress={() => onUpdateGender("male")}
              />
              <Chip
                label="Female"
                selected={recipe.gender === "female"}
                onPress={() => onUpdateGender("female")}
              />
            </View>
          </>
        )}
        <Text style={styles.presetLabel}>Body type</Text>
        <View style={styles.chipRow}>
          {MODEL_PRESETS.type.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(modelPresets.type ?? "").toLowerCase() === v.toLowerCase()}
              onPress={() => updatePresets({ ...modelPresets, type: v.toLowerCase() })}
            />
          ))}
        </View>
        <Text style={styles.presetLabel}>Complexion</Text>
        <View style={styles.chipRow}>
          {MODEL_PRESETS.complexion.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(modelPresets.complexion ?? "").toLowerCase() === v.toLowerCase()}
              onPress={() => updatePresets({ ...modelPresets, complexion: v.toLowerCase() })}
            />
          ))}
        </View>
      </View>
    );
  }

  if (section === "head") {
    const headPresets = sectionData.presets as LookRecipe["sections"]["head"]["presets"];
    return (
      <View style={styles.presetBlock}>
        <Text style={styles.presetLabel}>Hat</Text>
        <View style={styles.chipRow}>
          {HEAD_PRESETS.hat.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(headPresets.hat ?? "").toLowerCase() === (v === "No hat" ? "none" : norm(v))}
              onPress={() => updatePresets({ ...headPresets, hat: v === "No hat" ? "none" : norm(v) })}
            />
          ))}
        </View>
        <Text style={styles.presetLabel}>Glasses</Text>
        <View style={styles.chipRow}>
          {HEAD_PRESETS.glasses.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(headPresets.glasses ?? "").toLowerCase() === (v === "No glasses" ? "none" : norm(v))}
              onPress={() => updatePresets({ ...headPresets, glasses: v === "No glasses" ? "none" : norm(v) })}
            />
          ))}
        </View>
        <Text style={styles.presetLabel}>Makeup</Text>
        <View style={styles.chipRow}>
          {HEAD_PRESETS.makeup.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(headPresets.makeup ?? "").toLowerCase() === norm(v)}
              onPress={() => updatePresets({ ...headPresets, makeup: norm(v) })}
            />
          ))}
        </View>
        <Text style={styles.presetLabel}>Jewelry</Text>
        <View style={styles.chipRow}>
          {HEAD_PRESETS.jewelry.map((v) => (
            <Chip
              key={v}
              label={v}
              selected={(headPresets.jewelry ?? "").toLowerCase() === (v === "None" ? "none" : v.toLowerCase())}
              onPress={() => updatePresets({ ...headPresets, jewelry: v === "None" ? "none" : v.toLowerCase() })}
            />
          ))}
        </View>
      </View>
    );
  }

  if (section === "top") {
    const topPresets = sectionData.presets as LookRecipe["sections"]["top"]["presets"];
    return (
      <View style={styles.presetBlock}>
        <Text style={styles.presetLabel}>Type</Text>
        <View style={styles.chipRow}>
          {TOP_PRESETS.type.map((v) => (
            <Chip key={v} label={v} selected={(topPresets.type ?? "").toLowerCase() === norm(v)} onPress={() => updatePresets({ ...topPresets, type: norm(v) })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Fit</Text>
        <View style={styles.chipRow}>
          {TOP_PRESETS.fit.map((v) => (
            <Chip key={v} label={v} selected={(topPresets.fit ?? "") === v.toLowerCase()} onPress={() => updatePresets({ ...topPresets, fit: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Fabric</Text>
        <View style={styles.chipRow}>
          {TOP_PRESETS.fabric.map((v) => (
            <Chip key={v} label={v} selected={(topPresets.fabric ?? "") === v.toLowerCase()} onPress={() => updatePresets({ ...topPresets, fabric: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Sleeve</Text>
        <View style={styles.chipRow}>
          {TOP_PRESETS.sleeve.map((v) => (
            <Chip key={v} label={v} selected={(topPresets.sleeve ?? "") === v.toLowerCase()} onPress={() => updatePresets({ ...topPresets, sleeve: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Color</Text>
        <ColorSwatchRow
          value={topPresets.color ?? ""}
          onSelect={(colorNameOrHex) => updatePresets({ ...topPresets, color: colorNameOrHex })}
          onRequestCustom={() =>
            setCustomColorPicker({
              initialHex: resolveColorToHex(topPresets.color),
              onSelect: (hex) => {
                updatePresets({ ...topPresets, color: hex });
                setCustomColorPicker(null);
              },
            })
          }
        />
        {customColorPicker && (
          <ColorWheelModal
            visible={!!customColorPicker}
            initialHex={customColorPicker.initialHex}
            onSelect={customColorPicker.onSelect}
            onClose={() => setCustomColorPicker(null)}
          />
        )}
      </View>
    );
  }

  if (section === "bottom") {
    const bottomPresets = sectionData.presets as LookRecipe["sections"]["bottom"]["presets"];
    return (
      <View style={styles.presetBlock}>
        <Text style={styles.presetLabel}>Type</Text>
        <View style={styles.chipRow}>
          {BOTTOM_PRESETS.type.map((v) => (
            <Chip key={v} label={v} selected={(bottomPresets.type ?? "").toLowerCase() === v.toLowerCase()} onPress={() => updatePresets({ ...bottomPresets, type: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Fit</Text>
        <View style={styles.chipRow}>
          {BOTTOM_PRESETS.fit.map((v) => (
            <Chip key={v} label={v} selected={(bottomPresets.fit ?? "").toLowerCase() === v.toLowerCase().replace("-", "")} onPress={() => updatePresets({ ...bottomPresets, fit: v.toLowerCase().replace("-", "") })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Waist</Text>
        <View style={styles.chipRow}>
          {BOTTOM_PRESETS.waist.map((v) => (
            <Chip key={v} label={v} selected={(bottomPresets.waist ?? "") === v.toLowerCase()} onPress={() => updatePresets({ ...bottomPresets, waist: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Fabric</Text>
        <View style={styles.chipRow}>
          {BOTTOM_PRESETS.fabric.map((v) => (
            <Chip key={v} label={v} selected={(bottomPresets.fabric ?? "") === v.toLowerCase()} onPress={() => updatePresets({ ...bottomPresets, fabric: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Color</Text>
        <ColorSwatchRow
          value={bottomPresets.color ?? ""}
          onSelect={(colorNameOrHex) => updatePresets({ ...bottomPresets, color: colorNameOrHex })}
          onRequestCustom={() =>
            setCustomColorPicker({
              initialHex: resolveColorToHex(bottomPresets.color),
              onSelect: (hex) => {
                updatePresets({ ...bottomPresets, color: hex });
                setCustomColorPicker(null);
              },
            })
          }
        />
        {customColorPicker && (
          <ColorWheelModal
            visible={!!customColorPicker}
            initialHex={customColorPicker.initialHex}
            onSelect={customColorPicker.onSelect}
            onClose={() => setCustomColorPicker(null)}
          />
        )}
      </View>
    );
  }

  if (section === "shoes") {
    const shoesPresets = sectionData.presets as LookRecipe["sections"]["shoes"]["presets"];
    return (
      <View style={styles.presetBlock}>
        <Text style={styles.presetLabel}>Type</Text>
        <View style={styles.chipRow}>
          {SHOES_TYPES.map((v) => (
            <Chip key={v} label={v} selected={(shoesPresets.type ?? "").toLowerCase() === v.toLowerCase()} onPress={() => updatePresets({ ...shoesPresets, type: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Color</Text>
        <ColorSwatchRow
          value={shoesPresets.color ?? ""}
          onSelect={(colorNameOrHex) => updatePresets({ ...shoesPresets, color: colorNameOrHex })}
          onRequestCustom={() =>
            setCustomColorPicker({
              initialHex: resolveColorToHex(shoesPresets.color),
              onSelect: (hex) => {
                updatePresets({ ...shoesPresets, color: hex });
                setCustomColorPicker(null);
              },
            })
          }
        />
        {customColorPicker && (
          <ColorWheelModal
            visible={!!customColorPicker}
            initialHex={customColorPicker.initialHex}
            onSelect={customColorPicker.onSelect}
            onClose={() => setCustomColorPicker(null)}
          />
        )}
        <Text style={styles.presetLabel}>Material</Text>
        <View style={styles.chipRow}>
          {SHOES_PRESETS.material.map((v) => (
            <Chip key={v} label={v} selected={(shoesPresets.material ?? "").toLowerCase() === v.toLowerCase()} onPress={() => updatePresets({ ...shoesPresets, material: v.toLowerCase() })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Detail</Text>
        <View style={styles.chipRow}>
          {SHOES_PRESETS.detail.map((v) => (
            <Chip key={v} label={v} selected={(shoesPresets.detail ?? "").toLowerCase() === v.toLowerCase()} onPress={() => updatePresets({ ...shoesPresets, detail: v.toLowerCase() })} />
          ))}
        </View>
      </View>
    );
  }

  if (section === "background") {
    const bgPresets = sectionData.presets as LookRecipe["sections"]["background"]["presets"];
    const bgSection = sectionData as LookRecipe["sections"]["background"];
    return (
      <View style={styles.presetBlock}>
        <Text style={styles.presetLabel}>Scene</Text>
        <View style={styles.chipRow}>
          {BACKGROUND_PRESETS.scene.map((v) => (
            <Chip key={v} label={v} selected={(bgPresets.scene ?? "").toLowerCase() === norm(v)} onPress={() => updatePresets({ ...bgPresets, scene: norm(v) })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Lighting</Text>
        <View style={styles.chipRow}>
          {BACKGROUND_PRESETS.lighting.map((v) => (
            <Chip key={v} label={v} selected={(bgPresets.lighting ?? "").toLowerCase() === norm(v)} onPress={() => updatePresets({ ...bgPresets, lighting: norm(v) })} />
          ))}
        </View>
        <Text style={styles.presetLabel}>Tone</Text>
        <View style={styles.chipRow}>
          {BACKGROUND_PRESETS.tone.map((v) => (
            <Chip key={v} label={v} selected={(bgPresets.tone ?? "").toLowerCase() === v.toLowerCase()} onPress={() => updatePresets({ ...bgPresets, tone: v.toLowerCase() })} />
          ))}
        </View>
        <View style={styles.sliderRow}>
          <Text style={styles.presetLabel}>Blur</Text>
          <Text style={styles.presetLabel}>{bgSection.blur}</Text>
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.presetLabel}>Keep background neutral</Text>
          <Switch
            value={bgSection.neutralBackground}
            onValueChange={(v) => onUpdateSection("background", { ...bgSection, neutralBackground: v })}
            trackColor={{ false: outfitBuilderColors.surfaceElevated, true: outfitBuilderColors.accentDim }}
            thumbColor={outfitBuilderColors.text}
          />
        </View>
      </View>
    );
  }

  return null;
}

function PromptContent({
  section,
  sectionData,
  updatePrompt,
}: {
  section: OutfitSectionKey;
  sectionData: LookRecipe["sections"][OutfitSectionKey];
  updatePrompt: (p: string) => void;
}) {
  const placeholders: Record<OutfitSectionKey, string> = {
    model: "Describe the model: build, skin tone, hair, pose, or other details…",
    head: "Describe head styling: hat type, glasses, makeup style…",
    top: "Describe the top: style, neckline, sleeve, fabric, color palette, patterns, tailoring…",
    bottom: "Describe the bottom: type, fit, length, fabric, color/pattern…",
    shoes: "Add shoe details…",
    background: "Describe the background scene…",
  };
  const prompt = "prompt" in sectionData ? String(sectionData.prompt ?? "") : "";
  return (
    <View style={styles.promptBlock}>
      <TextInput
        style={styles.promptInput}
        placeholder={placeholders[section]}
        placeholderTextColor={outfitBuilderColors.textMuted}
        value={prompt}
        onChangeText={updatePrompt}
        multiline
        numberOfLines={4}
      />
    </View>
  );
}

function ImageContent({
  section,
  sectionData,
  onUpload,
  onUpdateSection,
}: {
  section: OutfitSectionKey;
  sectionData: LookRecipe["sections"][OutfitSectionKey];
  onUpload: () => void;
  onUpdateSection: (s: OutfitSectionKey, u: Partial<LookRecipe["sections"][OutfitSectionKey]>) => void;
}) {
  const hasImageRef = "imageRef" in sectionData && sectionData.imageRef;
  const imageMode = "imageMode" in sectionData ? sectionData.imageMode : undefined;
  return (
    <View style={styles.imageBlock}>
      <Pressable onPress={onUpload} style={styles.uploadBtn}>
        <FontAwesome name="upload" size={24} color={outfitBuilderColors.text} />
        <Text style={styles.uploadText}>{hasImageRef ? "Change image" : "Upload reference image"}</Text>
      </Pressable>
      {section === "top" && (
        <View style={styles.toggleRow}>
          <Text style={styles.presetLabel}>Use style only (ignore color)</Text>
          <Switch
            value={imageMode === "style_only"}
            onValueChange={(v) => onUpdateSection(section, { ...sectionData, imageMode: v ? "style_only" : "full" } as Partial<LookRecipe["sections"]["top"]>)}
            trackColor={{ false: outfitBuilderColors.surfaceElevated, true: outfitBuilderColors.accentDim }}
            thumbColor={outfitBuilderColors.text}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: outfitBuilderColors.surface,
    borderLeftWidth: 1,
    borderLeftColor: outfitBuilderColors.border,
    flex: 1,
    minHeight: 0,
    maxWidth: PANEL_WIDTH,
  },
  panelFullWidth: {
    width: "100%",
    maxWidth: "100%",
    borderLeftWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: outfitBuilderColors.border,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
  },
  closeBtn: {
    padding: spacing[2],
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: outfitBuilderColors.border,
  },
  tab: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: outfitBuilderColors.accentDim,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
  tabTextActive: {
    color: outfitBuilderColors.text,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  contentInner: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  presetBlock: {
    marginBottom: spacing[4],
  },
  presetLabel: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    marginBottom: spacing[2],
    fontFamily: typography.fontFamily.sans,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
  },
  chipSelected: {
    borderColor: outfitBuilderColors.accent,
    backgroundColor: outfitBuilderColors.accentDim,
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
  chipTextSelected: {
    color: outfitBuilderColors.text,
  },
  colorSwatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchSelected: {
    borderColor: outfitBuilderColors.accent,
    borderWidth: 3,
  },
  colorSwatchCustom: {
    borderStyle: "dashed",
  },
  colorSwatchCustomInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorWheelOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[4],
  },
  colorWheelCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: outfitBuilderColors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
  },
  colorWheelTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.text,
    marginBottom: spacing[3],
  },
  colorWheelPreview: {
    width: "100%",
    height: 48,
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
  },
  colorWheelStrip: {
    flexDirection: "row",
    height: 24,
    borderRadius: 4,
    marginBottom: spacing[3],
    overflow: "hidden",
  },
  colorWheelSegment: {
    flex: 1,
  },
  colorWheelActions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[2],
  },
  colorWheelCancelBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  colorWheelDoneBtn: {
    flex: 1,
    backgroundColor: outfitBuilderColors.primaryButtonBg,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  promptBlock: {
    marginBottom: spacing[4],
  },
  promptInput: {
    minHeight: 120,
    padding: spacing[4],
    borderRadius: radius.lg,
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    fontSize: typography.fontSize.base,
    color: outfitBuilderColors.text,
    fontFamily: typography.fontFamily.sans,
    textAlignVertical: "top",
  },
  sliderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing[3],
  },
  imageBlock: {
    marginBottom: spacing[4],
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[6],
    borderRadius: radius.lg,
    backgroundColor: outfitBuilderColors.surfaceElevated,
    borderWidth: 1,
    borderColor: outfitBuilderColors.border,
    borderStyle: "dashed",
  },
  uploadText: {
    fontSize: typography.fontSize.base,
    color: outfitBuilderColors.text,
    fontFamily: typography.fontFamily.sans,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    paddingBottom: spacing[3],
    borderTopWidth: 1,
    borderTopColor: outfitBuilderColors.border,
    gap: spacing[3],
    flexShrink: 0,
  },
  resetBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  resetText: {
    fontSize: typography.fontSize.sm,
    color: outfitBuilderColors.textMuted,
    fontFamily: typography.fontFamily.sans,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: outfitBuilderColors.primaryButtonBg,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: outfitBuilderColors.primaryButtonText,
  },
});
