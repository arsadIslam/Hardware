import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  deleteProduct,
  fetchProduct,
  updateProduct,
} from '../api/products';
import type { RootStackParamList } from '../navigation/types';
import { getApiErrorMessage } from '../utils/apiErrors';

const PRIMARY = '#6B5CE6';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';

function FieldLabel(props: { children: string }): React.JSX.Element {
  return <Text style={styles.fieldLabel}>{props.children}</Text>;
}

function toInputNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const s = String(value).trim();
  if (s === '') {
    return '';
  }
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) {
    return s;
  }
  if (Number.isInteger(n)) {
    return String(n);
  }
  return String(value);
}

export function EditProductScreen(): React.JSX.Element {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditProduct'>>();
  const insets = useSafeAreaInsets();
  const productId = route.params.productId;

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [productIdSku, setProductIdSku] = useState('');
  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadingProduct(true);
    setError(null);
    try {
      const p = await fetchProduct(productId);
      setProductIdSku(p.product_id ?? '');
      setName(p.name ?? '');
      setSellingPrice(toInputNumber(p.selling_price));
      setBuyingPrice(
        p.buying_price != null ? toInputNumber(p.buying_price) : '',
      );
      setQuantity(toInputNumber(p.available_quantity));
      setUnit(p.quantity_unit ?? '');
      setLocation(p.location ?? '');
    } catch {
      setError('Could not load product.');
    } finally {
      setLoadingProduct(false);
    }
  }, [productId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function onSubmit() {
    setError(null);
    const sku = productIdSku.trim();
    const nm = name.trim();
    const sp = parseFloat(sellingPrice.replace(/,/g, ''));
    const qty = parseFloat(quantity.replace(/,/g, ''));

    if (!sku || !nm) {
      setError('SKU and product name are required.');
      return;
    }
    if (Number.isNaN(sp) || sp < 0) {
      setError('Enter a valid selling price.');
      return;
    }
    if (Number.isNaN(qty) || qty < 0) {
      setError('Enter a valid stock quantity.');
      return;
    }

    let bp: number | null = null;
    const buyingRaw = buyingPrice.trim();
    if (buyingRaw !== '') {
      const parsed = parseFloat(buyingRaw.replace(/,/g, ''));
      if (Number.isNaN(parsed) || parsed < 0) {
        setError('Buying price must be a valid number.');
        return;
      }
      bp = parsed;
    }

    setSubmitting(true);
    try {
      await updateProduct(productId, {
        product_id: sku,
        name: nm,
        selling_price: sp,
        buying_price: bp,
        available_quantity: qty,
        quantity_unit: unit.trim() || null,
        location: location.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Could not save changes.'));
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete product',
      'This cannot be undone. Delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete().catch(() => {});
          },
        },
      ],
    );
  }

  async function onDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(productId);
      navigation.goBack();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Could not delete product.'));
    } finally {
      setDeleting(false);
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
            onPress={() => {
              navigation.goBack();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}>
            <ArrowLeft color={TEXT_MAIN} size={24} strokeWidth={2.25} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Edit product</Text>
          <View style={styles.toolbarSpacer} />
        </View>

        {loadingProduct ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: 28 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.bannerError}>{error}</Text> : null}

            <FieldLabel>SKU (product ID)</FieldLabel>
            <TextInput
              style={styles.input}
              value={productIdSku}
              onChangeText={setProductIdSku}
              placeholder="SKU"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting && !deleting}
            />

            <FieldLabel>Product name</FieldLabel>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Product display name"
              placeholderTextColor="#94a3b8"
              editable={!submitting && !deleting}
            />

            <FieldLabel>Selling price (₹)</FieldLabel>
            <TextInput
              style={styles.input}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!submitting && !deleting}
            />

            <FieldLabel>Buying price (₹, optional)</FieldLabel>
            <TextInput
              style={styles.input}
              value={buyingPrice}
              onChangeText={setBuyingPrice}
              placeholder="Leave empty if unknown"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!submitting && !deleting}
            />

            <FieldLabel>Stock quantity</FieldLabel>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!submitting && !deleting}
            />

            <FieldLabel>Unit (optional)</FieldLabel>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. pcs, kg, box"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              editable={!submitting && !deleting}
            />

            <FieldLabel>Location (optional)</FieldLabel>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={location}
              onChangeText={setLocation}
              placeholder="Shelf or warehouse location"
              placeholderTextColor="#94a3b8"
              multiline
              editable={!submitting && !deleting}
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting || deleting) && styles.submitBtnDisabled,
              ]}
              onPress={() => {
                onSubmit().catch(() => {});
              }}
              disabled={submitting || deleting}
              activeOpacity={0.9}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitLabel}>Save changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deleteBtn,
                (submitting || deleting) && styles.submitBtnDisabled,
              ]}
              onPress={confirmDelete}
              disabled={submitting || deleting}
              activeOpacity={0.85}>
              {deleting ? (
                <ActivityIndicator color="#dc2626" />
              ) : (
                <Text style={styles.deleteLabel}>Delete product</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef1f7',
  },
  flex: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
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
    letterSpacing: -0.2,
  },
  toolbarSpacer: {
    width: 44,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bannerError: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    fontSize: 14,
    lineHeight: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 8,
    letterSpacing: 0.15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: TEXT_MAIN,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 88,
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  deleteBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteLabel: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
  },
});
