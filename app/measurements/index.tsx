import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { atelier, radius, spacing, typography } from "@/constants/theme";
import { useMeasurementProfiles } from "@/context/MeasurementProfilesContext";
import { getApiErrorMessage } from "@/services/api/auth";
import {
    mapApiProfileToStatic,
    measurementProfilesApi,
} from "@/services/api/measurement-profiles";
import type { MeasurementProfileStatic } from "@/types/measurement";
import { getRelationshipLabel } from "@/types/measurement";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: MeasurementProfileStatic;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const relationshipLabel = getRelationshipLabel(
    profile.relationship,
    profile.relationshipCustom,
  );
  const genderLabel = profile.gender === "male" ? "Male" : "Female";
  const hasBody = profile.heightCm != null || profile.weightKg != null;
  const bodyText =
    profile.heightCm != null && profile.weightKg != null
      ? `${profile.heightCm} cm · ${profile.weightKg} kg`
      : profile.heightCm != null
        ? `${profile.heightCm} cm`
        : profile.weightKg != null
          ? `${profile.weightKg} kg`
          : "—";

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [
          styles.cardInner,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <FontAwesome
              name={profile.gender === "female" ? "venus" : "mars"}
              size={22}
              color={atelier.accent}
            />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.cardMeta}>
              {relationshipLabel} · {genderLabel}
            </Text>
          </View>
          <Pressable
            onPress={onDelete}
            hitSlop={12}
            style={({ pressed }) => [
              styles.deleteIcon,
              pressed && styles.deleteIconPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Delete profile"
          >
            <FontAwesome name="trash-o" size={18} color={atelier.muted} />
          </Pressable>
        </View>
        <View style={styles.cardDetails}>
          <Text style={styles.cardDetailLabel}>Updated</Text>
          <Text style={styles.cardDetailValue}>
            {formatDate(profile.updatedAt)}
          </Text>
        </View>
        {hasBody && (
          <View style={styles.cardDetails}>
            <Text style={styles.cardDetailLabel}>Height · Weight</Text>
            <Text style={styles.cardDetailValue}>{bodyText}</Text>
          </View>
        )}
        <View style={styles.cardActions}>
          <Text style={styles.editHint}>Tap to edit</Text>
          <FontAwesome name="chevron-right" size={14} color={atelier.muted} />
        </View>
      </Pressable>
    </View>
  );
}

export default function MeasurementsListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    profiles,
    deleteProfile: removeProfileFromContext,
    setProfilesFromApi,
  } = useMeasurementProfiles();
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setApiError(null);
    setApiLoading(true);
    try {
      const res = await measurementProfilesApi.getList();
      const raw = res?.data;
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list.map(mapApiProfileToStatic);
      setProfilesFromApi(mapped);
    } catch (e) {
      setApiError(getApiErrorMessage(e));
    } finally {
      setApiLoading(false);
    }
  }, [setProfilesFromApi]);

  useFocusEffect(
    useCallback(() => {
      fetchProfiles();
    }, [fetchProfiles]),
  );

  const handleDelete = useCallback(
    (profile: MeasurementProfileStatic) => {
      Alert.alert(
        "Delete profile",
        `Remove "${profile.name}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              const profileId = Number(profile.id);
              if (!Number.isFinite(profileId)) {
                removeProfileFromContext(profile.id);
                return;
              }
              try {
                await measurementProfilesApi.deleteProfile(profileId);
                removeProfileFromContext(profile.id);
              } catch (e) {
                Alert.alert("Could not delete profile", getApiErrorMessage(e));
              }
            },
          },
        ],
      );
    },
    [removeProfileFromContext],
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push({
        pathname: "/measurements/[id]/edit",
        params: { id },
      } as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: MeasurementProfileStatic }) => (
      <ProfileCard
        profile={item}
        onEdit={() => handleEdit(item.id)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [handleEdit, handleDelete],
  );

  if (apiLoading && profiles.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + spacing[8] },
        ]}
      >
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (apiError && profiles.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + spacing[8] },
        ]}
      >
        <Text style={styles.errorText}>{apiError}</Text>
        <Pressable
          onPress={() => fetchProfiles()}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && styles.retryBtnPressed,
          ]}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PageHeader
        onBack={() => router.back()}
        title="Measurement profiles"
        rightSlot={
          <Pressable
            onPress={() => router.push("/measurements/create")}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <FontAwesome name="plus" size={16} color={atelier.accent} />
            <Text style={styles.headerActionText}>Add</Text>
          </Pressable>
        }
      />
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={apiLoading}
            onRefresh={fetchProfiles}
            tintColor={atelier.accent}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: insets.bottom + spacing[8],
            paddingHorizontal: spacing[6],
            paddingTop: spacing[4],
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <FontAwesome name="clipboard" size={40} color={atelier.muted} />
            </View>
            <Text style={styles.emptyTitle}>No profiles yet</Text>
            <Text style={styles.emptySubtext}>
              Add a measurement profile to get started. You can add name,
              gender, photos, and measurements.
            </Text>
            <Button
              title="Add your first profile"
              onPress={() => router.push("/measurements/create")}
              variant="outline"
              fullWidth
              style={styles.emptyBtn}
              textStyle={{ color: atelier.cta }}
            />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    minHeight: 44,
    justifyContent: "center",
  },
  headerActionPressed: { opacity: 0.8 },
  headerActionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  retryBtn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderWidth: 1,
    borderColor: atelier.divider,
    borderRadius: radius.lg,
  },
  retryBtnPressed: { opacity: 0.9 },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  listContent: {},
  card: {
    marginBottom: spacing[4],
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    overflow: "hidden",
  },
  cardInner: { padding: spacing[5] },
  cardPressed: { opacity: 0.97 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: atelier.panelBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[4],
  },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  cardName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  cardMeta: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[1],
  },
  deleteIcon: { padding: spacing[2] },
  deleteIconPressed: { opacity: 0.7 },
  cardDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: atelier.divider,
  },
  cardDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  cardDetailValue: {
    fontSize: typography.fontSize.sm,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: atelier.divider,
  },
  editHint: {
    fontSize: typography.fontSize.xs,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginRight: spacing[2],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  empty: {
    paddingVertical: spacing[16],
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: atelier.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[2],
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[6],
  },
  emptyBtn: {
    borderColor: atelier.divider,
    maxWidth: 280,
  },
});
