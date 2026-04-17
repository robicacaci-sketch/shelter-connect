/**
 * stepLinks.ts (frontend copy)
 * Maps keywords in roadmap step titles to direct agency links + instructions.
 * Used by RoadmapDisplay to show a "Do it online" section per step.
 */

export interface OnlineOption {
  url: string;
  label: string;
  instructions: string;
}

interface StepLinkRule {
  keywords: string[];
  option: OnlineOption;
}

const STEP_LINK_RULES: StepLinkRule[] = [
  {
    keywords: ["birth cert", "vital records", "birth record", "birth registration"],
    option: {
      url: "https://www.nj.gov/health/vital/order-cert/",
      label: "Order NJ Birth Certificate Online",
      instructions:
        "Click 'Order a New Jersey Vital Record' → select Birth Certificate → enter the client's full name and date of birth → choose standard delivery. If the client has no photo ID, call 609-292-4087 before ordering to request the homeless applicant fee waiver.",
    },
  },
  {
    keywords: ["mvc", "motor vehicle", "state id", "non-driver", "non driver", "driver's license", "drivers license", "nj id"],
    option: {
      url: "https://telegov.njportal.com/njmvc/AppointmentWizard",
      label: "Schedule NJ MVC Appointment Online",
      instructions:
        "Select 'Non-Driver ID' from the service list → choose the nearest MVC agency → pick an available date → confirm the appointment. Bring birth certificate, Social Security card, and a Homeless Verification Letter (accepted as NJ address proof). Ask for the fee waiver at the counter.",
    },
  },
  {
    keywords: ["social security", "ssn", "ss card", "ssa", "social security card", "replacement card"],
    option: {
      url: "https://www.ssa.gov/number-card/replace-card",
      label: "Request Replacement SSN Card Online (SSA)",
      instructions:
        "Click 'Request a replacement card' → create or sign into a free my Social Security account → verify identity online → submit the request. The card arrives by mail in 10–14 business days at no charge. Bring the birth certificate to the appointment if online verification fails.",
    },
  },
  {
    keywords: ["familycare", "medicaid", "njhelps", "snap", "food stamp", "nj benefits", "benefit application"],
    option: {
      url: "https://www.njhelps.org",
      label: "Apply for NJ Benefits at NJHelps.org",
      instructions:
        "Click 'Apply Now' → select all relevant programs (NJ FamilyCare, SNAP, WorkFirst NJ) → complete the online form. A Social Security number is not required to start. Standard processing is 30 days; emergency SNAP can be approved in 7 days.",
    },
  },
  {
    keywords: ["veteran", "dd-214", "dd214", "military record", "va record", "veterans service"],
    option: {
      url: "https://www.va.gov/records/get-military-service-records/",
      label: "Request DD-214 / Military Records (VA.gov)",
      instructions:
        "Click 'Get your VA records online' → sign in with a VA.gov or ID.me account → select 'Request your military records (DD-214)' → submit the eVetRecs form. Standard processing is 2–4 weeks. Check the 'Homeless Veteran' box for expedited handling.",
    },
  },
  {
    keywords: ["dca", "section 8", "housing assistance", "rental assistance", "hpp", "homelessness prevention", "housing voucher"],
    option: {
      url: "https://www.nj.gov/dca/divisions/dhcr/offices/homeprev.html",
      label: "Apply for NJ Housing Assistance (DCA / HPP)",
      instructions:
        "Scroll to the county contacts table → find the client's county HPP coordinator → call or email to start the application. For the fastest path, also call NJ 211 (dial 2-1-1) to get a direct warm referral to the county coordinator.",
    },
  },
  {
    keywords: ["211", "nj 211", "emergency shelter", "crisis shelter", "outreach"],
    option: {
      url: "https://www.nj211.org",
      label: "Find Emergency Services via NJ 211 Online",
      instructions:
        "Click 'Find Help' → enter the client's ZIP code → filter by Shelter, Housing, or Food. Available 24/7 — you can also text the ZIP code to 898-211 or simply dial 2-1-1 from any phone.",
    },
  },
  {
    keywords: ["legal services", "eviction", "lsnj", "legal aid", "housing court"],
    option: {
      url: "https://www.lsnj.org/LegalTopics/Housing.aspx",
      label: "Apply for Free Legal Aid (Legal Services of NJ)",
      instructions:
        "Click 'Apply for Services' → select Housing as the legal issue → enter county and income information → submit the online intake form. Free for income-qualifying NJ residents. You can also call 1-888-576-5529 Mon–Fri.",
    },
  },
  {
    keywords: ["reentry", "re-entry", "parole", "post-release", "njdoc"],
    option: {
      url: "https://www.njreentry.org",
      label: "NJ Reentry Housing & Services Directory",
      instructions:
        "Click 'Find Services' → select the client's county → browse housing, legal, and benefits programs for returning citizens. You can also call the NJ Reentry Support Line at 1-844-917-2325 for immediate phone assistance.",
    },
  },
  {
    keywords: ["domestic violence", "dv shelter", "safe address", "acp", "address confidentiality"],
    option: {
      url: "https://www.njcasa.org/find-help/",
      label: "Find NJ Domestic Violence Services (NJCASA)",
      instructions:
        "Click 'Find Help Near You' → enter the client's county → locate the nearest DV shelter and advocate. DV shelters use a safe address system — do not use the abuser's address on any documents. The advocate can enroll the client in the NJ Address Confidentiality Program (ACP).",
    },
  },
  {
    keywords: ["coordinated entry", "hmis", "coc", "continuum of care"],
    option: {
      url: "https://www.211nj.org/housing/",
      label: "NJ Coordinated Entry / CoC Housing Access (211NJ)",
      instructions:
        "Click 'Housing Resources' → find your county's Coordinated Entry point of contact → call or walk in to complete a VI-SPDAT assessment. This assessment is required to access permanent supportive housing, rapid rehousing, and emergency housing vouchers (EHV).",
    },
  },
];

export function getOnlineOptionForStep(
  actionTitle: string,
  extraText?: string
): OnlineOption | null {
  const haystack = `${actionTitle} ${extraText ?? ""}`.toLowerCase();
  for (const rule of STEP_LINK_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.option;
    }
  }
  return null;
}
