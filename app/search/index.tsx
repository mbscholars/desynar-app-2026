import {
  colors,
  radius,
  spacing,
  typography,
  atelier,
} from "@/constants/theme";
import { searchApi } from "@/services/api";
import type { SearchSuggestion } from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_SEARCHES_KEY = "desynar_search_recent";
const MAX_RECENT = 20;
const RECENT_VISIBLE = 5;

async function loadRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveRecentSearches(terms: string[]): Promise<void> {
  await AsyncStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(terms.slice(0, MAX_RECENT)),
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [recentLoaded, setRecentLoaded] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestionsRefreshing, setSuggestionsRefreshing] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const list = await searchApi.getSuggestions({ limit: 15 });
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      // Keep previous list on error (per backend doc)
    } finally {
      setSuggestionsLoading(false);
      setSuggestionsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const loadRecent = useCallback(async () => {
    const list = await loadRecentSearches();
    setRecent(list);
    setRecentLoaded(true);
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const addToRecent = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(
        0,
        MAX_RECENT,
      );
      saveRecentSearches(next).catch(() => {});
      return next;
    });
  }, []);

  const removeRecent = useCallback(async (term: string) => {
    setRecent((prev) => {
      const next = prev.filter((t) => t !== term);
      saveRecentSearches(next).catch(() => {});
      return next;
    });
  }, []);

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    const q = query.trim();
    if (q) {
      addToRecent(q);
      router.push(`/search/results?q=${encodeURIComponent(q)}`);
    }
  }, [query, addToRecent, router]);

  const handleSuggestionPress = useCallback(
    (text: string) => {
      setQuery(text);
      addToRecent(text);
      router.push(`/search/results?q=${encodeURIComponent(text)}`);
    },
    [addToRecent, router],
  );

  const handleRefreshSuggestions = useCallback(async () => {
    setSuggestionsRefreshing(true);
    await fetchSuggestions();
  }, [fetchSuggestions]);

  const visibleRecent = showAllRecent
    ? recent
    : recent.slice(0, RECENT_VISIBLE);
  const hasMoreRecent = recent.length > RECENT_VISIBLE;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header: back, search bar, Search button — TikTok-like dark */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
        </Pressable>
        <View style={styles.searchInputWrap}>
          <FontAwesome
            name="search"
            size={16}
            color={atelier.muted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={atelier.muted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
           
        </View>
        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [
            styles.searchBtn,
            pressed && styles.searchBtnPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing[6] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Recent searches */}
        {recentLoaded && recent.length > 0 && (
          <View style={styles.section}>
            {visibleRecent.map((term) => (
              <View key={term} style={styles.recentRow}>
                <FontAwesome
                  name="clock-o"
                  size={16}
                  color={atelier.muted}
                  style={styles.recentIcon}
                />
                <Pressable
                  onPress={() => {
                    setQuery(term);
                    handleSearch();
                  }}
                  style={({ pressed }) => [
                    styles.recentTextWrap,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.recentText} numberOfLines={1}>
                    {term}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => removeRecent(term)}
                  style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                  hitSlop={12}
                  accessibilityLabel={`Remove ${term} from history`}
                >
                  <FontAwesome name="times" size={16} color={atelier.muted} />
                </Pressable>
              </View>
            ))}
            {hasMoreRecent && !showAllRecent && (
              <Pressable
                onPress={() => setShowAllRecent(true)}
                style={({ pressed }) => [
                  styles.seeMoreWrap,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.seeMoreText}>See more</Text>
                <FontAwesome
                  name="chevron-down"
                  size={12}
                  color={atelier.muted}
                  style={styles.seeMoreChevron}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* You may like */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>You may like</Text>
            <Pressable
              onPress={handleRefreshSuggestions}
              disabled={suggestionsRefreshing}
              style={({ pressed }) => [
                styles.refreshWrap,
                pressed && !suggestionsRefreshing && styles.pressed,
              ]}
            >
              {suggestionsRefreshing ? (
                <ActivityIndicator size="small" color={atelier.accent} />
              ) : (
                <FontAwesome
                  name="refresh"
                  size={14}
                  color={atelier.accent}
                  style={styles.refreshIcon}
                />
              )}
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>
          {suggestionsLoading && suggestions.length === 0 ? (
            <View style={styles.suggestionsLoadingWrap}>
              <ActivityIndicator size="small" color={atelier.accent} />
              <Text style={styles.suggestionsLoadingText}>Loading…</Text>
            </View>
          ) : (
            suggestions.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleSuggestionPress(item.text)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.bullet,
                    item.highlighted && styles.bulletHighlighted,
                  ]}
                />
                <Text
                  style={[
                    styles.suggestionText,
                    item.highlighted && styles.suggestionTextHighlighted,
                  ]}
                  numberOfLines={1}
                >
                  {item.text}
                </Text>
              </Pressable>
            ))
          )}
        </View>

        {/* Can't find it? Make it now — link to generate outfit */}
        <View style={styles.makeItSection}>
          <Text style={styles.makeItLabel}>Can't find it? </Text>
          <Pressable
            onPress={() => router.push("/outfit-builder")}
            style={({ pressed }) => [
              styles.makeItLink,
              pressed && styles.pressed,
            ]}
            accessibilityRole="link"
            accessibilityLabel="Make it now, go to generate outfit"
          >
            <Text style={styles.makeItLinkText}>Make it now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: atelier.divider,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: atelier.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    minHeight: 44,
  },
  searchIcon: {
    marginLeft: spacing[3],
  },
  searchInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: spacing[2],
    paddingRight: spacing[1],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
  },
  micBtn: {
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtn: {
    backgroundColor: atelier.accent,
    borderWidth: 1,
    borderColor: atelier.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnPressed: {
    opacity: 0.9,
  },
  searchBtnText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  section: { marginBottom: spacing[6] },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: atelier.cta,
  },
  refreshWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  refreshIcon: { marginRight: spacing[1] },
  refreshText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.accent,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: atelier.divider,
  },
  recentIcon: {
    marginRight: spacing[3],
  },
  recentTextWrap: { flex: 1, justifyContent: "center", minHeight: 44 },
  recentText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
  },
  removeBtn: {
    padding: spacing[2],
  },
  seeMoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[2],
    marginTop: spacing[1],
  },
  seeMoreText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
    marginRight: spacing[1],
  },
  seeMoreChevron: {},
  suggestionsLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  suggestionsLoadingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[2],
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: atelier.muted,
    marginRight: spacing[3],
  },
  bulletHighlighted: {
    backgroundColor: colors.danger[500],
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.sans,
    color: atelier.cta,
  },
  suggestionTextHighlighted: {
    color: colors.danger[500],
    fontFamily: typography.fontFamily.semibold,
  },
  makeItSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    paddingVertical: spacing[6],
    marginTop: spacing[2],
  },
  makeItLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: atelier.muted,
  },
  makeItLink: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },
  makeItLinkText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.accent,
  },
});
