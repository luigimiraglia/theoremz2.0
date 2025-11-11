export type LegalInfo = {
  companyName: string;
  vatNumber: string;
  registeredAddress: string;
  supportEmail: string;
  manageBillingUrl: string;
  privacyUrl: string;
  cookieUrl: string;
  competentCourt: string;
};

export function getLegalInfo(): LegalInfo {
  return {
    companyName:
      process.env.NEXT_PUBLIC_COMPANY_NAME || "Theoremz di Luigi Miraglia",
    vatNumber: process.env.NEXT_PUBLIC_COMPANY_VAT || "IT17675281004",
    registeredAddress:
      process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Roma (RM), Italia",
    supportEmail:
      process.env.NEXT_PUBLIC_CONTACT_EMAIL || "theoremz.team@gmail.com",
    manageBillingUrl: process.env.NEXT_PUBLIC_MANAGE_BILLING_URL || "/account",
    privacyUrl:
      process.env.NEXT_PUBLIC_PRIVACY_URL || "/privacy-policy-theoremz.pdf",
    cookieUrl:
      process.env.NEXT_PUBLIC_COOKIE_URL || "/cookie-policy-theoremz.pdf",
    competentCourt: process.env.NEXT_PUBLIC_COMPANY_COURT || "Roma (RM)",
  };
}
