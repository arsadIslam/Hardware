import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Package,
  Plus,
  ReceiptIndianRupee,
  ScrollText,
  Store,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  fetchDashboardStats,
  type DashboardStats,
} from '../api/dashboard';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';

const PRIMARY = '#6B5CE6';
const PRIMARY_DARK = '#5B4BD6';
const GRADIENT_START = '#6A5AE0';
const GRADIENT_END = '#A06AF9';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part ?? 'there';
}

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

type StatTone = 'violet' | 'green' | 'orange' | 'blue' | 'rose' | 'red';

const ICON_COLORS: Record<StatTone, string> = {
  violet: '#7c3aed',
  green: '#16a34a',
  orange: '#ea580c',
  blue: '#2563eb',
  rose: '#db2777',
  red: '#dc2626',
};

const toneIconBg: Record<StatTone, string> = {
  violet: '#EDE9FE',
  green: '#DCFCE7',
  orange: '#FFEDD5',
  blue: '#DBEAFE',
  rose: '#FCE7F3',
  red: '#FEE2E2',
};

function HeroGradientBg(props: {
  width: number;
  height: number;
}): React.JSX.Element | null {
  if (props.width <= 0 || props.height <= 0) {
    return null;
  }
  return (
    <Svg
      width={props.width}
      height={props.height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none">
      <Defs>
        <LinearGradient id="jhHeroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={GRADIENT_START} />
          <Stop offset="100%" stopColor={GRADIENT_END} />
        </LinearGradient>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={props.width}
        height={props.height}
        rx={16}
        ry={16}
        fill="url(#jhHeroGrad)"
      />
    </Svg>
  );
}

function StatCard(props: {
  title: string;
  value: string;
  tone: StatTone;
  icon: React.ReactNode;
  actionLabel: string;
  onPressAction?: () => void;
  onPressCard?: () => void;
}): React.JSX.Element {
  const bottom = props.onPressCard ? (
    <Text style={styles.statAction}>{props.actionLabel}</Text>
  ) : (
    <TouchableOpacity
      onPress={props.onPressAction}
      activeOpacity={0.7}
      disabled={!props.onPressAction}>
      <Text
        style={[
          styles.statAction,
          !props.onPressAction && styles.statActionDisabled,
        ]}>
        {props.actionLabel}
      </Text>
    </TouchableOpacity>
  );

  const inner = (
    <>
      <View style={styles.statCardTop}>
        <View
          style={[
            styles.statIconWrap,
            { backgroundColor: toneIconBg[props.tone] },
          ]}>
          {props.icon}
        </View>
        <Text style={styles.statTitle} numberOfLines={1}>
          {props.title}
        </Text>
      </View>
      <Text style={styles.statValue}>{props.value}</Text>
      {bottom}
    </>
  );

  if (props.onPressCard) {
    return (
      <TouchableOpacity
        style={styles.statCard}
        onPress={props.onPressCard}
        activeOpacity={0.92}>
        {inner}
      </TouchableOpacity>
    );
  }

  return <View style={styles.statCard}>{inner}</View>;
}

function LinkRowCard(props: {
  title: string;
  tone: StatTone;
  icon: React.ReactNode;
  subtitle: string;
  onPress?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.linkCard}
      onPress={props.onPress}
      activeOpacity={0.85}
      disabled={!props.onPress}>
      <View
        style={[
          styles.linkIconWrap,
          { backgroundColor: toneIconBg[props.tone] },
        ]}>
        {props.icon}
      </View>
      <View style={styles.linkCardText}>
        <Text style={styles.linkCardTitle}>{props.title}</Text>
        <Text style={styles.linkCardSub}>{props.subtitle}</Text>
      </View>
      <ChevronRight size={22} color="#cbd5e1" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

export function DashboardScreen(): React.JSX.Element {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, 'Dashboard'>>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroBox, setHeroBox] = useState({ w: 0, h: 0 });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch {
      setError('Could not load dashboard. Pull to retry.');
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const displayName = user?.name ?? 'Guest';

  async function onSignOut() {
    setMenuOpen(false);
    await signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 112 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                load(true).catch(() => {});
              }}
              tintColor={PRIMARY}
              colors={[PRIMARY]}
            />
          }>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <Store color="#fff" size={26} strokeWidth={2.25} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>
                  Manage your business efficiently.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => {
                setMenuOpen(true);
              }}
              activeOpacity={0.85}>
              <Text style={styles.avatarText}>{initials(displayName)}</Text>
              <ChevronDown size={15} color="#fff" strokeWidth={2.75} />
            </TouchableOpacity>
          </View>

          <View
            style={styles.hero}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setHeroBox((prev) =>
                prev.w === width && prev.h === height
                  ? prev
                  : { w: width, h: height },
              );
            }}>
            <HeroGradientBg width={heroBox.w} height={heroBox.h} />
            <View style={styles.heroRow}>
              <View style={styles.heroLogoCircle}>
                <Store color="#fff" size={28} strokeWidth={2} />
              </View>
              <View style={styles.heroTextCol}>
                <Text style={styles.heroWelcome}>
                  Welcome, {firstName(displayName)}
                </Text>
                <Text style={styles.heroSub}>
                  {"Here's your daily overview."}
                </Text>
              </View>
            </View>
          </View>

          {loading && !stats ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : null}

          {error ? (
            <Text style={styles.bannerError}>{error}</Text>
          ) : null}

          {stats ? (
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <StatCard
                  title="Products"
                  value={String(stats.productsCount)}
                  tone="violet"
                  icon={
                    <Package
                      size={21}
                      color={ICON_COLORS.violet}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="Show Products ›"
                  onPressCard={() => {
                    navigation.navigate('Products');
                  }}
                />
                <StatCard
                  title="Sales"
                  value={String(stats.salesCount)}
                  tone="green"
                  icon={
                    <TrendingUp
                      size={21}
                      color={ICON_COLORS.green}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="View sales ›"
                />
              </View>
              <View style={styles.gridRow}>
                <StatCard
                  title="Due"
                  value={String(stats.dueCustomersCount)}
                  tone="orange"
                  icon={
                    <FileText
                      size={21}
                      color={ICON_COLORS.orange}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="Customers with due ›"
                />
                <StatCard
                  title="Payments"
                  value={String(stats.paymentsCount)}
                  tone="blue"
                  icon={
                    <Wallet
                      size={21}
                      color={ICON_COLORS.blue}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="Due collections ›"
                />
              </View>
              <View style={styles.gridRow}>
                <StatCard
                  title="Total Sales"
                  value={formatInr(stats.totalSales)}
                  tone="violet"
                  icon={
                    <BarChart3
                      size={21}
                      color={ICON_COLORS.violet}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="Sales report ›"
                />
                <StatCard
                  title="Total Due"
                  value={formatInr(stats.totalDue)}
                  tone="red"
                  icon={
                    <ReceiptIndianRupee
                      size={21}
                      color={ICON_COLORS.red}
                      strokeWidth={2.25}
                    />
                  }
                  actionLabel="Outstanding ›"
                />
              </View>
              <LinkRowCard
                title="Reports"
                tone="rose"
                icon={
                  <ScrollText
                    size={22}
                    color={ICON_COLORS.rose}
                    strokeWidth={2.25}
                  />
                }
                subtitle="List of latest transactions"
              />
              <LinkRowCard
                title="Customers"
                tone="blue"
                icon={
                  <Users
                    size={22}
                    color={ICON_COLORS.blue}
                    strokeWidth={2.25}
                  />
                }
                subtitle={`${stats.customersCount} customers · invoices & details`}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.bottomWrap}>
          <View
            style={[
              styles.tabBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}>
            <View style={styles.tabItem}>
              <Home size={24} color={PRIMARY} strokeWidth={2.35} />
              <Text style={[styles.tabLabel, styles.tabLabelActive]}>Home</Text>
            </View>
            <View style={styles.tabSpacer} />
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => {
                setMenuOpen(true);
              }}
              activeOpacity={0.85}>
              <UserRound size={24} color={TEXT_MUTED} strokeWidth={2.35} />
              <Text style={styles.tabLabel}>Profile</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.fab, { bottom: 40 + insets.bottom * 0.35 }]}
            activeOpacity={0.9}
            onPress={() => {
              navigation.navigate('CreateSale');
            }}>
            <Plus color="#fff" size={34} strokeWidth={2.75} />
            <Text style={styles.fabCap}>Create Sales</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setMenuOpen(false);
          }}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setMenuOpen(false);
            }}>
            <Pressable style={styles.menuCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.menuName}>{displayName}</Text>
              {user?.phone ? (
                <Text style={styles.menuPhone}>{user.phone}</Text>
              ) : null}
              <View style={styles.menuBrandRow}>
                <View style={styles.menuBrandIcon}>
                  <Store color={PRIMARY} size={18} strokeWidth={2.25} />
                </View>
                <Text style={styles.menuBrand}>Janani Hardware</Text>
              </View>
              <TouchableOpacity
                style={styles.menuSignOut}
                onPress={() => {
                  onSignOut().catch(() => {});
                }}
                activeOpacity={0.85}>
                <Text style={styles.menuSignOutLabel}>Sign out</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef1f7',
  },
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  logoBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 4,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  hero: {
    position: 'relative',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    backgroundColor: GRADIENT_START,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_DARK,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
  },
  heroLogoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  heroTextCol: {
    flex: 1,
  },
  heroWelcome: {
    fontSize: 21,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  bannerError: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  grid: {
    gap: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
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
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.1,
  },
  statValue: {
    fontSize: 21,
    fontWeight: '800',
    color: TEXT_MAIN,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  statAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
    letterSpacing: 0.1,
  },
  statActionDisabled: {
    color: '#94a3b8',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf1',
    gap: 12,
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
  linkCardText: {
    flex: 1,
  },
  linkCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  linkCardSub: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  tabBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 72,
    paddingBottom: 2,
    gap: 5,
  },
  tabSpacer: {
    width: 88,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  tabLabelActive: {
    color: PRIMARY,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY_DARK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabCap: {
    position: 'absolute',
    bottom: -20,
    fontSize: 11,
    fontWeight: '700',
    color: PRIMARY,
    width: 120,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 100 : 72,
    paddingHorizontal: 20,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuName: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  menuPhone: {
    marginTop: 4,
    fontSize: 14,
    color: TEXT_MUTED,
  },
  menuBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  menuBrandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBrand: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
    letterSpacing: -0.2,
  },
  menuSignOut: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
  },
  menuSignOutLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
});
