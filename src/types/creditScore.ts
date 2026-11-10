export interface CreditScoreDetailsRequest {
  fullName: string;
  panNumber: string;
  dob: string;
  mobileNumber: string;
  consent: boolean;
}

export type CreditScorePullRequest = CreditScoreDetailsRequest | { checkOnly: true };

export interface CreditHealthFactor {
  category: string;
  rating: string;
  percentage: number;
  description: string;
}

export interface CreditConsumer {
  name: string;
  dob: string;
  email?: string;
  pan: string;
  mobile: string;
  address?: string;
}

export interface CreditAccount {
  lender: string;
  type: string;
  sanctionedAmount: number | null;
  outstandingAmount: number | null;
  status: string;
}

export interface CreditPaymentMonth {
  key: string;
  DaysPastDue: number;
}

export interface CreditReportData {
  creditScore: number;
  consumer: CreditConsumer;
  creditHealthBreakdown: Record<string, CreditHealthFactor>;
  creditSummary: {
    activeAccounts: number;
    totalAccounts: number;
    onTimePaymentPercentage: number;
    totalEnquiries: number;
    totalCreditLimit: number | null;
  };
  accounts: CreditAccount[];
  paymentHistory12Months: CreditPaymentMonth[];
  recentEnquiries: { lender: string; type: string; date: string }[];
}

export interface CreditScorePullResponse {
  success: boolean;
  reportAvailable: boolean;
  message: string;
  pdfUrl: string;
  data: CreditReportData | null;
}
