import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Check,
  CircleX,
  CloudUpload,
  FileText,
  Landmark,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { AppText } from '@/src/components/AppText';
import { ActionCard } from '@/src/components/ActionCard';
import { PhoneInput } from '@/src/components/PhoneInput';
import ErrorContainer from '@/src/components/ErrorContainer';
import { colors, spacing } from '@/src/theme';
import { BANK_CONNECT_STATUS_MESSAGES } from './bankConnectContinueMessages';
import type { BankConnectChecklistItem } from './bankConnectContinueMessages';
import { BankConnectStatusChecklist } from './BankConnectStatusChecklist';
import { ZapcashLoading } from '../../ZapcashLoading';
import { windowHeight } from '@/src/utils/common-helper';
import { formatManualUploadStatementRangeLabel } from '@/src/utils/bankStatementPeriod';
import { PrimaryBoldInlineText } from '../../PrimaryBoldInlineText';
import { BANK_CONNECT_MANUAL_PAIR_MIN_HEIGHT } from './bankConnectManualPairLayout';

export type ManualUploadVariant = 'idle' | 'progress' | 'success';

export type ActionCardConfig = {
  title: string;
  subtext: string | React.ReactNode;
  onPress: () => void;
  highlighted?: boolean;
};

type MobileContentProps = {
  mobile: string;
  onChangeMobile: (value: string) => void;
  errorMessage: string;
  /** Optional primary CTA rendered below safety points. */
  primaryCta?: React.ReactNode;
  /** Optional card shown below safety points (e.g. "Get a Higher Loan Amount") */
  actionCard?: ActionCardConfig;
  /** Optional card shown after the primary action card. */
  secondaryActionCard?: ActionCardConfig;
};

type ManualUploadContentProps = {
  variant: ManualUploadVariant;
  errorMessage?: string;
  uploadProgress: number;
  uploadedFileName: string | null;
  uploader?: React.ReactNode;
  onUploadPress: () => void;
  onRemoveFile: () => void;
};

const SAFETY_POINTS = [
  'RBI-regulated process',
  'Faster approval process',
  'Read-only access',
  'No charges applied',
] as const;

const MANUAL_UPLOAD_GUIDELINES_DO = [
  'Latest statement till yesterday',
  'At least includes last 90 days',
] as const;

const MANUAL_UPLOAD_GUIDELINES_DONT = [
  'UPI/Mini/Credit-Card statement',
  'Any other document than statement',
] as const;

type ManualUploadGuidelineListProps = {
  acceptedLines: readonly string[];
  rejectedLines: readonly string[];
};

const ManualUploadGuidelineList = ({
  acceptedLines,
  rejectedLines,
}: ManualUploadGuidelineListProps): React.JSX.Element => {
  return (
    <View style={styles.manualGuidelineSection}>
      <AppText style={styles.manualGuidelineHeading} variant="caption" weight="bold">
        Required:
      </AppText>
      {acceptedLines.map((line) => (
        <View
          key={line}
          style={styles.manualGuidelineRow}
          accessibilityRole="text"
          accessibilityLabel={`Accepted: ${line}`}
        >
          <Check size={16} color={colors.success.main} strokeWidth={2.5} />
          <AppText style={styles.manualGuidelineText} variant="captionSmall">
            {line}
          </AppText>
        </View>
      ))}
      {rejectedLines.map((line) => (
        <View
          key={line}
          style={styles.manualGuidelineRow}
          accessibilityRole="text"
          accessibilityLabel={`Not accepted: ${line}`}
        >
          <CircleX size={16} color={colors.error.main} strokeWidth={2} />
          <AppText style={styles.manualGuidelineText} variant="captionSmall">
            {line}
          </AppText>
        </View>
      ))}
    </View>
  );
};

export function BankConnectMobileContent({
  mobile,
  onChangeMobile,
  errorMessage,
  primaryCta,
  actionCard,
  secondaryActionCard,
}: MobileContentProps): React.JSX.Element {
  const { t } = useTranslation();
  /** Same min-height on button row + manual card so the two blocks feel visually balanced (aa-with-manual). */
  const alignPrimaryCtaWithActionCard = primaryCta != null && actionCard != null;

  return (
    <>
      <AppText style={styles.title} variant="h3" weight="semiBold">
        Verify your bank account
      </AppText>
      <AppText style={{...styles.subtitle, marginBottom: spacing.xs}} variant="caption">
        Securely fetch bank statement instantly
      </AppText>
      {/* <AppText style={styles.subtitle} variant="captionSmall">
        (For better eligibility share your{" "}
        <AppText variant="captionSmall" color="primary" weight="medium">
          Salary-Account
        </AppText>
        )
      </AppText> */}
      <ErrorContainer responseError={errorMessage} />
      <View style={styles.inputContainer}>
        <AppText style={styles.label} variant="captionSmall" weight="medium">
          {t('Mobile Number (linked to your')} <AppText variant="captionSmall" weight="bold" color="primary">
            Salary-Account
          </AppText>{t(')')}
        </AppText>
        <PhoneInput
          value={mobile}
          onChange={onChangeMobile}
          placeholder={t('e.g. 9876543210')}
          returnKeyType="done"
        />
      </View>
      <View style={styles.safetySection}>
        {SAFETY_POINTS.map((point) => (
          <View key={point} style={styles.safetyRow}>
            <ShieldCheck size={16} color={colors.primary.main} strokeWidth={2} />
            <AppText style={styles.safetyText} variant="caption">
              {point}
            </AppText>
          </View>
        ))}
      </View>
      {primaryCta != null && <View style={styles.primaryCtaContainer}>{primaryCta}</View>}
      {actionCard != null && (
        <>
          <AppText style={styles.manualDividerLabel} variant="caption" weight="medium">
            — or —
          </AppText>
          <ActionCard
            title={actionCard.title}
            subtext={actionCard.subtext}
            onPress={actionCard.onPress}
            isBankStatementStep={true}
            highlighted={actionCard.highlighted}
            containerStyle={
              alignPrimaryCtaWithActionCard
                ? styles.actionCardMatchedPair
                : undefined
            }
          />
        </>
      )}
      {secondaryActionCard != null && (
        <ActionCard
          title={secondaryActionCard.title}
          subtext={secondaryActionCard.subtext}
          onPress={secondaryActionCard.onPress}
          isBankStatementStep={true}
          highlighted={secondaryActionCard.highlighted}
        />
      )}
    </>
  );
}

export function BankConnectFetchingContent(): React.JSX.Element {
  return (
    <View style={styles.loadingContainer}>
      {/* <ActivityIndicator size="large" color={colors.primary.main} />
      <AppText style={styles.loadingText} variant="body" weight="medium">
        {BANK_CONNECT_STATUS_MESSAGES.fetchingBankDetails} KL
      </AppText>
      <AppText style={styles.loadingSubtext} variant="caption">
        Please wait while we securely connect to your bank
      </AppText> */}

      <ZapcashLoading
        visible={true}
        message={BANK_CONNECT_STATUS_MESSAGES.fetchingBankDetails}
        source="BankConnectFetchingContent"
      />
    </View>
  );
}

const BANK_STATEMENT_PENDING_TITLE = 'Connecting your bank…';
const BANK_STATEMENT_PENDING_SUBTITLE =
  "We're fetching and verifying your bank statement.";

type BankStatementPendingContentProps = {
  isPolling: boolean;
  message: string;
  /** When provided, shows checklist UI instead of single message. */
  checklistItems?: BankConnectChecklistItem[];
  /** When true, shows error styling for the message */
  showError?: boolean;
  /** Shown below main content when attempts policy allows manual upload. */
  actionCard?: ActionCardConfig;
  /** Optional note shown below action card (e.g. attempts left details). */
  infoNote?: string;
};

/** Shows checklist of status steps when checklistItems provided; otherwise message + spinner/icon. */
export function BankStatementPendingContent({
  isPolling,
  message,
  checklistItems,
  showError = false,
  actionCard,
  infoNote,
}: BankStatementPendingContentProps): React.JSX.Element {
  const renderBelowContent = () => {
    const hasInfoNote = infoNote != null && infoNote.trim() !== '';
    if (actionCard == null && !hasInfoNote) return null;

    return (
      <>
        {actionCard != null && (
          <ActionCard
            title={actionCard.title}
            subtext={actionCard.subtext}
            onPress={actionCard.onPress}
          />
        )}
        {hasInfoNote && (
          <AppText
            style={[styles.loadingText, styles.infoNote]}
            variant="body"
            weight="medium"
          >
            {infoNote}
          </AppText>
        )}
      </>
    );
  };

  return (
    <View style={styles.pendingWrapper}>
      <View style={styles.loadingContainer}>
        {/* {isPolling ? (
          <ActivityIndicator size="large" color={colors.primary.main} />
        ) : showError ? (
          <Landmark size={48} color={colors.error.main} />
        ) : (
          <Landmark size={48} color={colors.primary.main} />
        )}
        <AppText
          style={[
            styles.loadingText,
            showError && styles.errorText
          ]}
          variant="body"
          weight="medium"
        >
          {message} 
        </AppText> */}

        <ZapcashLoading
          visible={true}
          message={message}
          source="BankStatementPendingContent"
        />
      </View>
      {/* {renderBelowContent()} */}
    </View>
  );
}

export function BankConnectManualUploadContent({
  variant,
  errorMessage,
  uploadProgress,
  uploadedFileName,
  uploader,
  onUploadPress,
  onRemoveFile,
}: ManualUploadContentProps): React.JSX.Element {
  const { t } = useTranslation();
  const statementRangeLabels = formatManualUploadStatementRangeLabel();

  const renderStatementRangeLabels = () => {
    if (statementRangeLabels == null) {
      return t('(Last 3 months)');
    }
    return [
      t('(Last 3 months '),
      <AppText key="statement-range" variant="caption" weight="medium">
        {t('including {{start}} – {{end}}', {
          start: statementRangeLabels.startLabel,
          end: statementRangeLabels.endLabel,
        })}
      </AppText>,
      ')',
    ];
  };
  return (
    <>

      <View style={styles.uploadSection}>
        <AppText style={styles.uploadLabel} variant="caption" weight="medium">
          {t('Upload')}
          <PrimaryBoldInlineText> Salary-Account </PrimaryBoldInlineText>
          {t('bank statement')}
        </AppText>
        <AppText style={styles.uploadPeriodHint} variant="caption" weight="medium">
          {renderStatementRangeLabels()}
        </AppText>

        {variant === 'idle' && (
          <>
            {errorMessage != null && errorMessage.trim().length > 0 && (
              <ErrorContainer responseError={errorMessage} />
            )}
            {uploader ?? (
              <TouchableOpacity
                style={styles.uploadArea}
                onPress={onUploadPress}
                activeOpacity={0.7}
              >
                <CloudUpload size={32} color={colors.text.tertiary} />
                <AppText style={styles.uploadHint} variant="body">
                  Upload File
                </AppText>
                <AppText style={styles.uploadFormat} variant="caption">
                  File should be in .pdf format
                </AppText>
              </TouchableOpacity>
            )}
          </>
        )}

        {variant === 'progress' && (
          <>
            <View style={styles.uploadArea}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <AppText style={styles.uploadHint} variant="body">
                Uploading...
              </AppText>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            <AppText style={styles.progressText} variant="caption">
              {t('{{progress}}% Completed', { progress: uploadProgress })}
            </AppText>
          </>
        )}

        {variant === 'success' && (
          <>
            <View style={styles.uploadedFile}>
              <FileText size={24} color={colors.primary.main} />
              <View style={styles.uploadedFileInfo}>
                <AppText variant="body" weight="medium">
                  {uploadedFileName || 'Statement.pdf'}
                </AppText>
                <AppText style={styles.uploadSuccessText} variant="caption">
                  File Uploaded Successfully
                </AppText>
              </View>
              <TouchableOpacity onPress={onRemoveFile} hitSlop={12}>
                <X size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '100%' }]} />
            </View>
            <AppText style={styles.progressText} variant="caption">
              100% Completed
            </AppText>
          </>
        )}

        {/* Guidelines for manual upload */}
        <ManualUploadGuidelineList
          acceptedLines={MANUAL_UPLOAD_GUIDELINES_DO}
          rejectedLines={MANUAL_UPLOAD_GUIDELINES_DONT}
        />
      </View>

    </>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text.secondary,
  },
  inputContainer: {
    marginTop: spacing.base,
  },
  label: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  safetySection: {
    paddingTop: spacing.base,
    marginBottom: spacing.base,
  },
  primaryCtaContainer: {
    marginBottom: spacing.lg,
  },
  /** Same min-height as primary button when paired (see BankConnectContinueSecurelyButton). */
  actionCardMatchedPair: {
    minHeight: BANK_CONNECT_MANUAL_PAIR_MIN_HEIGHT,
    justifyContent: 'center',
  },
  /** Label between AA section and "Upload Manually" card in aa-with-manual flow. */
  manualDividerLabel: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  safetyText: {
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  pendingWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['4xl'],
    minHeight: windowHeight * 0.6,
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  infoNote: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.base,
    paddingHorizontal: spacing.base,
  },
  errorText: {
    color: colors.error.main,
  },
  loadingSubtext: {
    color: colors.text.secondary,
  },
  checklistSection: {
    marginTop: spacing.lg,
  },
  uploadSection: {
    // marginTop: spacing.lg,
    marginBottom: spacing.base,
  },
  uploadLabel: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  /** Subtitle under manual upload title; spacing before guideline list. */
  uploadPeriodHint: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  manualGuidelineSection: {
    marginVertical: spacing.xl,
  },
  manualGuidelineHeading: {
    marginBottom: spacing.xs,
  },
  manualGuidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  manualGuidelineText: {
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  uploadHint: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  uploadFormat: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success.main,
    borderRadius: 3,
  },
  progressText: {
    color: colors.text.secondary,
  },
  uploadedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: spacing.base,
  },
  uploadedFileInfo: {
    flex: 1,
    marginLeft: spacing.base,
  },
  uploadSuccessText: {
    color: colors.success.main,
    marginTop: spacing.xs,
  },
});
