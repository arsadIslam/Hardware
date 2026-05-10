import {
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  ArrowLeft,
  ChevronRight,
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  fetchProductsPage,
  type Product,
} from '../api/products';
import type { RootStackParamList } from '../navigation/types';

const PRIMARY = '#6B5CE6';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';

function formatInr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

const rowSep = StyleSheet.create({
  gap: { height: 12 },
});

function ListRowSeparator(): React.JSX.Element {
  return <View style={rowSep.gap} />;
}

function formatQty(value: string | number, unit: string | null): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  const u = unit?.trim();
  if (u) {
    return `${Number.isNaN(n) ? value : n} ${u}`;
  }
  return String(value);
}

function ProductDetailCard({
  item,
  showChevron,
}: {
  item: Product;
  showChevron?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Package size={20} color="#7c3aed" strokeWidth={2.25} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.sku}>SKU: {item.product_id}</Text>
        </View>
        {showChevron ? (
          <ChevronRight size={22} color="#cbd5e1" strokeWidth={2.5} />
        ) : null}
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Selling price</Text>
          <Text style={styles.detailValue}>{formatInr(item.selling_price)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Buying price</Text>
          <Text style={styles.detailValueMuted}>
            {item.buying_price != null ? formatInr(item.buying_price) : '—'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Stock</Text>
          <Text style={styles.detailValue}>
            {formatQty(item.available_quantity, item.quantity_unit)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue} numberOfLines={2}>
            {item.location?.trim() ? item.location : '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function ProductsScreen(): React.JSX.Element {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => {
      clearTimeout(t);
    };
  }, [searchInput]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProductsPage({
        page: 1,
        perPage: 20,
        search: debouncedSearch,
      });
      setProducts(res.data);
      setPage(res.current_page);
      setHasMore(res.current_page < res.last_page);
    } catch {
      setError('Could not load products.');
      setProducts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadingRef.current = false;
  }, [debouncedSearch]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage().catch(() => {});
    }, [loadFirstPage]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetchProductsPage({
        page: 1,
        perPage: 20,
        search: debouncedSearch,
      });
      setProducts(res.data);
      setPage(res.current_page);
      setHasMore(res.current_page < res.last_page);
    } catch {
      setError('Could not refresh.');
    } finally {
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loading || loadingMore || !hasMore) {
      return;
    }
    loadingRef.current = true;
    setLoadingMore(true);
    setError(null);
    const nextPage = page + 1;
    try {
      const res = await fetchProductsPage({
        page: nextPage,
        perPage: 20,
        search: debouncedSearch,
      });
      setProducts((prev) => [...prev, ...res.data]);
      setPage(res.current_page);
      setHasMore(res.current_page < res.last_page);
    } catch {
      setError('Could not load more items.');
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [debouncedSearch, hasMore, loading, loadingMore, page]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          navigation.navigate('EditProduct', { productId: item.id });
        }}>
        <ProductDetailCard item={item} showChevron />
      </TouchableOpacity>
    ),
    [navigation],
  );

  const keyExtractor = useCallback((item: Product) => String(item.id), []);

  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: 24 + insets.bottom }],
    [insets.bottom],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            navigation.goBack();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.75}>
          <ArrowLeft color={TEXT_MAIN} size={24} strokeWidth={2.25} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Products</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            navigation.navigate('AddProduct');
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Add product"
          activeOpacity={0.75}>
          <Plus color={PRIMARY} size={26} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchInner}>
          <View style={styles.searchGlyph}>
            <Search size={20} color={TEXT_MUTED} strokeWidth={2.25} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, SKU, or location"
            placeholderTextColor="#94a3b8"
            value={searchInput}
            onChangeText={setSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchInput('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={TEXT_MUTED} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {error ? <Text style={styles.bannerError}>{error}</Text> : null}

      {loading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={ListRowSeparator}
          onEndReached={() => {
            loadMore().catch(() => {});
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                onRefresh().catch(() => {});
              }}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySub}>
                  Try another search or pull to refresh.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoad}>
                <ActivityIndicator color={PRIMARY} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef1f7',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#eef1f7',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.2,
  },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#eef1f7',
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 48,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchGlyph: {
    marginRight: 8,
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_MAIN,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  bannerError: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf1',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: {
    flex: 1,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.2,
  },
  sku: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  detailGrid: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_MUTED,
    flexShrink: 0,
    width: 112,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MAIN,
    textAlign: 'right',
  },
  detailValueMuted: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    paddingTop: 48,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoad: {
    paddingVertical: 20,
  },
});
