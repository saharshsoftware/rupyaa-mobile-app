import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { Dispatch, SetStateAction } from 'react';
import { FileText, X } from 'lucide-react-native';
import { AppText } from '@/src/components/AppText';
import { colors, spacing, radius, typography } from '@/src/theme';
import type { DocumentFile } from '@/src/utils/documentFilePicker';
import { pickDocumentFile } from '@/src/utils/documentFilePicker';

export interface NeedHelpAttachmentFieldProps {
  files: DocumentFile[];
  /** Same shape as React `useState` setter — supports functional updates when appending. */
  onChange: Dispatch<SetStateAction<DocumentFile[]>>;
  disabled?: boolean;
}

/**
 * Optional dashed upload zone; appends picked files (no upload API yet).
 */
export function NeedHelpAttachmentField({
  files,
  onChange,
  disabled = false,
}: NeedHelpAttachmentFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const [isPicking, setIsPicking] = useState(false);

  const handlePick = useCallback(async () => {
    if (disabled || isPicking) return;
    setIsPicking(true);
    try {
      const picked = await pickDocumentFile();
      if (picked) {
        onChange((prev) => [...prev, picked]);
      }
    } catch {
      Alert.alert(t('Could not add file'), t('Please try again or pick a supported format.'));
    } finally {
      setIsPicking(false);
    }
  }, [disabled, isPicking, onChange, t]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange((prev) => prev.filter((_, i) => i !== index));
    },
    [onChange]
  );

  return (
    <View style={styles.container}>
      <AppText style={styles.label}>Attachments (Optional)</AppText>

      <TouchableOpacity
        style={styles.uploadArea}
        onPress={handlePick}
        activeOpacity={0.7}
        disabled={disabled || isPicking}
        accessibilityLabel="Add attachment"
        accessibilityRole="button"
      >
        {isPicking ? (
          <ActivityIndicator color={colors.primary.main} />
        ) : (
          <FileText size={32} color={colors.primary.main} />
        )}
      </TouchableOpacity>

      {files.length > 0 ? (
        <View style={styles.list}>
          {files.map((f, index) => (
            <View key={`${f.uri}-${index}`} style={styles.fileRow}>
              {f.mimeType.startsWith('image/') && (
                <Image source={{ uri: f.uri }} style={styles.preview} accessibilityLabel={`Preview of ${f.name}`} />
              )}
              <AppText variant="caption" style={styles.fileName} numberOfLines={1}>
                {f.name}
              </AppText>
              <TouchableOpacity
                onPress={() => handleRemove(index)}
                hitSlop={12}
                accessibilityLabel={`Remove ${f.name}`}
                accessibilityRole="button"
                disabled={disabled}
              >
                <X size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.primary.main,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.lightest_3,
    minHeight: 120,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  preview: {
    width: spacing['4xl'],
    height: spacing['4xl'],
    borderRadius: radius.sm,
    resizeMode: 'cover',
  },
  fileName: {
    flex: 1,
    minWidth: 0,
    color: colors.text.secondary,
  },
});
