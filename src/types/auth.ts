export interface MobileVerificationForm {
  phoneNumber: string;
  receiveWhatsappNotification: boolean;
}

export interface OTPVerificationForm {
  otp: string;
  phoneNumber: string;
}

export type OtpChannel = 'sms' | 'whatsapp';

export interface OtpRequestPayload {
  phoneNumber: string;
  channel?: OtpChannel;
}

export interface OtpRequestResult {
  requestId?: string;
  message?: string;
  /** From POST /otp response (`otpLength`) when provided. */
  otpLength?: number;
  raw?: unknown;
}

export interface OtpVerifyPayload {
  phoneNumber: string;
  otp: string;
  requestId?: string;
}

export interface AuthSession {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  isNewUser?: boolean;
  raw?: unknown;
}

export interface VerificationResponse {
  success: boolean;
  message?: string;
}
