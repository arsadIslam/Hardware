import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  CalendarClock,
  FileText,
  IndianRupee,
  Minus,
  Package,
  Phone,
  Plus,
  ScanLine,
  Search,
  Trash2,
  User,
  Wallet,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  searchCustomers,
  type Customer,
} from '../api/customers';
import {
  fetchProductsPage,
  type Product,
} from '../api/products';
import {
  createSale,
  getSaleErrorMessage,
  type CreateSalePayload,
} from '../api/sales';
import type { RootStackParamList } from '../navigation/types';

const PRIMARY = '#6B5CE6';
const PRIMARY_SOFT = '#ede9fe';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';
const GREEN = '#16a34a';
const GREEN_BG = '#ecfdf5';
const RED = '#dc2626';

type PaymentKey = CreateSalePayload['payment_mode'];

type DraftLine = {
  key: string;
  product_id: number;
  name: string;
  sku: string;
  quantity: string;
  unit_price: string;
  line_discount: string;
};

function lineKey(): string {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

function lineAmount(qty: number, unitPrice: number, lineDiscount: number): number {
  const gross = qty * unitPrice;
  return Math.max(0, roundMoney(gross - lineDiscount));
}

function effectiveUnitPrice(
  qty: number,
  unitPrice: number,
  lineDiscount: number,
): number {
  if (qty <= 0) {
    return 0;
  }
  return roundMoney(lineAmount(qty, unitPrice, lineDiscount) / qty);
}

function invoiceDiscountAmt(
  subtotal: number,
  type: 'percent' | 'fixed',
  raw: number,
): number {
  if (raw <= 0 || subtotal <= 0) {
    return 0;
  }
  if (type === 'percent') {
    const pct = Math.min(raw, 100);
    return roundMoney(subtotal * (pct / 100));
  }
  return roundMoney(Math.min(raw, subtotal));
}

function SectionTitle(props: {
  icon: React.ReactNode;
  title: string;
  compact?: boolean;
}): React.JSX.Element {
  return (
    <View
      style={[secStyles.titleRow, props.compact && secStyles.titleRowCompact]}>
      {props.icon}
      <Text
        style={[
          secStyles.titleText,
          props.compact && secStyles.titleTextCompact,
        ]}>
        {props.title}
      </Text>
    </View>
  );
}

const secStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  titleRowCompact: {
    marginBottom: 6,
    gap: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
    letterSpacing: -0.2,
  },
  titleTextCompact: {
    fontSize: 15,
  },
});

function Card(props: {
  children: React.ReactNode;
  style?: object | undefined;
}): React.JSX.Element {
  return <View style={[cardStyles.wrap, props.style]}>{props.children}</View>;
}

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf1',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
});

export function CreateSaleScreen(): React.JSX.Element {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const narrow = width < 720;
  const productSearchRef = useRef<TextInput>(null);

  const [nowLabel, setNowLabel] = useState(() => formatInvoiceMetaDate(new Date()));

  useEffect(() => {
    const t = setInterval(() => {
      setNowLabel(formatInvoiceMetaDate(new Date()));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [productQuery, setProductQuery] = useState('');
  const [productHits, setProductHits] = useState<Product[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  const [lines, setLines] = useState<DraftLine[]>([]);

  const [paymentMode, setPaymentMode] = useState<PaymentKey>('cash');
  const [invDiscountType, setInvDiscountType] = useState<'percent' | 'fixed'>(
    'fixed',
  );
  const [invDiscountVal, setInvDiscountVal] = useState('');

  const [paidInput, setPaidInput] = useState('');
  const [notes, setNotes] = useState('');
  const [printInvoice, setPrintInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setCustomerSearchLoading(true);
      searchCustomers({ search: q, perPage: 15 })
        .then((res) => {
          if (!cancelled) {
            setCustomerHits(res.data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCustomerHits([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setCustomerSearchLoading(false);
          }
        });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery]);

  useEffect(() => {
    const q = productQuery.trim();
    if (q.length < 1) {
      setProductHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setProductSearchLoading(true);
      fetchProductsPage({ page: 1, perPage: 25, search: q })
        .then((res) => {
          if (!cancelled) {
            setProductHits(res.data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setProductHits([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setProductSearchLoading(false);
          }
        });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productQuery]);

  const subtotalLines = useMemo(() => {
    let sum = 0;
    for (const line of lines) {
      const q = parseNum(line.quantity);
      const up = parseNum(line.unit_price);
      const ld = parseNum(line.line_discount);
      sum += lineAmount(q, up, ld);
    }
    return roundMoney(sum);
  }, [lines]);

  const invoiceDiscountAmount = useMemo(() => {
    const raw = parseNum(invDiscountVal);
    if (raw <= 0) {
      return 0;
    }
    return invoiceDiscountAmt(subtotalLines, invDiscountType, raw);
  }, [subtotalLines, invDiscountType, invDiscountVal]);

  const grandTotal = useMemo(
    () => Math.max(0, roundMoney(subtotalLines - invoiceDiscountAmount)),
    [subtotalLines, invoiceDiscountAmount],
  );

  useEffect(() => {
    if (paymentMode === 'cash' || paymentMode === 'upi') {
      setPaidInput(String(grandTotal));
    }
    if (paymentMode === 'partial') {
      setPaidInput('');
    }
    if (paymentMode === 'due') {
      setPaidInput('0');
    }
  }, [grandTotal, paymentMode]);

  function clearCustomerSelection(): void {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerQuery('');
    setCustomerHits([]);
  }

  function addProductLine(p: Product): void {
    const selling =
      typeof p.selling_price === 'string'
        ? p.selling_price
        : String(p.selling_price);
    setLines((prev) => [
      ...prev,
      {
        key: lineKey(),
        product_id: p.id,
        name: p.name,
        sku: p.product_id,
        quantity: '1',
        unit_price: selling,
        line_discount: '',
      },
    ]);
    setProductQuery('');
    setProductHits([]);
  }

  function updateLine(key: string, patch: Partial<DraftLine>): void {
    setLines((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeLine(key: string): void {
    setLines((prev) => prev.filter((r) => r.key !== key));
  }

  function bumpQty(key: string, delta: number): void {
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) {
          return row;
        }
        const q = parseNum(row.quantity);
        const next = Math.max(0.001, roundMoney(q + delta));
        return { ...row, quantity: String(next) };
      }),
    );
  }

  const paidNum = parseNum(paidInput);
  const changeDue =
    paymentMode === 'cash' || paymentMode === 'upi'
      ? Math.max(0, roundMoney(paidNum - grandTotal))
      : 0;

  async function onSubmit(): Promise<void> {
    setError(null);

    if (lines.length === 0) {
      setError('Add at least one product.');
      return;
    }

    const built: CreateSalePayload['lines'] = [];
    for (const line of lines) {
      const q = parseNum(line.quantity);
      const up = parseNum(line.unit_price);
      const ld = parseNum(line.line_discount);
      if (q <= 0) {
        setError('Each line needs a valid quantity.');
        return;
      }
      if (up < 0) {
        setError('Unit price cannot be negative.');
        return;
      }
      const eff = effectiveUnitPrice(q, up, ld);
      built.push({
        product_id: line.product_id,
        quantity: q,
        unit_price: eff,
      });
    }

    const cn = customerName.trim();
    const cp = customerPhone.trim();
    if ((cn && !cp) || (!cn && cp)) {
      setError('Enter both customer name and phone, or clear both.');
      return;
    }

    const needsCustomer =
      paymentMode === 'partial' || paymentMode === 'due';
    if (needsCustomer && !selectedCustomerId && (!cn || !cp)) {
      setError('Select or enter a customer for partial payment or credit.');
      return;
    }

    if (
      (paymentMode === 'cash' || paymentMode === 'upi') &&
      cn &&
      cp &&
      !selectedCustomerId
    ) {
      /* optional walk-in customer — ok */
    }

    const payload: CreateSalePayload = {
      lines: built,
      payment_mode: paymentMode,
      notes: notes.trim() || null,
    };

    if (selectedCustomerId != null) {
      payload.customer_id = selectedCustomerId;
    } else if (cn && cp) {
      payload.customer = {
        name: cn,
        phone: cp,
        address: customerAddress.trim() || null,
      };
    }

    const idRaw = parseNum(invDiscountVal);
    if (idRaw > 0) {
      payload.discount_type = invDiscountType;
      payload.discount_value =
        invDiscountType === 'percent'
          ? Math.min(idRaw, 100)
          : Math.min(idRaw, subtotalLines);
    }

    if (paymentMode === 'partial') {
      if (paidNum <= 0 || paidNum >= grandTotal) {
        setError(
          'Partial payment: enter amount received greater than zero and less than total.',
        );
        return;
      }
      payload.amount_paid = paidNum;
    }

    if (paymentMode === 'cash' || paymentMode === 'upi') {
      if (paidNum < grandTotal) {
        setError('Amount received must be at least the total for cash / UPI.');
        return;
      }
      /* Omit amount_paid — API treats cash/UPI as full payment of invoice total. */
    }

    setSubmitting(true);
    try {
      const res = await createSale(payload);
      const invNo = res.invoice.invoice_number ?? `#${res.invoice.id}`;
      const printNote = printInvoice ? '\n(Printing can be wired later.)' : '';
      Alert.alert('Sale recorded', `${res.message}\n${invNo}${printNote}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setError(getSaleErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Create sale</Text>
          <View style={styles.toolbarSpacer} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.bannerError}>{error}</Text> : null}

          <Card>
            <SectionTitle
              icon={<User size={20} color={PRIMARY} strokeWidth={2.25} />}
              title="Customer details"
            />
            <View style={styles.customerSearchRow}>
              <View style={styles.searchField}>
                <Search size={18} color={TEXT_MUTED} strokeWidth={2.25} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search customer by name or mobile"
                  placeholderTextColor="#94a3b8"
                  value={customerQuery}
                  onChangeText={(t) => {
                    setCustomerQuery(t);
                    setSelectedCustomerId(null);
                  }}
                />
                {customerSearchLoading ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.addCustBtn}
                onPress={clearCustomerSelection}
                accessibilityLabel="New customer">
                <Plus color="#fff" size={22} strokeWidth={2.75} />
              </TouchableOpacity>
            </View>
            {customerHits.length > 0 && customerQuery.trim().length >= 2 ? (
              <View style={styles.drop}>
                {customerHits.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.id}
                    style={styles.dropRow}
                    onPress={() => {
                      setSelectedCustomerId(c.id);
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone);
                      setCustomerAddress(c.address ?? '');
                      setCustomerQuery('');
                      setCustomerHits([]);
                    }}>
                    <Text style={styles.dropName}>{c.name}</Text>
                    <Text style={styles.dropMeta}>{c.phone}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <View style={styles.inputIconRow}>
                  <Phone size={18} color={TEXT_MUTED} strokeWidth={2.25} />
                  <TextInput
                    style={styles.inputFlex}
                    placeholder="Mobile number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={customerPhone}
                    onChangeText={(t) => {
                      setCustomerPhone(t);
                      setSelectedCustomerId(null);
                    }}
                  />
                </View>
              </View>
              <View style={styles.col}>
                <View style={styles.inputIconRow}>
                  <User size={18} color={TEXT_MUTED} strokeWidth={2.25} />
                  <TextInput
                    style={styles.inputFlex}
                    placeholder="Customer name"
                    placeholderTextColor="#94a3b8"
                    value={customerName}
                    onChangeText={(t) => {
                      setCustomerName(t);
                      setSelectedCustomerId(null);
                    }}
                  />
                </View>
              </View>
            </View>
            {selectedCustomerId ? (
              <Text style={styles.linkedHint}>Linked to saved customer.</Text>
            ) : null}
          </Card>

          <View style={[styles.splitRow, narrow && styles.splitCol]}>
            <Card style={!narrow ? styles.splitCard : undefined}>
              <SectionTitle
                icon={<Wallet size={20} color={PRIMARY} strokeWidth={2.25} />}
                title="Payment method"
              />
              <View style={styles.payGrid}>
                {(
                  [
                    { mode: 'cash' as const, label: 'Cash' },
                    { mode: 'upi' as const, label: 'UPI' },
                    { mode: 'partial' as const, label: 'Partial' },
                    { mode: 'due' as const, label: 'Credit' },
                  ] as const
                ).map((row) => {
                  const on = paymentMode === row.mode;
                  const cashSel = row.mode === 'cash' && on;
                  const purpleSel = on && row.mode !== 'cash';
                  return (
                    <TouchableOpacity
                      key={row.mode}
                      style={[
                        styles.payChip,
                        cashSel && styles.payChipCashOn,
                        purpleSel && styles.payChipOn,
                      ]}
                      onPress={() => setPaymentMode(row.mode)}>
                      <Text
                        style={[
                          styles.payChipTxt,
                          cashSel && styles.payChipTxtCash,
                          purpleSel && styles.payChipTxtOn,
                        ]}>
                        {row.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>

            <Card style={!narrow ? styles.splitCard : undefined}>
              <SectionTitle
                icon={<FileText size={20} color={PRIMARY} strokeWidth={2.25} />}
                title="Invoice"
              />
              <View style={styles.invMeta}>
                <Text style={styles.invLabel}>Invoice no.</Text>
                <Text style={styles.invValue}>Assigned on save</Text>
              </View>
              <View style={styles.invRow}>
                <CalendarClock
                  size={18}
                  color={TEXT_MUTED}
                  strokeWidth={2.25}
                />
                <Text style={styles.invDate}>{nowLabel}</Text>
              </View>
            </Card>
          </View>

          <Card style={styles.productsCard}>
            <SectionTitle
              compact
              icon={<Package size={18} color={PRIMARY} strokeWidth={2.25} />}
              title="Add products"
            />
            <View style={styles.productSearchRow}>
              <Search size={16} color={TEXT_MUTED} strokeWidth={2.25} />
              <TextInput
                ref={productSearchRef}
                style={styles.productSearchInput}
                placeholder="Search product by name or SKU"
                placeholderTextColor="#94a3b8"
                value={productQuery}
                onChangeText={setProductQuery}
                returnKeyType="search"
              />
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Barcode',
                    'Camera barcode scanning can be added later.',
                  )
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <ScanLine size={20} color={PRIMARY} strokeWidth={2.25} />
              </TouchableOpacity>
            </View>
            {productHits.length > 0 && productQuery.trim().length >= 1 ? (
              <View
                style={[
                  styles.drop,
                  styles.dropProduct,
                  narrow && styles.dropMob,
                ]}>
                {productHits.slice(0, 8).map((p) => (
                  <Pressable
                    key={p.id}
                    style={styles.dropRow}
                    onPress={() => addProductLine(p)}>
                    <Text style={styles.dropName}>{p.name}</Text>
                    <Text style={styles.dropMeta}>
                      {p.product_id} · {formatInr(parseNum(String(p.selling_price)))}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {productSearchLoading ? (
              <ActivityIndicator color={PRIMARY} style={styles.prodLoader} />
            ) : null}

            {lines.length === 0 ? (
              <Text style={styles.emptyLines}>
                Search above to add products to this sale.
              </Text>
            ) : narrow ? (
              <View style={styles.mobLinesWrap}>
                {lines.map((line, idx) => {
                  const q = parseNum(line.quantity);
                  const up = parseNum(line.unit_price);
                  const ld = parseNum(line.line_discount);
                  const amt = lineAmount(q, up, ld);
                  return (
                    <View key={line.key} style={styles.lineCardMob}>
                      <View style={styles.lineCardMobHead}>
                        <View style={styles.lineBadgeMob}>
                          <Text style={styles.lineBadgeMobTxt}>{idx + 1}</Text>
                        </View>
                        <View style={styles.lineCardMobTitle}>
                          <Text style={styles.pNameMob} numberOfLines={2}>
                            {line.name}
                          </Text>
                          <Text style={styles.pSubMob} numberOfLines={1}>
                            {line.sku} · Hardware
                          </Text>
                        </View>
                        <Text style={styles.lineAmtMobHead} numberOfLines={1}>
                          {formatInr(amt)}
                        </Text>
                        <TouchableOpacity
                          style={styles.removeLineMob}
                          onPress={() => removeLine(line.key)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Trash2 size={18} color={RED} strokeWidth={2.25} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.mobQtyStrip}>
                        <Text style={styles.mobFieldLblInline}>Qty</Text>
                        <View style={styles.qtyRowMob}>
                          <TouchableOpacity
                            style={styles.qtyBtnMob}
                            onPress={() => bumpQty(line.key, -1)}>
                            <Minus size={18} color={TEXT_MAIN} strokeWidth={2.5} />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.qtyInputMob}
                            value={line.quantity}
                            onChangeText={(t) =>
                              updateLine(line.key, { quantity: t })
                            }
                            keyboardType="decimal-pad"
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            style={styles.qtyBtnMob}
                            onPress={() => bumpQty(line.key, 1)}>
                            <Plus size={18} color={TEXT_MAIN} strokeWidth={2.5} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.mobPriceGrid}>
                        <View style={styles.mobPriceCol}>
                          <Text style={styles.mobFieldLbl}>Unit ₹</Text>
                          <TextInput
                            style={styles.mobTextInput}
                            value={line.unit_price}
                            onChangeText={(t) =>
                              updateLine(line.key, { unit_price: t })
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                        <View style={styles.mobPriceCol}>
                          <Text style={styles.mobFieldLbl}>Disc. ₹</Text>
                          <TextInput
                            style={styles.mobTextInput}
                            value={line.line_discount}
                            onChangeText={(t) =>
                              updateLine(line.key, { line_discount: t })
                            }
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                          />
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.thIdx]}>#</Text>
                  <Text style={[styles.th, styles.thProd]}>Product</Text>
                  <Text style={[styles.th, styles.thNum]}>Qty</Text>
                  <Text style={[styles.th, styles.thNum]}>Price</Text>
                  <Text style={[styles.th, styles.thDisc]}>Disc.</Text>
                  <Text style={[styles.th, styles.thAmt]}>Amt</Text>
                  <Text style={[styles.th, styles.thAct]} />
                </View>
                {lines.map((line, idx) => {
                  const q = parseNum(line.quantity);
                  const up = parseNum(line.unit_price);
                  const ld = parseNum(line.line_discount);
                  const amt = lineAmount(q, up, ld);
                  return (
                    <View key={line.key} style={styles.tableRow}>
                      <Text style={[styles.tdText, styles.thIdx]}>{idx + 1}</Text>
                      <View style={[styles.thProd, styles.prodCell]}>
                        <View style={styles.pThumb}>
                          <Package
                            size={18}
                            color={PRIMARY}
                            strokeWidth={2.25}
                          />
                        </View>
                        <View style={styles.pNameBlock}>
                          <Text style={styles.pName} numberOfLines={2}>
                            {line.name}
                          </Text>
                          <Text style={styles.pSub} numberOfLines={1}>
                            {line.sku} · Hardware
                          </Text>
                        </View>
                      </View>
                      <View style={styles.qtyCell}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => bumpQty(line.key, -1)}>
                          <Minus size={16} color={TEXT_MAIN} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <TextInput
                          style={styles.qtyInput}
                          value={line.quantity}
                          onChangeText={(t) =>
                            updateLine(line.key, { quantity: t })
                          }
                          keyboardType="decimal-pad"
                        />
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => bumpQty(line.key, 1)}>
                          <Plus size={16} color={TEXT_MAIN} strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={styles.priceIn}
                        value={line.unit_price}
                        onChangeText={(t) =>
                          updateLine(line.key, { unit_price: t })
                        }
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={styles.discIn}
                        value={line.line_discount}
                        onChangeText={(t) =>
                          updateLine(line.key, { line_discount: t })
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#94a3b8"
                      />
                      <Text style={[styles.thAmt, styles.amtTxt]}>
                        {formatInr(amt)}
                      </Text>
                      <TouchableOpacity
                        style={styles.actionCell}
                        onPress={() => removeLine(line.key)}>
                        <Trash2 size={18} color={RED} strokeWidth={2.25} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}

            <TouchableOpacity
              style={styles.addAnother}
              onPress={() => {
                productSearchRef.current?.focus();
              }}>
              <Plus color={PRIMARY} size={18} strokeWidth={2.5} />
              <Text style={styles.addAnotherTxt}>Add another product</Text>
            </TouchableOpacity>
          </Card>

          <View style={[styles.splitRow, narrow && styles.splitCol]}>
            <Card style={!narrow ? styles.splitCard : undefined}>
              <SectionTitle
                icon={<FileText size={20} color={PRIMARY} strokeWidth={2.25} />}
                title="Bill summary"
              />
              <View style={styles.sumRow}>
                <Text style={styles.sumLbl}>Subtotal</Text>
                <Text style={styles.sumVal}>{formatInr(subtotalLines)}</Text>
              </View>
              <View style={styles.discRow}>
                <Text style={styles.sumLbl}>Invoice discount</Text>
                <View style={styles.discInputs}>
                  <TouchableOpacity
                    style={[
                      styles.miniChip,
                      invDiscountType === 'fixed' && styles.miniChipOn,
                    ]}
                    onPress={() => setInvDiscountType('fixed')}>
                    <Text
                      style={[
                        styles.miniChipTxt,
                        invDiscountType === 'fixed' && styles.miniChipTxtOn,
                      ]}>
                      ₹
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.miniChip,
                      invDiscountType === 'percent' && styles.miniChipOn,
                    ]}
                    onPress={() => setInvDiscountType('percent')}>
                    <Text
                      style={[
                        styles.miniChipTxt,
                        invDiscountType === 'percent' && styles.miniChipTxtOn,
                      ]}>
                      %
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.discField}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={invDiscountVal}
                    onChangeText={setInvDiscountVal}
                  />
                </View>
              </View>
              {invoiceDiscountAmount > 0 ? (
                <View style={styles.sumRow}>
                  <Text style={[styles.sumLbl, styles.discLbl]}>Discount</Text>
                  <Text style={styles.discVal}>
                    − {formatInr(invoiceDiscountAmount)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.sumRow, styles.totalRow]}>
                <Text style={styles.totalLbl}>Total</Text>
                <Text style={styles.totalVal}>{formatInr(grandTotal)}</Text>
              </View>
            </Card>

            <Card style={!narrow ? styles.splitCard : undefined}>
              <SectionTitle
                icon={<IndianRupee size={20} color={GREEN} strokeWidth={2.25} />}
                title="Payment summary"
              />
              <Text style={styles.paySumLbl}>Paid amount</Text>
              <TextInput
                style={styles.paySumInput}
                value={paidInput}
                onChangeText={setPaidInput}
                keyboardType="decimal-pad"
                editable={paymentMode !== 'due'}
              />
              {paymentMode === 'cash' || paymentMode === 'upi' ? (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Change</Text>
                  <Text style={styles.changeVal}>{formatInr(changeDue)}</Text>
                </View>
              ) : paymentMode === 'partial' ? (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLbl}>Balance due</Text>
                  <Text style={styles.balanceDueTxt}>
                    {formatInr(Math.max(0, grandTotal - paidNum))}
                  </Text>
                </View>
              ) : (
                <Text style={styles.creditHint}>
                  Full amount will be recorded as credit for this customer.
                </Text>
              )}
              <View style={styles.printRow}>
                <Text style={styles.printLbl}>Print invoice</Text>
                <Switch
                  value={printInvoice}
                  onValueChange={setPrintInvoice}
                  trackColor={{ false: '#e2e8f0', true: PRIMARY_SOFT }}
                  thumbColor={printInvoice ? PRIMARY : '#f4f4f5'}
                />
              </View>
            </Card>
          </View>

          <TextInput
            style={[styles.notes, styles.cardNotes]}
            placeholder="Notes (optional)"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity
            style={[styles.recordBtn, submitting && styles.recordDisabled]}
            disabled={submitting}
            onPress={() => {
              onSubmit().catch(() => {});
            }}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.recordLbl}>Record sale</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatInvoiceMetaDate(d: Date): string {
  const dateStr = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${dateStr} · ${timeStr}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef1f7' },
  flex: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#eef1f7',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: { fontSize: 22, color: TEXT_MAIN, fontWeight: '600' },
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  toolbarSpacer: { width: 44 },
  scroll: { paddingHorizontal: 14, paddingTop: 10 },
  bannerError: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  customerSearchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: TEXT_MAIN,
  },
  addCustBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drop: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropProduct: { marginBottom: 6 },
  dropRow: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  dropName: { fontSize: 14, fontWeight: '600', color: TEXT_MAIN },
  dropMeta: { marginTop: 1, fontSize: 12, color: TEXT_MUTED },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  col: { flex: 1 },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: '#fff',
  },
  inputFlex: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    color: TEXT_MAIN,
  },
  linkedHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },
  splitRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  splitCol: { flexDirection: 'column' },
  splitCard: { flex: 1 },
  payGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  payChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    minWidth: '44%',
    flexGrow: 1,
    alignItems: 'center',
  },
  payChipOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  payChipCashOn: {
    backgroundColor: GREEN_BG,
    borderColor: GREEN,
  },
  payChipTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  payChipTxtOn: { color: '#fff' },
  payChipTxtCash: { color: GREEN },
  invMeta: { marginBottom: 10 },
  invLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  invValue: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginTop: 2,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  invDate: { fontSize: 14, color: TEXT_MUTED, fontWeight: '500' },
  productsCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  productSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    gap: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 6,
    minHeight: 44,
  },
  productSearchInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: TEXT_MAIN,
  },
  dropMob: {
    maxHeight: 200,
  },
  mobLinesWrap: {
    marginTop: 2,
  },
  mobQtyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  mobFieldLblInline: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  lineCardMob: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8ecf1',
  },
  lineCardMobHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  lineAmtMobHead: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
    marginRight: 2,
    marginTop: 1,
    maxWidth: 96,
    textAlign: 'right',
  },
  lineBadgeMob: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineBadgeMobTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
  lineCardMobTitle: {
    flex: 1,
    minWidth: 0,
  },
  pNameMob: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MAIN,
    lineHeight: 19,
  },
  pSubMob: {
    marginTop: 2,
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  removeLineMob: {
    padding: 4,
  },
  mobFieldLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  qtyRowMob: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  qtyBtnMob: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyInputMob: {
    width: 56,
    minWidth: 56,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    color: TEXT_MAIN,
    backgroundColor: '#fff',
  },
  mobPriceGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 0,
  },
  mobPriceCol: {
    flex: 1,
    minWidth: 0,
  },
  mobTextInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_MAIN,
    backgroundColor: '#fff',
  },
  emptyLines: {
    textAlign: 'center',
    color: TEXT_MUTED,
    paddingVertical: 12,
    fontSize: 13,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf1',
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
  },
  thIdx: { width: 28 },
  thProd: { flex: 1, minWidth: 100 },
  thNum: { width: 56, textAlign: 'center' },
  thDisc: { width: 52, textAlign: 'right' },
  thAmt: { width: 72, textAlign: 'right' },
  thAct: { width: 36 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  tdText: { fontSize: 13, color: TEXT_MAIN },
  prodCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  pNameBlock: { flex: 1, minWidth: 0 },
  prodLoader: { marginVertical: 4 },
  actionCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pName: { fontWeight: '700', fontSize: 13 },
  pSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  qtyCell: {
    width: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  qtyInput: {
    width: 44,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    color: TEXT_MAIN,
  },
  priceIn: {
    width: 56,
    textAlign: 'right',
    fontSize: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  discIn: {
    width: 52,
    textAlign: 'right',
    fontSize: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  amtTxt: { fontWeight: '700', fontSize: 12 },
  addAnother: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: PRIMARY,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  addAnotherTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sumLbl: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
  sumVal: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN },
  discLbl: { color: GREEN },
  discVal: { fontSize: 15, fontWeight: '700', color: GREEN },
  discRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  discInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  miniChipOn: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  miniChipTxt: { fontWeight: '800', color: TEXT_MAIN },
  miniChipTxtOn: { color: '#fff' },
  discField: {
    width: 72,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'right',
    color: TEXT_MAIN,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
  },
  totalLbl: { fontSize: 17, fontWeight: '800', color: TEXT_MAIN },
  totalVal: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  paySumLbl: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  paySumInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
    marginBottom: 12,
  },
  changeVal: { fontSize: 16, fontWeight: '800', color: GREEN },
  balanceDueTxt: { fontSize: 16, fontWeight: '800', color: '#c2410c' },
  creditHint: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 8,
  },
  printRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  printLbl: { fontSize: 14, fontWeight: '600', color: TEXT_MAIN },
  notes: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: TEXT_MAIN,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  cardNotes: {
    backgroundColor: '#fff',
    marginBottom: 14,
  },
  recordBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDisabled: { opacity: 0.75 },
  recordLbl: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
