import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

import { createProduct } from '../api/products';
import type { RootStackParamList } from '../navigation/types';
import { getApiErrorMessage } from '../utils/apiErrors';

const PRIMARY = '#6B5CE6';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';

function FieldLabel(props: { children: string }): React.JSX.Element {
  return <Text style={styles.fieldLabel}>{props.children}</Text>;
}

export function AddProductScreen(): React.JSX.Element {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const nm = name.trim();
    const sp = parseFloat(sellingPrice.replace(/,/g, ''));
    const qty = parseFloat(quantity.replace(/,/g, ''));

    if (!nm) {
      setError('Product name is required.');
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
      await createProduct({
        name: nm,
        selling_price: sp,
        buying_price: bp,
        available_quantity: qty,
        quantity_unit: unit.trim() || null,
        location: location.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Could not save product. Try again.'));
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
            onPress={() => {
              navigation.goBack();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.75}>
            <ArrowLeft color={TEXT_MAIN} size={24} strokeWidth={2.25} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Add product</Text>
          <View style={styles.toolbarSpacer} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 28 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.bannerError}>{error}</Text> : null}

          <Text style={styles.helper}>
            Product ID is assigned automatically (e.g. HW-000001).
          </Text>

          <FieldLabel>Product name</FieldLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Product display name"
            placeholderTextColor="#94a3b8"
            editable={!submitting}
          />

          <FieldLabel>Selling price (₹)</FieldLabel>
          <TextInput
            style={styles.input}
            value={sellingPrice}
            onChangeText={setSellingPrice}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            editable={!submitting}
          />

          <FieldLabel>Buying price (₹, optional)</FieldLabel>
          <TextInput
            style={styles.input}
            value={buyingPrice}
            onChangeText={setBuyingPrice}
            placeholder="Leave empty if unknown"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            editable={!submitting}
          />

          <FieldLabel>Stock quantity</FieldLabel>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
            editable={!submitting}
          />

          <FieldLabel>Unit (optional)</FieldLabel>
          <TextInput
            style={styles.input}
            value={unit}
            onChangeText={setUnit}
            placeholder="e.g. pcs, kg, box"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            editable={!submitting}
          />

          <FieldLabel>Location (optional)</FieldLabel>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={location}
            onChangeText={setLocation}
            placeholder="Shelf or warehouse location"
            placeholderTextColor="#94a3b8"
            multiline
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={() => {
              onSubmit().catch(() => {});
            }}
            disabled={submitting}
            activeOpacity={0.9}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitLabel}>Save product</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: TEXT_MUTED,
    marginBottom: 16,
    fontWeight: '500',
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
});
