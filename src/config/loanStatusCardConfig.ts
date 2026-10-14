import type { ImageSourcePropType } from 'react-native';
import { UserStagesInBackend } from './userStages';
import { IMAGES } from '@/src/constants/images';

const DEFAULT_TITLE = 'Check loan offers';
const DEFAULT_HEADING = 'Instant Loan Up to';
/** Use when amount is shown separately in the card to avoid showing ₹5,00,000 twice */
export const DEFAULT_HEADING_WITHOUT_AMOUNT = 'Get Loan Offers';
const DEFAULT_DESCRIPTION = 'Instant approval with Rupyaa credit engine';

export { DEFAULT_HEADING };

const CBL_HEADING = 'Application Status';
const CBL_FOOTER_MESSAGE = 'Please check again in 30 days';
const CBL_STRIP_LABEL = 'Stay tuned';

export interface LoanStatusCardStageConfig {
  title: string;
  heading: string;
  description: string;
  actionLabel: string;
  illustrationSource?: ImageSourcePropType;
  statusPill?: string;
  /** When set to 'warning', title is shown as amber under-review badge */
  titleBadgeVariant?: 'warning';
  hideProgressStepper?: boolean;
  /** When true, hides CTA and progress stepper (e.g. CBL, under-review) */
  hideAction?: boolean;
  actionMessage?: string;
  disableAction?: boolean;
  /** Used by CBL/REJECTED card as top strip pill text */
  stripLabel?: string;
}

export const LOAN_STATUS_CARD_STAGE_CONFIG: Record<
  UserStagesInBackend,
  LoanStatusCardStageConfig
> = {
  [UserStagesInBackend.PERSONAL_DETAILS]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Apply for Loan',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.MODE_OF_EMPLOYMENT]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Complete Profile',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.SOFT_PULL]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Check Eligibility',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.BANK_STATEMENT]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Upload Bank Statement',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.OFFERINGS]: {
    title: DEFAULT_TITLE,
    heading: "You're Eligible",
    description: 'Your personalized loan offer is ready.',
    actionLabel: 'Review Offer',
    actionMessage: 'Offer valid for a limited time.',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.CONTACT_DETAILS]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Complete KYC',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.ADDRESS_DETAILS]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Complete KYC',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.FAMILY_REFERENCE]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Complete KYC',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.BANK_DETAILS]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Complete KYC',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.AADHAAR_KYC]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Verify Identity',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.FACE_KYC]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Verify Identity',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.APPLICATION_STATUS]: {
    title: 'Under Review',
    heading: 'Your Application is Under Review',
    description:
      "We're carefully reviewing your application details. This process can take up to 3 days.",
    actionLabel: 'Track Status',
    titleBadgeVariant: 'warning',
    illustrationSource: IMAGES.TOOLS,
    hideProgressStepper: true,
  },
  [UserStagesInBackend.ENACH]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Setup AutoPay',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.ESIGN]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'Sign Agreement',
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.WAITING_FOR_DISBURSEMENT]: {
    title: DEFAULT_TITLE,
    heading: DEFAULT_HEADING,
    description: DEFAULT_DESCRIPTION,
    actionLabel: 'View Status',
    hideProgressStepper: true,
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.ACTIVE_LOAN_DASHBOARD]: {
    title: 'Loan Status',
    heading: 'Your loan is active',
    description:
      'Your loan is active. Close on time to avoid late fees and save on interest.',
    actionLabel: 'Pay Now',
    statusPill: 'Active Loan',
    hideProgressStepper: true,
    illustrationSource: IMAGES.ACTIVE_LOAN,
  },
  [UserStagesInBackend.CBL_JOURNEY]: {
    title: DEFAULT_TITLE,
    heading: CBL_HEADING,
    description: '',
    actionLabel: 'Reapply',
    hideAction: true,
    actionMessage: CBL_FOOTER_MESSAGE,
    stripLabel: CBL_STRIP_LABEL,
    illustrationSource: IMAGES.TOOLS,
  },
  [UserStagesInBackend.REJECTED]: {
    title: DEFAULT_TITLE,
    heading: CBL_HEADING,
    description: '',
    actionLabel: 'Reapply',
    hideAction: true,
    actionMessage: CBL_FOOTER_MESSAGE,
    stripLabel: CBL_STRIP_LABEL,
    illustrationSource: IMAGES.TOOLS,
  },
};

const DEFAULT_STAGE_CONFIG: LoanStatusCardStageConfig = {
  title: DEFAULT_TITLE,
  heading: DEFAULT_HEADING,
  description: DEFAULT_DESCRIPTION,
  actionLabel: 'Continue Journey',
};

/**
 * Returns the loan status card display config for the given user stage.
 * Uses default config when stage is undefined or not in the map.
 */
export function getLoanStatusCardStageConfig(
  stage: UserStagesInBackend
): LoanStatusCardStageConfig {
  // if (!stage) return DEFAULT_STAGE_CONFIG;
  return LOAN_STATUS_CARD_STAGE_CONFIG[stage];
}
