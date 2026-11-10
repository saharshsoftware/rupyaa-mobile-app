export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  creditScore: number;
  accountBalance: number;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'debit' | 'credit' | 'emi' | 'payment';
  amount: number;
  description: string;
  category: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending' | 'overdue';
  dueDate: string;
  type: 'emi' | 'prepayment' | 'penalty';
}

export interface CreditCard {
  id: string;
  userId: string;
  cardNumber: string;
  cardType: 'visa' | 'mastercard' | 'rupay';
  expiryDate: string;
  limit: number;
  available: number;
  dueAmount: number;
  dueDate: string;
  status: 'active' | 'blocked' | 'expired';
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'payment';
  date: string;
  read: boolean;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  /** Substring of title to render in primary green color */
  titleHighlight?: string;
  subtitle: string;
  description?: string;
  image?: any;
}

export type {
  EmploymentType,
  PersonalDetails,
  SalariedDetails,
  SelfEmployedDetails,
  UnemployedDetails,
  EmploymentDetails,
  RegistrationData,
} from './registration';

export type { FlowSubstep, FlowPhaseConfig, StepProps } from './flow';

export type { Product, ProductFeature } from './product';

export type { ApiSuccess, ApiError, ApiResponse } from './api';
export { isApiSuccess, isApiError, isApiResponse } from './api';

export type { GetUserStageResponse, GetUserStageResult } from './user';

export type {
  CurrentOfferResponse,
  CurrentOfferSuccessResponse,
  CurrentOfferNoOfferResponse,
  CurrentOfferOffer,
  CurrentOfferLoanId,
  CurrentEmiOffer,
  CurrentEmiOfferRepaymentPlanItem,
  EmiRepaymentItem,
  EmiApprovedOfferContentProps,
  EmiSummaryCardProps,
  EmiRepaymentCardProps,
  OfferTypeContentProps,
  ApprovedOfferBodyProps,
  PayDayApprovedOfferContentProps,
  OfferDetailRowProps,
  OfferAmountHeaderProps,
} from './offer';
export { isCurrentOfferSuccess } from './offer';

export type {
  ContactDetails,
  AddressDetails,
  PostContactDetailsRequest,
  PostResidenceAddressRequest,
  GetContactDetailsResponse,
  ContactDetailsData,
  ContactFieldOption,
  ContactFieldOptions,
  VerifyOfficeEmailRequest,
  FamilyDetails,
  FamilyMember,
  PostFamilyDetailsRequest,
  ReferenceDetails,
  ReferenceInfo,
  PostReferenceDetailsRequest,
  RelationshipValue,
  BankDetails,
  BankAccountType,
  PostBankDetailsRequest,
} from './kyc';
export { RELATIONSHIP_VALUES, BANK_ACCOUNT_TYPE_VALUES } from './kyc';

export type {
  PermissionStatus,
  PermissionType,
  PlatformAvailability,
  PermissionDefinition,
  PermissionStatusMap,
} from './permissions';

export type {
  WebViewMessageBase,
  BankStatementSuccessPayload,
  DigilockerSuccessPayload,
  FaceKYCSuccessPayload,
} from './webview';

export type {
  Loan,
  EmiBlock,
  EmiBlockStatus,
  EmiRepayment,
  EmiRepaymentSummary,
  EmiRepaymentScheduleItem,
  EmiRepaymentPaymentTotal,
  EmiRepaymentPayAllDue,
  EmiForeclosureBreakdown,
  EmiPaymentContentProps,
  EmiPaymentContentState,
  EmiPaymentDecision,
  EmiProgressHeaderProps,
  EmiRepaymentAccordionBreakdownRow,
  EmiRepaymentAccordionStatusVariant,
  EmiRepaymentAccordionItem,
  EmiRepaymentAccordionProps,
  EmiRepaymentAccordionCardProps,
  EmiPaymentOptionCardProps,
  ActiveEmiTileState,
  ActiveEmiTile,
  ActiveEmiCardProps,
  ActiveEmiTileProps,
  ActiveLoanContentProps,
  ActiveLoanCardProps,
  GetAllUserLoansResponse,
  GetExistingActiveLoanResponse,
  LoanStatus,
  PaymentStatus,
  LoanType,
  EmiRepaymentState,
} from './loans';
export { EMI_BLOCK_STATUS } from './loans';

export type {
  PaymentOrderStatus,
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  OrderStatusResponseData,
} from './payment';

export type {
  ProviderToggle,
  ExternalAppConfigData,
  ExternalAppConfigResponse,
  EncryptionStatusResponse,
} from './app-config';

export type {
  ContactItem,
  GoogleContact,
  GetGoogleContactsResponse,
  DeviceContactRow,
} from './contacts';

export type { StoredPlayInstallReferrerV1 } from './playInstallReferrer';
export { PLAY_INSTALL_REFERRER_STORED_VERSION } from './playInstallReferrer';

export type {
  CreateCustomerTicketRequest,
  CreateCustomerTicketParams,
  CreateCustomerTicketResponse,
} from './support';

export type { CreditScorePullRequest, CreditScorePullResponse } from './creditScore';

export type { RejectionRedirectUrl, RejectionRedirectResponse } from './dsa';
