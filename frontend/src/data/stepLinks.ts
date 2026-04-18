export interface OnlineOption {
  url: string;
  label: string;
  instructions: string;
}

const RULES: { keywords: string[]; option: OnlineOption }[] = [
  {
    keywords: ["birth cert", "vital records", "birth record"],
    option: { url: "https://www.nj.gov/health/vital/order-cert/", label: "Order NJ Birth Certificate Online", instructions: "Click 'Order a New Jersey Vital Record' → select Birth Certificate → enter the client's full name and date of birth → choose standard delivery. Call 609-292-4087 to request the homeless applicant fee waiver if client has no photo ID." }
  },
  {
    keywords: ["mvc", "motor vehicle", "state id", "non-driver", "nj id", "driver's license"],
    option: { url: "https://telegov.njportal.com/njmvc/AppointmentWizard", label: "Schedule NJ MVC Appointment Online", instructions: "Select 'Non-Driver ID' → choose nearest MVC agency → pick a date → confirm. Bring birth certificate, SSN card, and a Homeless Verification Letter. Ask for the fee waiver at the counter." }
  },
  {
    keywords: ["social security", "ssn", "ssa", "ss card", "replacement card"],
    option: { url: "https://www.ssa.gov/number-card/replace-card", label: "Request Replacement SSN Card Online (SSA)", instructions: "Click 'Request a replacement card' → create or sign into a my Social Security account → verify identity → submit. Card arrives by mail in 10–14 business days at no charge." }
  },
  {
    keywords: ["dv hotline", "domestic violence hotline", "dv shelter", "domestic violence shelter", "njcasa", "shelter system"],
    option: { url: "https://www.njcasa.org/find-help/", label: "Find NJ DV Shelter & Services (NJCASA)", instructions: "Click 'Find Help Near You' → enter the client's county → locate the nearest DV shelter and advocate. DV shelters use a safe address system — never use the abuser's address on any documents. The on-site advocate can start the shelter placement process immediately." }
  },
  {
    keywords: ["address confidentiality", "acp", "confidential address", "safe address", "safe mailing"],
    option: { url: "https://www.nj.gov/state/acp/index.shtml", label: "NJ Address Confidentiality Program (ACP) — Enroll Online", instructions: "Click 'Apply for the ACP' → download the application form → complete it with the DV shelter advocate present → submit to the NJ ACP office. Once enrolled, the client receives a substitute address for all mail, government records, and housing applications. Processing takes 5–10 business days." }
  },
  {
    keywords: ["address proof", "address verification", "proof of address", "address letter", "address verification letter"],
    option: { url: "https://www.njhelps.org", label: "Download NJ Benefits Address Verification (NJHelps.org)", instructions: "Sign in at NJHelps.org → go to 'My Benefits' → select any active benefit (SNAP, Medicaid, etc.) → click 'Print Benefit Letter'. This letter shows the client's name and current shelter address, which satisfies address verification requirements for housing applications." }
  },
  {
    keywords: ["familycare", "medicaid", "njhelps", "snap", "food stamp", "nj benefits"],
    option: { url: "https://www.njhelps.org", label: "Apply for NJ Benefits at NJHelps.org", instructions: "Click 'Apply Now' → select programs (NJ FamilyCare, SNAP, WorkFirst NJ) → complete the form. No SSN required to start. Emergency SNAP can be approved in 7 days." }
  },
  {
    keywords: ["211", "nj 211", "homelessness prevention", "hpp"],
    option: { url: "https://www.nj211.org", label: "Find NJ 211 Services Online", instructions: "Click 'Find Help' → enter the client's ZIP code → filter by Shelter or Housing. Available 24/7 by texting ZIP to 898-211 or dialing 2-1-1." }
  },
  {
    keywords: ["coordinated entry", "coc", "continuum of care", "hmis"],
    option: { url: "https://www.211nj.org/housing/", label: "Find NJ CoC Coordinated Entry Contact (211NJ)", instructions: "Click 'Housing Resources' → find your county's Coordinated Entry contact → call or walk in for a VI-SPDAT assessment. This is required for emergency housing vouchers and rapid rehousing programs." }
  },
  {
    keywords: ["veteran", "dd-214", "dd214", "va record"],
    option: { url: "https://www.va.gov/records/get-military-service-records/", label: "Request DD-214 / Military Records (VA.gov)", instructions: "Click 'Get your VA records online' → sign in with VA.gov or ID.me → select DD-214 → submit eVetRecs form. Check 'Homeless Veteran' for expedited handling." }
  },
  {
    keywords: ["dca", "section 8", "rental assistance", "housing assistance", "housing voucher", "emergency housing voucher", "ehv"],
    option: { url: "https://www.nj.gov/dca/divisions/dhcr/offices/homeprev.html", label: "Apply for NJ Housing Assistance (DCA/HPP)", instructions: "Scroll to the county contacts table → find the client's county HPP coordinator → call or email to start the application. Also call NJ 211 for a direct referral." }
  },
  {
    keywords: ["legal services", "eviction", "legal aid", "lsnj", "housing court"],
    option: { url: "https://www.lsnj.org/LegalTopics/Housing.aspx", label: "Apply for Free Legal Aid (Legal Services of NJ)", instructions: "Click 'Apply for Services' → select Housing → enter county and income → submit intake form. Free for income-qualifying NJ residents. Also call 1-888-576-5529." }
  },
];

export function getOnlineOptionForStep(title: string, extra?: string): OnlineOption | null {
  const text = `${title} ${extra ?? ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) return rule.option;
  }
  return null;
}
