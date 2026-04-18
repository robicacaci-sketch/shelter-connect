export interface OnlineOption {
  url: string;
  label: string;
  instructions: string;
}

const RULES: { keywords: string[]; option: OnlineOption }[] = [
  {
    keywords: ["birth cert", "vital records", "birth record"],
    option: {
      url: "https://www.nj.gov/health/vital/order-vital/online-requests/",
      label: "Order NJ Birth Certificate Online (VitalChek)",
      instructions: "Click 'Order Online' → select Birth Certificate → enter the client's full name and date of birth → choose expedited shipping if urgency requires it. Standard delivery is 6–8 weeks; expedited is 2–3 weeks. Cost is $25 + shipping. Call 609-292-4087 to request a fee waiver for homeless applicants before ordering.",
    },
  },
  {
    keywords: ["mvc", "motor vehicle", "state id", "non-driver", "nj id", "driver's license"],
    option: {
      url: "https://telegov.njportal.com/njmvc/AppointmentWizard",
      label: "Schedule NJ MVC Appointment Online",
      instructions: "Select 'Non-Driver ID' → choose nearest MVC agency → pick an available date → confirm the appointment. Bring birth certificate, SSN card, and a Homeless Verification Letter (accepted as NJ address proof). Ask for the fee waiver ($24) at the counter.",
    },
  },
  {
    keywords: ["social security", "ssn", "ssa", "ss card", "replacement card"],
    option: {
      url: "https://www.ssa.gov/number-card/replace-card",
      label: "Request Replacement SSN Card Online (SSA)",
      instructions: "Click 'Request a replacement card' → create or sign into a free my Social Security account → verify identity online → submit. Card arrives by mail in 10–14 business days at no charge.",
    },
  },
  {
    keywords: ["dv hotline", "domestic violence hotline", "dv shelter", "domestic violence shelter", "shelter system", "njcedv"],
    option: {
      url: "https://njcedv.org/helplines/",
      label: "Find NJ DV Shelter & Hotline (NJCEDV)",
      instructions: "This is the NJ Coalition to End Domestic Violence. Scroll to find your county's local DV program → call their direct line to arrange emergency shelter placement. NJ DV Hotline: 1-800-572-SAFE (7233), available 24/7. The on-site advocate can begin Address Confidentiality Program enrollment immediately.",
    },
  },
  {
    keywords: ["address confidentiality", "acp", "confidential address", "safe address", "safe mailing"],
    option: {
      url: "https://www.nj.gov/dcf/women/acp/",
      label: "NJ Address Confidentiality Program — Apply (NJ DCF)",
      instructions: "Click 'Apply for the ACP' → download the application form → complete it with a DV shelter advocate present → mail to NJ ACP Office, PO Box 207, Trenton NJ 08602. Once enrolled, the client receives a substitute address for all mail and government records. Processing takes 5–10 business days. Free. Call 1-877-218-9133 for help.",
    },
  },
  {
    keywords: ["address proof", "address verification", "proof of address", "address letter", "address verification letter"],
    option: {
      url: "https://www.njhelps.gov",
      label: "Download NJ Benefits Address Verification (NJHelps.gov)",
      instructions: "Sign in at NJHelps.gov → go to 'My Benefits' → select any active benefit (SNAP, Medicaid, etc.) → click 'Print Benefit Letter'. This letter shows the client's name and current address, which satisfies address verification requirements for housing applications.",
    },
  },
  {
    keywords: ["familycare", "medicaid", "njhelps", "snap", "food stamp", "nj benefits"],
    option: {
      url: "https://www.njhelps.gov",
      label: "Apply for NJ Benefits at NJHelps.gov",
      instructions: "Click 'Apply Now' → select programs (NJ FamilyCare, SNAP, WorkFirst NJ) → complete the online form. No SSN required to start. Screening takes 5–10 minutes; full application 20–45 minutes. Emergency SNAP can be approved in 7 days.",
    },
  },
  {
    keywords: ["211", "nj 211", "homelessness prevention", "hpp"],
    option: {
      url: "https://www.nj211.org",
      label: "Find NJ 211 Services Online",
      instructions: "Click 'Find Help' → enter the client's ZIP code → filter by Shelter or Housing. Available 24/7 by texting ZIP to 898-211 or dialing 2-1-1.",
    },
  },
  {
    keywords: ["coordinated entry", "coc", "continuum of care", "hmis"],
    option: {
      url: "https://www.211nj.org/housing/",
      label: "Find NJ CoC Coordinated Entry Contact (211NJ)",
      instructions: "Click 'Housing Resources' → find your county's Coordinated Entry contact → call or walk in for a VI-SPDAT assessment. This is required for emergency housing vouchers and rapid rehousing programs.",
    },
  },
  {
    keywords: ["veteran", "dd-214", "dd214", "va record"],
    option: {
      url: "https://www.va.gov/records/get-military-service-records/",
      label: "Request DD-214 / Military Records (VA.gov)",
      instructions: "Click 'Get your VA records online' → sign in with VA.gov or ID.me → select DD-214 request → submit eVetRecs form. Standard processing is 2–4 weeks. Check 'Homeless Veteran' for expedited handling.",
    },
  },
  {
    keywords: ["dca", "section 8", "rental assistance", "housing assistance", "housing voucher", "emergency housing voucher", "ehv"],
    option: {
      url: "https://www.nj.gov/dca/dhcr/offices/dhcrohp.shtml",
      label: "NJ Office of Homelessness Prevention (DCA)",
      instructions: "This is the NJ DCA Office of Homelessness Prevention. Scroll to find your county's HPP coordinator → call or email to begin a rental assistance application. For fastest results, also call NJ 211 (dial 2-1-1) for a direct warm referral.",
    },
  },
  {
    keywords: ["legal services", "eviction", "legal aid", "lsnj", "housing court"],
    option: {
      url: "https://www.lsnj.org/LegalTopics/Housing.aspx",
      label: "Apply for Free Legal Aid (Legal Services of NJ)",
      instructions: "Click 'Apply for Services' → select Housing → enter county and income → submit intake form. Free for income-qualifying NJ residents. Also call 1-888-576-5529 Mon–Fri.",
    },
  },
  {
    keywords: ["dcpp", "child protection", "permanency", "foster care", "case file", "dcf case", "dcf record"],
    option: {
      url: "https://www.nj.gov/dcf/contact/dcpplocal/",
      label: "Find Local NJ DCPP Office (NJ DCF)",
      instructions: "This page lists all local DCPP offices by county. Find the office for the client's county → call or email to request the case file and any identity documents on record. You can also email Dcfask.Records@dcf.nj.gov directly with the client's name and case number. Include a copy of their ID. Standard turnaround is 5–10 business days.",
    },
  },
  {
    keywords: ["covenant house", "youth shelter", "shelter intake", "youth engagement center", "youth placement"],
    option: {
      url: "https://covenanthousenj.org/",
      label: "Covenant House NJ — Youth Shelter Intake",
      instructions: "Visit covenanthousenj.org → click 'Get Help' to find intake information for the Newark location. Walk-in intake is accepted 24/7 at 330 Washington Street, Newark NJ. You can also call 973-621-8705 or text 844-912-1291. Services are free for youth ages 18–21. Bring any available ID — they will assist with document recovery on-site.",
    },
  },
  {
    keywords: ["dcf transitional", "transitional housing", "youth transitional", "age 18", "adolescent housing", "older youth", "njyrs", "lifeset", "supervised transitional"],
    option: {
      url: "https://www.nj.gov/njyrs/housing/adolescent-hub/",
      label: "NJ DCF Adolescent Housing Hub (Youth Ages 18–21)",
      instructions: "This is the NJ DCF hub for all transitional housing programs for youth ages 18–21. Click 'Find Housing Resources' → select the county → review available programs (Supervised Transitional Living, Permanent Supportive Housing, LifeSet). Call the Adolescent Housing Hub 24/7 at 1-877-652-7624 to begin an application. Email DCF.OfficeofHousing@dcf.nj.gov for non-urgent inquiries.",
    },
  },
  {
    keywords: ["income proof", "income letter", "income verification", "benefit letter", "va benefits", "benefits agency", "income documentation", "proof of income"],
    option: {
      url: "https://www.va.gov/records/download-va-letters/",
      label: "Download VA Benefit Verification Letter (Income Proof)",
      instructions: "Sign in to VA.gov → click 'Download VA Letters' → select 'Benefit Summary Letter' or 'Benefit Verification Letter' → download and print. This letter is official proof of VA income/benefits and is accepted by HUD, landlords, and all NJ housing programs. If the veteran doesn't yet have VA benefits, call 1-877-424-3838 to begin a benefits application.",
    },
  },
  {
    keywords: ["va healthcare", "va health care", "va enrollment", "va medical center", "va health", "enroll in va", "10-10ez"],
    option: {
      url: "https://www.va.gov/health-care/apply-for-health-care-form-10-10ez/",
      label: "Apply for VA Healthcare Online (Form 10-10EZ)",
      instructions: "Click 'Start your application' → sign in with Login.gov or ID.me → complete VA Form 10-10EZ online. Have the veteran's SSN, DD-214, and any insurance information ready. Homeless veterans receive priority enrollment (Priority Group 1). Confirmation letter and VA Health ID card are issued after approval — both required for HUD-VASH eligibility.",
    },
  },
  {
    keywords: ["hud-vash", "hudvash", "vash", "vash voucher", "hud vash", "voucher application", "housing voucher application"],
    option: {
      url: "https://www.va.gov/homeless/hud-vash.asp",
      label: "HUD-VASH Program — Apply Through Local VA",
      instructions: "HUD-VASH applications are submitted through the veteran's assigned VA Medical Center (VAMC). Visit this page → click 'Contact the National Call Center for Homeless Veterans' (1-877-424-3838) → the call center will connect to the local VAMC HUD-VASH coordinator who manages the voucher application. Have SSN card, DD-214, birth certificate, income proof, and VA healthcare enrollment confirmation ready.",
    },
  },
];

export function getOnlineOptionForStep(title: string, extra?: string): OnlineOption | null {
  const text = `${title} ${extra ?? ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) return rule.option;
  }
  return null;
}
