/**
 * Centralized image and SVG paths for the entire project.
 * Use these constants instead of hardcoded strings to ensure consistency
 * and make path changes easier.
 */

import appLogo from '@/assets/images/app-logo.png';
import customer_care from '@/assets/images/customer-care.png';
import onboardingApplySteps from '@/assets/images/onboarding-apply-steps.png';
import onboardingLoanOffer from '@/assets/images/onboarding-loan-offer.png';
import onboardingApprovalBank from '@/assets/images/onboarding-approval-bank.png';
import exclusiveOffer from '@/assets/images/offer-money.png';
import loanEligibility from '@/assets/images/loan-eligibility.png';
import trustBanner from '@/assets/images/trust-banner.png';
import checkEligibility from '@/assets/images/check-eligibility.png';
import bikeLoan from '@/assets/images/bike-loan.png';
import carLoan from '@/assets/images/car-loan.png';
import instantPersonalLoan from '@/assets/images/instant-personal-loan.png';
import homeLoan from '@/assets/images/home-loan.png';
import laptopLoan from '@/assets/images/laptop-loan.png';
import mobileLoan from '@/assets/images/mobile-loan.png';
import personalLoan from '@/assets/images/personal-loan.png';
import travelLoan from '@/assets/images/travel-loan.png';
import increasedCoins from '@/assets/images/increasing-coin.png';
import congratulationSuccess from '@/assets/images/congratulation-success.png';
import offerAcceptance from '@/assets/images/offer-acceptance.png';
import offerRejection from '@/assets/images/offer-rejection.png';
import loanAgreement from '@/assets/images/loan-agreement.png';
import failedEsign from '@/assets/images/failed-esign.png';
import digilocker from '@/assets/images/digilocker.png';
import tools from '@/assets/images/tools.png';
import whatsappIcon from '@/assets/images/whatsapp-icon.png';
import lock from '@/assets/images/lock.jpeg';
import underReview from '@/assets/images/under-review.png';
import offerVerified from '@/assets/images/offer-verified.png';
import noOfferAvailable from '@/assets/images/no-offer-available.png';
import applicationRejected from '@/assets/images/application-rejected.png';
import zapcashLoading from '@/assets/videos/zapcash-loading.gif';
import icon from '@/assets/images/icon.png';
import enachSuccess from '@/assets/images/enach-success.png'; 
import esignSuccess from '@/assets/images/esign-success.png';
import activeLoan from '@/assets/images/active-loan.png';
import faceKycSuccess from '@/assets/images/face-kyc-success.png';
import zIcon from '@/assets/images/z-icon.png';
import digilockerSuccess from '@/assets/images/digilocker-success.png'; 
import retry from '@/assets/images/retry.png';
import loanSanctioned from '@/assets/images/loan-sanctioned.png';
import rupee from '@/assets/images/rupee.png';
import thunder from '@/assets/images/thunder.png';
import noDocuments from '@/assets/images/no-document.png';
import paymentSuccess from '@/assets/images/payment-success.png';
import noLoan from '@/assets/images/no-loan.png';
import gridImage from '@/assets/images/grid-image.png';
import tiger from '@/assets/images/tiger.png';
import letstalk from '@/assets/images/letstalk.png';
import bigLogo from '@/assets/images/big-logo.png';
import refresh from '@/assets/images/refresh.png';
import nonSalaryAccount from '@/assets/images/non-salary-account.svg';
import winStar from '@/assets/images/win-star.png';
import paymentEmiBg from '@/assets/images/payment-emi-bg.png';
import blurredPrice from '@/assets/images/blurred-price.png';
import rupyaaLogo from '@/assets/images/rupyaa-logo.svg';
import enachShield from '@/assets/images/enach-shield.svg';
import esignVerification from '@/assets/images/esign-verification.svg';
import faceKycIntro from '@/assets/images/face-kyc-intro.svg';
import homeCreditScore from '@/assets/images/home-credit-score.png';
import finalDisbursementReview from '@/assets/images/final-disbursement-review.svg';
import supportAgent from '@/assets/images/support-agent.png';
import assuranceCheckbox from '@/assets/images/assurance-checkbox.svg';
import noPendingDocuments from '@/assets/images/no-pending-documents.png';

// const BUCKET_IMAGE_URL = 'https://wecredit-main-website-assets.s3.ap-south-1.amazonaws.com';

export const IMAGES = {
  APP_LOGO: appLogo,
  CUSTOMER_CARE: customer_care,
  ONBOARDING_APPLY_STEPS: onboardingApplySteps,
  ONBOARDING_LOAN_OFFER: onboardingLoanOffer,
  ONBOARDING_APPROVAL_BANK: onboardingApprovalBank,
  EXCLUSIVE_OFFER: exclusiveOffer,
  LOAN_ELIGIBILITY: loanEligibility,
  TRUST_BANNER: trustBanner,
  CHECK_ELIGIBILITY: checkEligibility,
  BIKE_LOAN: bikeLoan,
  CAR_LOAN: carLoan,
  INSTANT_PERSONAL_LOAN: instantPersonalLoan,
  HOME_LOAN: homeLoan,
  LAPTOP_LOAN: laptopLoan,
  MOBILE_LOAN: mobileLoan,
  PERSONAL_LOAN: personalLoan,
  TRAVEL_LOAN: travelLoan,
  INCREASED_COINS: increasedCoins,
  CONGRATULATION_SUCCESS: congratulationSuccess,
  OFFER_ACCEPTANCE: offerAcceptance,
  OFFER_REJECTION: offerRejection,
  LOAN_AGREEMENT: loanAgreement,
  FAILED_ESIGN: failedEsign,
  DIGILOCKER: digilocker,
  TOOLS: tools,
  WHATSAPP_ICON: whatsappIcon,
  LOCK: lock,
  ENACH_SUCCESS: enachSuccess,
  ESIGN_SUCCESS: esignSuccess,
  Z_ICON: zIcon,
  /** Offer status step illustrations (placeholders; swap assets when ready). */
  OFFER_STATUS_VERIFIED: offerVerified,
  OFFER_STATUS_PENDING: offerAcceptance,
  OFFER_STATUS_REJECTED: offerRejection,
  UNDER_REVIEW: underReview,
  NO_OFFER_AVAILABLE: noOfferAvailable,
  NO_OFFER_AVAILABLE_ILLUSTRATION: noOfferAvailable,
  APPLICATION_REJECTED: applicationRejected,
  ICON: icon,
  ACTIVE_LOAN: activeLoan,
  FACE_KYC_SUCCESS: faceKycSuccess,
  DIGILOCKER_SUCCESS: digilockerSuccess,
  RETRY: retry,
  LOAN_SANCTIONED: loanSanctioned,
  RUPEE: rupee,
  THUNDER: thunder,
  NO_DOCUMENT: noDocuments,
  PAYMENT_SUCCESS: paymentSuccess,
  NO_LOAN: noLoan,
  GRID_IMAGE: gridImage,
  TIGER: tiger,
  LETSTALK: letstalk,
  BIG_LOGO: bigLogo,
  REFRESH: refresh,
  NON_SALARY_ACCOUNT: nonSalaryAccount,
  WIN_STAR: winStar,
  PAYMENT_EMI_BG: paymentEmiBg,
  BLURRED_PRICE: blurredPrice,
  RUPYAA_LOGO: rupyaaLogo,
  ENACH_SHIELD: enachShield,
  ESIGN_VERIFICATION: esignVerification,
  FACE_KYC_INTRO: faceKycIntro,
  HOME_CREDIT_SCORE: homeCreditScore,
  FINAL_DISBURSEMENT_REVIEW: finalDisbursementReview,
  SUPPORT_AGENT: supportAgent,
  ASSURANCE_CHECKBOX: assuranceCheckbox,
  NO_PENDING_DOCUMENTS: noPendingDocuments,
} as const;

export const GIF_VIDEOS = {
  ZAPCASH_LOADING: zapcashLoading,
} as const;
