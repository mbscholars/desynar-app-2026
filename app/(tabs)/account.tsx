import {
  atelier,
  colors,
  radius,
  spacing,
  typography,
} from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import {
  deleteAccount,
  getApiErrorMessage,
  getProfile,
  type UserProfile,
} from "@/services/api";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";

function formatDateJoined(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(profile: UserProfile | null): string {
  if (!profile) return "?";
  const first = (profile.first_name ?? profile.name ?? "").trim().charAt(0);
  const last = (profile.last_name ?? "").trim().charAt(0);
  if (first && last) return `${first}${last}`.toUpperCase();
  if (profile.name) return profile.name.trim().slice(0, 2).toUpperCase();
  if (profile.email) return profile.email.slice(0, 2).toUpperCase();
  return "?";
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getProfile();
      setProfile(data ?? null);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.replace("/login");
    } catch (e) {
      Alert.alert("Error", getApiErrorMessage(e));
    } finally {
      setLogoutLoading(false);
    }
  }, [logout, router]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account",
      "Are you sure you want to permanently delete your account? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await deleteAccount();
              await logout();
              router.replace("/login");
            } catch (e) {
              Alert.alert("Error", getApiErrorMessage(e));
            } finally {
              setDeleteLoading(false);
            }
          },
        },
      ]
    );
  }, [logout, router]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing[4] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
        </View>
        <View style={styles.empty}>
          <FontAwesome name="user" size={40} color={atelier.muted} />
          <Text style={styles.emptyText}>Sign in to view your account.</Text>
          <Button
            title="Sign in"
            onPress={() => router.replace("/login")}
            variant="primary"
            style={styles.signInBtn}
          />
        </View>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { paddingTop: insets.top + spacing[4] },
        ]}
      >
        <ActivityIndicator size="large" color={atelier.accent} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const displayName =
    profile?.name?.trim() ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    "—";
  const email = profile?.email ?? "—";
  const phone = profile?.phone?.trim() || "—";
  const joined = formatDateJoined(profile?.created_at ?? undefined);
  const avatarUri = profile?.avatar?.trim() || null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + spacing[4], paddingBottom: insets.bottom + spacing[8] },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchProfile(true)}
          tintColor={atelier.accent}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => fetchProfile(true)}
            style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              accessibilityLabel="Profile picture"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials(profile)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.displayName}>{displayName}</Text>

        <View style={styles.row}>
          <FontAwesome name="envelope" size={16} color={atelier.muted} style={styles.rowIcon} />
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{email}</Text>
        </View>
        <View style={styles.row}>
          <FontAwesome name="phone" size={16} color={atelier.muted} style={styles.rowIcon} />
          <Text style={styles.rowLabel}>Phone</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{phone}</Text>
        </View>
        <View style={styles.row}>
          <FontAwesome name="calendar" size={16} color={atelier.muted} style={styles.rowIcon} />
          <Text style={styles.rowLabel}>Date joined</Text>
          <Text style={styles.rowValue}>{joined}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title={logoutLoading ? "Signing out…" : "Log out"}
          onPress={handleLogout}
          variant="outline"
          fullWidth
          disabled={logoutLoading || deleteLoading}
          style={[styles.logoutBtn, { borderColor: atelier.divider }]}
          textStyle={{ color: atelier.cta }}
        />
        {/* <Pressable
          onPress={handleDeleteAccount}
          disabled={logoutLoading || deleteLoading}
          style={({ pressed }) => [
            styles.deleteBtn,
            (logoutLoading || deleteLoading) && styles.deleteBtnDisabled,
            pressed && styles.deleteBtnPressed,
          ]}
        >
          <Text style={styles.deleteBtnText}>
            {deleteLoading ? "Deleting…" : "Delete account"}
          </Text>
        </Pressable> */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: atelier.background,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.medium,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  loadingText: {
    marginTop: spacing[6],
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  errorBanner: {
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: atelier.panel,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.danger[500],
    fontFamily: typography.fontFamily.sans,
  },
  retryBtn: {
    marginTop: spacing[2],
    alignSelf: "flex-start",
  },
  retryBtnPressed: { opacity: 0.9 },
  retryBtnText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: atelier.accent,
    fontFamily: typography.fontFamily.sans,
  },
  card: {
    backgroundColor: atelier.panel,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: atelier.panelBorder,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: spacing[4],
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: atelier.panelBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.semibold,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
  },
  displayName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
    textAlign: "center",
    marginBottom: spacing[6],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: atelier.divider,
  },
  rowIcon: {
    marginRight: spacing[3],
  },
  rowLabel: {
    fontSize: typography.fontSize.sm,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    width: 100,
  },
  rowValue: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: atelier.cta,
    fontFamily: typography.fontFamily.sans,
  },
  actions: {
    gap: spacing[4],
  },
  logoutBtn: {
    marginBottom: 0,
  },
  deleteBtn: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger[500],
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteBtnPressed: { opacity: 0.9 },
  deleteBtnText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.danger[500],
    fontFamily: typography.fontFamily.sans,
  },
  empty: {
    paddingVertical: spacing[16],
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: atelier.muted,
    fontFamily: typography.fontFamily.sans,
    marginTop: spacing[4],
    marginBottom: spacing[6],
  },
  signInBtn: {
    minWidth: 160,
  },
});
