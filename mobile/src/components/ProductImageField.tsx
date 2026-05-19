import { Camera, ImagePlus, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';

import type { ProductImageFile } from '../api/products';
import { resolveMediaUrl } from '../utils/mediaUrl';

const PRIMARY = '#6B5CE6';
const TEXT_MAIN = '#0f172a';
const TEXT_MUTED = '#64748b';

function assetToImageFile(asset: Asset): ProductImageFile | null {
  if (!asset.uri) {
    return null;
  }
  const type = asset.type ?? 'image/jpeg';
  const ext = type.includes('png') ? 'png' : 'jpg';
  return {
    uri: asset.uri,
    type,
    name: asset.fileName ?? `product.${ext}`,
  };
}

type Props = {
  label?: string;
  localUri: string | null;
  remoteUrl: string | null;
  onChange: (file: ProductImageFile | null) => void;
  disabled?: boolean;
  required?: boolean;
};

export function ProductImageField({
  label = 'Product image',
  localUri,
  remoteUrl,
  onChange,
  disabled = false,
  required = false,
}: Props): React.JSX.Element {
  const [picking, setPicking] = React.useState(false);
  const previewUri =
    localUri ?? resolveMediaUrl(remoteUrl) ?? null;

  async function pickImage() {
    if (disabled || picking) {
      return;
    }
    setPicking(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.length) {
        return;
      }
      const file = assetToImageFile(result.assets[0]);
      if (file) {
        onChange(file);
      }
    } finally {
      setPicking(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? ' *' : ''}
      </Text>

      {previewUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.preview} />
          {!disabled ? (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                onChange(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.85}>
              <X size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.placeholder}>
          <ImagePlus size={28} color={TEXT_MUTED} strokeWidth={2} />
          <Text style={styles.placeholderText}>
            {required
              ? 'Add a photo of this product'
              : 'Optional product photo'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.pickBtn, (disabled || picking) && styles.pickBtnDisabled]}
        onPress={() => {
          pickImage().catch(() => {});
        }}
        disabled={disabled || picking}
        activeOpacity={0.88}>
        {picking ? (
          <ActivityIndicator color={PRIMARY} />
        ) : (
          <>
            <Camera size={18} color={PRIMARY} strokeWidth={2.25} />
            <Text style={styles.pickLabel}>
              {previewUri ? 'Change photo' : 'Choose from gallery'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_MUTED,
    marginBottom: 8,
    letterSpacing: 0.15,
  },
  previewWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  clearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
  },
  pickBtnDisabled: {
    opacity: 0.7,
  },
  pickLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_MAIN,
  },
});
