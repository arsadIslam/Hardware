import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Printer,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/types';
import {
  buildInvoiceMessage,
  normalizeWhatsAppDigits,
  type InvoiceShareLine,
} from '../utils/invoiceShare';
import { shareThermalInvoicePdf } from '../utils/shareThermalPdf';

const PRIMARY = '#6B5CE6';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';
const GREEN = '#16a34a';
const SHOP_NAME = 'Janani Hardware';

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(n);
}

export function SaleSummaryScreen(): React.JSX.Element {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SaleSummary'>>();
  const p = route.params;
  const [pdfBusy, setPdfBusy] = useState(false);

  const waDigits = useMemo(
    () =>
      p.customerPhone ? normalizeWhatsAppDigits(p.customerPhone) : null,
    [p.customerPhone],
  );

  const shareBody = useCallback(() => {
    const lines: InvoiceShareLine[] = p.lines.map((l) => ({
      name: l.name,
      sku: l.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    }));
    return buildInvoiceMessage({
      shopName: SHOP_NAME,
      invoiceNumber: p.invoiceNumber,
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      lines,
      subtotal: p.subtotal,
      invoiceDiscount: p.invoiceDiscount,
      grandTotal: p.grandTotal,
      paymentModeLabel: p.paymentModeLabel,
      amountPaid: p.amountPaid,
      changeAmount: p.changeAmount,
      balanceDue: p.balanceDue,
      notes: p.notes,
      formatInr,
    });
  }, [p]);

  async function onThermalPdf(): Promise<void> {
    setPdfBusy(true);
    try {
      await shareThermalInvoicePdf({
        shopName: SHOP_NAME,
        invoiceNumber: p.invoiceNumber,
        customerName: p.customerName,
        customerPhone: p.customerPhone,
        lines: p.lines.map((l) => ({
          name: l.name,
          sku: l.sku,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
        subtotal: p.subtotal,
        invoiceDiscount: p.invoiceDiscount,
        grandTotal: p.grandTotal,
        paymentModeLabel: p.paymentModeLabel,
        amountPaid: p.amountPaid,
        changeAmount: p.changeAmount,
        balanceDue: p.balanceDue,
        notes: p.notes,
        printedAt: new Date(),
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not create or share the PDF.';
      Alert.alert('Thermal PDF', msg);
    } finally {
      setPdfBusy(false);
    }
  }

  function onWhatsApp(): void {
    if (!waDigits) {
      Alert.alert(
        'No phone number',
        'This sale has no customer mobile number. Add a customer with a phone number to send on WhatsApp.',
      );
      return;
    }
    const text = encodeURIComponent(shareBody());
    const url = `https://wa.me/${waDigits}?text=${text}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'Could not open WhatsApp.');
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ArrowLeft size={24} color={TEXT_MAIN} strokeWidth={2.25} />
        </TouchableOpacity>
        <Text style={styles.toolbarTitle}>Sale recorded</Text>
        <View style={styles.toolbarSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <CheckCircle2 size={48} color={GREEN} strokeWidth={2} />
          <Text style={styles.heroTitle}>Invoice saved</Text>
          <Text style={styles.invoiceNo}>{p.invoiceNumber}</Text>
        </View>

        {(p.customerName || p.customerPhone) && (
          <View style={styles.card}>
            <Text style={styles.cardLbl}>Customer</Text>
            <Text style={styles.cardVal}>
              {[p.customerName, p.customerPhone].filter(Boolean).join(' · ') ||
                '—'}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardLbl}>Items</Text>
          {p.lines.map((line, idx) => (
            <View
              key={`${line.sku}-${idx}`}
              style={[
                styles.lineRow,
                idx < p.lines.length - 1 && styles.lineRowBorder,
              ]}>
              <View style={styles.lineMain}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {line.name}
                </Text>
                <Text style={styles.lineMeta}>
                  {line.sku} · {line.quantity} × {formatInr(line.unitPrice)}
                </Text>
              </View>
              <Text style={styles.lineAmt}>{formatInr(line.lineTotal)}</Text>
            </View>
          ))}
          <View style={styles.sumDivider} />
          <View style={styles.sumRow}>
            <Text style={styles.sumLbl}>Subtotal</Text>
            <Text style={styles.sumVal}>{formatInr(p.subtotal)}</Text>
          </View>
          {p.invoiceDiscount > 0 ? (
            <View style={styles.sumRow}>
              <Text style={styles.sumLbl}>Invoice discount</Text>
              <Text style={styles.sumVal}>{formatInr(p.invoiceDiscount)}</Text>
            </View>
          ) : null}
          <View style={styles.sumRowTotal}>
            <Text style={styles.totalLbl}>Total</Text>
            <Text style={styles.totalVal}>{formatInr(p.grandTotal)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLbl}>Payment</Text>
            <Text style={styles.sumVal}>{p.paymentModeLabel}</Text>
          </View>
          {p.amountPaid != null && p.amountPaid > 0 ? (
            <View style={styles.sumRow}>
              <Text style={styles.sumLbl}>Amount paid</Text>
              <Text style={styles.sumVal}>{formatInr(p.amountPaid)}</Text>
            </View>
          ) : null}
          {p.changeAmount != null && p.changeAmount > 0 ? (
            <View style={styles.sumRow}>
              <Text style={styles.sumLbl}>Change</Text>
              <Text style={[styles.sumVal, styles.greenTxt]}>
                {formatInr(p.changeAmount)}
              </Text>
            </View>
          ) : null}
          {p.balanceDue != null && p.balanceDue > 0 ? (
            <View style={styles.sumRow}>
              <Text style={styles.sumLbl}>Balance due</Text>
              <Text style={[styles.sumVal, styles.orangeTxt]}>
                {formatInr(p.balanceDue)}
              </Text>
            </View>
          ) : null}
          {p.notes ? (
            <Text style={styles.notes}>
              <Text style={styles.notesLbl}>Notes: </Text>
              {p.notes}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            disabled={pdfBusy}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionOutline,
              pressed && !pdfBusy && styles.pressed,
              pdfBusy && styles.actionDisabled,
            ]}
            onPress={() => {
              onThermalPdf().catch(() => {});
            }}>
            {pdfBusy ? (
              <ActivityIndicator color={PRIMARY} />
            ) : (
              <Printer size={22} color={PRIMARY} strokeWidth={2.25} />
            )}
            <Text style={styles.actionOutlineTxt}>
              {pdfBusy ? 'Building PDF…' : 'Thermal PDF'}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              waDigits ? styles.actionWa : styles.actionWaDisabled,
              pressed && waDigits && styles.pressed,
            ]}
            onPress={onWhatsApp}>
            <MessageCircle
              size={22}
              color="#fff"
              strokeWidth={2.25}
            />
            <Text style={styles.actionWaTxt}>WhatsApp</Text>
          </Pressable>
        </View>
        <Text style={styles.pdfHint}>
          PDF is 80mm wide — share to Print, Save, or a thermal printer app.
        </Text>
        {!waDigits ? (
          <Text style={styles.waHint}>
            Add a customer phone on the next sale to enable WhatsApp.
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.doneTxt}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#eef1f7' },
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
  toolbarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  toolbarSpacer: { width: 44 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_MAIN,
  },
  invoiceNo: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf1',
  },
  cardLbl: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  cardVal: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
  },
  lineRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  lineMain: { flex: 1, minWidth: 0 },
  lineName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  lineMeta: {
    marginTop: 4,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  lineAmt: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MAIN,
  },
  sumDivider: {
    height: 1,
    backgroundColor: '#e8ecf1',
    marginVertical: 8,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  sumLbl: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600' },
  sumVal: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN },
  sumRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e8ecf1',
  },
  totalLbl: { fontSize: 16, fontWeight: '800', color: TEXT_MAIN },
  totalVal: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  greenTxt: { color: GREEN },
  orangeTxt: { color: '#c2410c' },
  notes: {
    marginTop: 12,
    fontSize: 14,
    color: TEXT_MAIN,
    lineHeight: 20,
  },
  notesLbl: { fontWeight: '700', color: TEXT_MUTED },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionOutline: {
    borderWidth: 2,
    borderColor: PRIMARY,
    backgroundColor: '#fff',
  },
  actionOutlineTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: PRIMARY,
  },
  actionWa: {
    backgroundColor: '#25D366',
  },
  actionWaDisabled: {
    backgroundColor: '#94a3b8',
  },
  actionWaTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  pressed: { opacity: 0.88 },
  actionDisabled: { opacity: 0.65 },
  pdfHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  waHint: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneTxt: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
});
