import {
  atelier,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { clothesApi } from "@/services/api";
import type { FeedItem } from "@/types/feed";
import { wearToFeedItem } from "@/types/feed";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLS = 2;
const GAP = spacing[2];
const PAD_H = spacing[4];
const CARD_WIDTH = (SCREEN_WIDTH - PAD_H * 2 - GAP) / COLS;
const CARD_ASPECT = 3 / 4;

function filterByQuery(items: FeedItem[], q: string): FeedItem[] {
  const lower = q.toLowerCase().trim();
  if (!lower) return items;
  return items.filter(
    (item) =>
      item.outfitName?.toLowerCase().includes(lower) ||
      item.description?.toLowerCase().includes(lower) ||
      item.creatorName?.toLowerCase().includes(lower) ||
      item.tags?.some((t) => t.toLowerCase().includes(lower)),
  );
}

export default function SearchResultsScreen() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = (q ?? "").trim();

  const fetchResults = useCallback(async () => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      try {
        const res = await clothesApi.search(query);
        const list = (res.data || []).map(wearToFeedItem);
        setResults(list);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 404 || e.status === 400)) {
          const listRes = await clothesApi.getList();
          const all = (listRes.data || []).map(wearToFeedItem);
          setResults(filterByQuery(all, query));
        } else {
          throw e;
        }
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Failed to load search results.";
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const onItemPress = useCallback(
    (item: FeedItem) => {
      router.push(`/feed/${item.id}`);
    },
    [router],
  );

  if (loading && results.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.centerText}>Searching…</Text>
      </View>
    );
  }

  if (error && results.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
        >
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerBack, pressed && styles.pressed]}
          hitSlop={12}
        >
          <FontAwesome name="chevron-left" size={22} color={atelier.cta} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {query ? `"${query}"` : "Search"}
        </Text>
        <View style={styles.headerBack} />
      </View>
      {results.length === 0 ? (
        <View style={styles.empty}>
          <FontAwesome name="search" size={48} color={atelier.muted} />
          <Text style={styles.emptyText}>No results for "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          numColumns={COLS}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + spacing[6] },
          ]}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onItemPress(item)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.pressed,
              ]}
            >
              <Image
                source={{ uri: item.imageUri }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardOverlay} />
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.outfitName}
              </Text>
            </Pressable>
          )}
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
  pressed: { opacity: 0.85 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: atelier.background,
  },
  centerText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    paddingHorizontal: spacing[6],
  },
  backBtn: {
    marginTop: spacing[4],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  backBtnText: {
    fontSize: typography.fontSize.base,
    color: atelier.accent,
    fontFamily: typography.fontFamily.semibold,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: atelier.divider,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.semibold,
    color: atelier.cta,
    textAlign: "center",
  },
  gridContent: {
    paddingHorizontal: PAD_H,
    paddingTop: spacing[4],
  },
  gridRow: {
    gap: GAP,
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: atelier.panel,
  },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH / CARD_ASPECT,
    backgroundColor: atelier.panelBorder,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  cardTitle: {
    position: "absolute",
    left: spacing[2],
    right: spacing[2],
    bottom: spacing[2],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
  },
  emptyText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
  },
});
