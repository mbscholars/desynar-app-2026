import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '@/services/api';
import type { Order } from '@/services/api';
import { ApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, typography } from '@/constants/theme';

function OrderCard({
  order,
  onPress,
}: {
  order: Order;
  onPress: () => void;
}) {
  const preview = order.meta?.outfit_preview;
  const name = order.meta?.outfit_name || 'Order';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardThumb}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbPlaceholderText}>—</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.cardRef}>{order.reference}</Text>
        <View style={styles.statusWrap}>
          <Text style={[styles.status, { color: colors.primary[500] }]}>
            {order.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated) {
      setOrders([]);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await ordersApi.getList({ per_page: 20 });
      setOrders(res.data || []);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setOrders([]);
        setError('Please log in to see your orders.');
      } else {
        const message =
          e instanceof ApiError ? e.message : 'Failed to load orders.';
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Your Orders</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Log in to view your orders.</Text>
        </View>
      </View>
    );
  }

  if (loading && orders.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading your orders...</Text>
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={() => fetchOrders()}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Your Orders</Text>
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Your wardrobe awaits.</Text>
          <Text style={styles.emptySubtext}>Create your first order from the shop.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.reference}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => {}} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
    paddingHorizontal: spacing[6],
  },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.gray[900],
    fontFamily: typography.fontFamily.sans,
    marginBottom: spacing[4],
  },
  loadingText: {
    marginTop: spacing[4],
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.sans,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
    textAlign: 'center',
    fontFamily: typography.fontFamily.sans,
  },
  retryBtn: {
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.primary[500],
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.sans,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.gray[600],
    fontFamily: typography.fontFamily.sans,
  },
  emptySubtext: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    fontFamily: typography.fontFamily.sans,
  },
  listContent: { paddingBottom: spacing[8] },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[3],
    alignItems: 'center',
  },
  cardPressed: { opacity: 0.9 },
  cardThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.gray[200],
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: { fontSize: 24, color: colors.gray[400] },
  cardBody: { flex: 1, marginLeft: spacing[4] },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.gray[900],
    fontFamily: typography.fontFamily.sans,
  },
  cardRef: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginTop: 2,
    fontFamily: typography.fontFamily.sans,
  },
  statusWrap: { marginTop: spacing[2] },
  status: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.sans,
    textTransform: 'capitalize',
  },
});
