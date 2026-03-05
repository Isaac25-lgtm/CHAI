/**
 * CHAI PMTCT Assessment Engine - Section & Question Definitions
 *
 * Complete data-driven configuration for all 16 assessment sections.
 * Each section defines its scoring paradigm, questions, branching logic,
 * and evidence requirements.
 */

import type { ResponseType, ScoringParadigm } from '@/types';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface QuestionDef {
  code: string;
  text: string;
  helpText?: string;
  responseType: ResponseType;
  required: boolean;
  requiresEvidence: boolean;
  options?: { value: string; label: string }[];
  branchCondition?: {
    questionCode: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt';
    value: string;
  };
  scoringWeight?: number;
  sortOrder: number;
}

export interface SectionDef {
  number: number;
  title: string;
  description: string;
  scoringParadigm: ScoringParadigm;
  isScored: boolean;
  questions: QuestionDef[];
}

// ---------------------------------------------------------------------------
// Helper – generates the 3 standard register questions for Section 1
// ---------------------------------------------------------------------------

function registerQuestions(
  prefix: string,
  registerName: string,
  startOrder: number,
): QuestionDef[] {
  return [
    {
      code: `${prefix}_AVAIL`,
      text: `Is the ${registerName} register available at the facility?`,
      helpText: `Verify physical presence of the ${registerName} register.`,
      responseType: 'YES_NO',
      required: true,
      requiresEvidence: true,
      sortOrder: startOrder,
    },
    {
      code: `${prefix}_CURRENT`,
      text: `Is the ${registerName} register the standard/current MoH version?`,
      helpText: 'Check for MoH approval stamp or version number on the register cover.',
      responseType: 'YES_NO',
      required: true,
      requiresEvidence: true,
      branchCondition: { questionCode: `${prefix}_AVAIL`, operator: 'eq', value: 'YES' },
      sortOrder: startOrder + 1,
    },
    {
      code: `${prefix}_COMPLETE`,
      text: `Is the ${registerName} register adequately completed (>90% of fields for last 10 entries)?`,
      helpText: 'Review the last 10 entries and estimate the proportion of columns completed.',
      responseType: 'YES_NO',
      required: true,
      requiresEvidence: true,
      branchCondition: { questionCode: `${prefix}_AVAIL`, operator: 'eq', value: 'YES' },
      sortOrder: startOrder + 2,
    },
  ];
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const ASSESSMENT_SECTION_DEFS: SectionDef[] = [
  // =========================================================================
  // SECTION 1 – ANC / Maternity / PNC Registers
  // =========================================================================
  {
    number: 1,
    title: 'ANC / Maternity / PNC Registers',
    description:
      'Assesses the availability, currency and completeness of key PMTCT-related registers at the facility. A strong register system is foundational for service delivery monitoring.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      ...registerQuestions('S1_ANC', 'ANC (Antenatal Care)', 1),
      ...registerQuestions('S1_MAT', 'Maternity', 4),
      ...registerQuestions('S1_PNC', 'PNC (Postnatal Care)', 7),
      ...registerQuestions('S1_FP', 'Family Planning', 10),
      ...registerQuestions('S1_ART', 'ART', 13),
      ...registerQuestions('S1_HEI', 'HEI (HIV-Exposed Infant)', 16),
      ...registerQuestions('S1_SGBV', 'SGBV (Sexual & Gender-Based Violence)', 19),
      ...registerQuestions('S1_APPT', 'Appointment', 22),
      ...registerQuestions('S1_MISS', 'Missed Appointment / Defaulter', 25),
    ],
  },

  // =========================================================================
  // SECTION 2 – Patient / Beneficiary Records
  // =========================================================================
  {
    number: 2,
    title: 'Patient / Beneficiary Records',
    description:
      'Evaluates the existence, security and organisation of individual patient records/files used for PMTCT services.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S2_Q1',
        text: 'Do individual patient records/files exist for PMTCT clients?',
        helpText: 'Check for physical patient folders, cards or electronic patient records.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S2_Q2',
        text: 'Are patient records stored securely and confidentially?',
        helpText: 'Records should be in a lockable cabinet/room with restricted access.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S2_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S2_Q3',
        text: 'Is there an organised filing/retrieval system for patient records?',
        helpText: 'E.g. alphabetical, by ART number, colour-coded, or electronic index.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S2_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
      {
        code: 'S2_Q4',
        text: 'Can PMTCT client categories (e.g. HIV+, ANC-only, HEI) be identified from the filing system?',
        helpText: 'Look for colour coding, tabs, or labels that distinguish PMTCT sub-populations.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S2_Q3', operator: 'eq', value: 'YES' },
        sortOrder: 4,
      },
      {
        code: 'S2_Q5',
        text: 'Is there a written SOP for records management at this facility?',
        helpText: 'Request to see the SOP document; verify it covers filing, access control and archiving.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S2_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 5,
      },
    ],
  },

  // =========================================================================
  // SECTION 3 – Triple Elimination Testing
  // =========================================================================
  {
    number: 3,
    title: 'Triple Elimination Testing',
    description:
      'Measures the coverage of HIV, Syphilis and Hepatitis B testing among ANC clients to track progress toward triple elimination of mother-to-child transmission.',
    scoringParadigm: 'PERCENTAGE_BASED',
    isScored: true,
    questions: [
      {
        code: 'S3_Q1',
        text: 'Number of new ANC1 clients (first antenatal visit) this reporting period',
        helpText: 'Source: ANC register. Count unique new clients, not revisits.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 0,
        sortOrder: 1,
      },
      {
        code: 'S3_Q2',
        text: 'Number of ANC1 clients tested for HIV',
        helpText: 'Include those tested at ANC, lab or via self-test with confirmatory.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S3_Q3',
        text: 'Number of ANC1 clients who tested HIV positive',
        helpText: 'New positives identified this period (exclude known positives).',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 3,
      },
      {
        code: 'S3_Q4',
        text: 'Number of ANC1 clients tested for Syphilis',
        helpText: 'Include RPR/VDRL or rapid syphilis test.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 4,
      },
      {
        code: 'S3_Q5',
        text: 'Number of ANC1 clients who tested Syphilis positive',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 5,
      },
      {
        code: 'S3_Q6',
        text: 'Number of ANC1 clients tested for Hepatitis B (HBsAg)',
        helpText: 'Rapid HBsAg test or lab ELISA.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 6,
      },
      {
        code: 'S3_Q7',
        text: 'Number of ANC1 clients who tested Hepatitis B positive',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 7,
      },
      {
        code: 'S3_Q8',
        text: 'Is re-testing of previously HIV-negative women done (per national guidelines)?',
        helpText: 'Check for evidence of re-testing in 3rd trimester or at labour/delivery.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 8,
      },
      {
        code: 'S3_Q9',
        text: 'Is partner/male testing routinely offered at ANC?',
        helpText: 'Look for partner testing register or invitation letters.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 9,
      },
      {
        code: 'S3_Q10',
        text: 'Is HIV self-testing available and offered to ANC clients or partners?',
        helpText: 'Verify availability of HIVST kits and distribution records.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 10,
      },
    ],
  },

  // =========================================================================
  // SECTION 4 – Triple Elimination Linkage to Treatment
  // =========================================================================
  {
    number: 4,
    title: 'Triple Elimination Linkage to Treatment',
    description:
      'Assesses whether women identified as positive for HIV, Syphilis or Hepatitis B are promptly linked to treatment or management.',
    scoringParadigm: 'PERCENTAGE_BASED',
    isScored: true,
    questions: [
      {
        code: 'S4_Q1',
        text: 'Number of HIV-positive pregnant/lactating women identified this period',
        helpText: 'Include new positives and those with known status presenting to ANC.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 1,
      },
      {
        code: 'S4_Q2',
        text: 'Number of HIV-positive women initiated on (or already on) ART',
        helpText: 'Cross-check ART register and ANC register.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S4_Q3',
        text: 'Number of Syphilis-positive pregnant women identified this period',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 3,
      },
      {
        code: 'S4_Q4',
        text: 'Number of Syphilis-positive women who received appropriate treatment',
        helpText: 'Benzathine Penicillin G injection documented.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 4,
      },
      {
        code: 'S4_Q5',
        text: 'Number of Hepatitis B-positive pregnant women identified this period',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 5,
      },
      {
        code: 'S4_Q6',
        text: 'Number of Hepatitis B-positive women managed or referred appropriately',
        helpText: 'Documented referral or on-site management per national guidelines.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 6,
      },
    ],
  },

  // =========================================================================
  // SECTION 5 – ART in PMTCT / Quality of Services
  // =========================================================================
  {
    number: 5,
    title: 'ART in PMTCT Facilities / Quality of Services',
    description:
      'Composite assessment: Part A evaluates availability of key clinical services for PMTCT clients. Part B is a 10-chart audit measuring quality of individual care.',
    scoringParadigm: 'COMPOSITE',
    isScored: true,
    questions: [
      // Part A – Service availability
      {
        code: 'S5_A1',
        text: 'Is STI screening routinely done for PMTCT clients?',
        helpText: 'Verify through ANC register or client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 1,
      },
      {
        code: 'S5_A2',
        text: 'Is cervical cancer screening (VIA/VILI or HPV) available for HIV-positive women?',
        helpText: 'Check for cervical cancer screening register or documented referrals.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S5_A3',
        text: 'Is SGBV screening routinely done during ANC/PMTCT visits?',
        helpText: 'Look for screening tool or documented assessment in client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 3,
      },
      {
        code: 'S5_A4',
        text: 'Is family planning counselling provided to PMTCT clients?',
        helpText: 'Evidence of FP discussion documented in client files or registers.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 4,
      },
      {
        code: 'S5_A5',
        text: 'Is viral load testing done for PMTCT clients per national schedule?',
        helpText: 'Check VL request forms, lab register or electronic records.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 5,
      },
      {
        code: 'S5_A6',
        text: 'Is Intensive Adherence Counselling (IAC) provided for unsuppressed clients?',
        helpText: 'Review charts of clients with VL > 1000 copies/ml for IAC documentation.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        branchCondition: { questionCode: 'S5_A5', operator: 'eq', value: 'YES' },
        sortOrder: 6,
      },
      {
        code: 'S5_A7',
        text: 'Is CTX (Cotrimoxazole) prophylaxis provided to eligible PMTCT clients?',
        helpText: 'Verify through pharmacy records or client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 7,
      },
      // Part B – 10-Chart Audit (sampled rows)
      {
        code: 'S5_B_CHARTS',
        text: '10-Chart Clinical Audit: For each of 10 randomly selected PMTCT client charts, verify the following indicators.',
        helpText:
          'Select 10 active PMTCT client charts. For each chart record whether VL was done, VL is suppressed (<1000), STI screening documented, FP counselling documented, and retention status documented.',
        responseType: 'SAMPLED_ROWS',
        required: true,
        requiresEvidence: true,
        scoringWeight: 2,
        sortOrder: 8,
      },
    ],
  },

  // =========================================================================
  // SECTION 6 – Patient Tracking (HIV+ Pregnant Women)
  // =========================================================================
  {
    number: 6,
    title: 'Patient Tracking (HIV+ Pregnant Women)',
    description:
      'Evaluates the systems in place to track HIV-positive pregnant and lactating women through the PMTCT cascade, including defaulter tracing.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S6_Q1',
        text: 'Is a defaulter tracking system in place for HIV+ pregnant/lactating women?',
        helpText: 'Check for tracking tools: appointment diary, phone call logs, CHW referrals, electronic alerts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S6_Q2',
        text: 'Is there evidence of tracking activities conducted in the last quarter?',
        helpText: 'Review phone call logs, CHW reports, or tracking forms from the last 3 months.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S6_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S6_Q3',
        text: 'Are tracked patients documented as returned to care?',
        helpText: 'Cross-check tracking records with appointment register or ART records.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S6_Q2', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
      {
        code: 'S6_Q4',
        text: 'Is tracking data used to update facility LTFU (Lost-to-Follow-Up) indicators?',
        helpText: 'Ask data focal person how LTFU is calculated and whether tracking outcomes feed into it.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S6_Q2', operator: 'eq', value: 'YES' },
        sortOrder: 4,
      },
      {
        code: 'S6_Q5',
        text: 'Is there a written SOP for defaulter tracking of PMTCT clients?',
        helpText: 'Request to see the SOP; verify it specifies timelines, responsibilities and escalation.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S6_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 5,
      },
    ],
  },

  // =========================================================================
  // SECTION 7 – Adherence Support
  // =========================================================================
  {
    number: 7,
    title: 'Adherence Support',
    description:
      'Assesses the systems and practices for supporting ART adherence among PMTCT clients.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S7_Q1',
        text: 'Is pre-ART/treatment readiness counselling provided before ART initiation?',
        helpText: 'Review client charts for documentation of pre-ART counselling session.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S7_Q2',
        text: 'Is routine adherence assessment done at each PMTCT clinic visit?',
        helpText: 'Look for pill count, self-report or pharmacy refill records in client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S7_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S7_Q3',
        text: 'Are adherence interventions documented for clients identified with poor adherence?',
        helpText: 'Check for IAC sessions, peer support referrals or documented action plans.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S7_Q2', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
      {
        code: 'S7_Q4',
        text: 'Is there a written adherence support algorithm or SOP?',
        helpText: 'Request the document; verify it includes assessment criteria, interventions and escalation.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S7_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 4,
      },
    ],
  },

  // =========================================================================
  // SECTION 8 – Facility Linkage to Community Care & Support
  // =========================================================================
  {
    number: 8,
    title: 'Facility Linkage to Community Care & Support',
    description:
      'Assesses whether the facility has functional referral linkages to community-based services for PMTCT clients.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S8_Q1',
        text: 'Are referrals to community support services documented for PMTCT clients?',
        helpText: 'Check referral forms, referral register or linkage facilitator records.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S8_Q2',
        text: 'Is follow-up done to confirm the client accessed community services?',
        helpText: 'Look for counter-referral forms or follow-up notes in client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S8_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S8_Q3',
        text: 'Is there a routine review of referral outcomes with the community team?',
        helpText: 'Ask for minutes or records of coordination meetings between facility and community health workers.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S8_Q2', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
    ],
  },

  // =========================================================================
  // SECTION 9 – STI Screening & Management
  // =========================================================================
  {
    number: 9,
    title: 'STI Screening & Management',
    description:
      'Evaluates the practice of STI screening, availability of treatment protocols and partner notification at the ANC clinic.',
    scoringParadigm: 'COUNT_BASED',
    isScored: true,
    questions: [
      {
        code: 'S9_Q1',
        text: 'Is syndromic STI screening routinely done in ANC?',
        helpText: 'Check ANC register for STI screening column or client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 1,
      },
      {
        code: 'S9_Q2',
        text: 'Are national STI treatment protocols/guidelines available at the facility?',
        helpText: 'Verify physical or electronic copy of STI treatment guidelines.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S9_Q3',
        text: 'Is partner notification and/or treatment practiced for STI-positive clients?',
        helpText: 'Look for partner notification slips or documented counselling in client charts.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 3,
      },
      {
        code: 'S9_Q4',
        text: 'Number of charts reviewed (out of 10) with evidence of STI screening',
        helpText: 'From the 10-chart review in Section 5, count those with documented STI screening.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 4,
      },
    ],
  },

  // =========================================================================
  // SECTION 10 – Early Infant Diagnosis (EID)
  // =========================================================================
  {
    number: 10,
    title: 'Early Infant Diagnosis (EID)',
    description:
      'Composite assessment of the DBS sample collection process for HIV-exposed infants, whether on-site or by referral, and the return and disclosure of results.',
    scoringParadigm: 'COMPOSITE',
    isScored: true,
    questions: [
      {
        code: 'S10_Q1',
        text: 'Is DBS (Dried Blood Spot) sample collection done on-site at this facility?',
        helpText: 'Verify presence of DBS collection materials and trained staff.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      // On-site branch
      {
        code: 'S10_Q2',
        text: 'Number of HEIs eligible for 1st DNA PCR test this period',
        helpText: 'Infants born to HIV+ mothers reaching 6 weeks of age.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S10_Q3',
        text: 'Number of eligible HEIs with DBS sample collected on-site',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'YES' },
        scoringWeight: 1,
        sortOrder: 3,
      },
      {
        code: 'S10_Q4',
        text: 'Number of DBS results returned to the facility',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'YES' },
        scoringWeight: 1,
        sortOrder: 4,
      },
      {
        code: 'S10_Q5',
        text: 'Number of DBS results given to the caregiver/mother',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'YES' },
        scoringWeight: 1,
        sortOrder: 5,
      },
      // Referral branch
      {
        code: 'S10_Q6',
        text: 'Is there a documented referral process for DBS sample collection?',
        helpText: 'Verify referral forms, referral register or documented pathway.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'NO' },
        sortOrder: 6,
      },
      {
        code: 'S10_Q7',
        text: 'Number of HEIs referred for DBS sample collection this period',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'NO' },
        sortOrder: 7,
      },
      {
        code: 'S10_Q8',
        text: 'Number of referred HEIs confirmed to have had DBS collected at the referral site',
        helpText: 'Cross-check with counter-referral forms or phone follow-up logs.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        branchCondition: { questionCode: 'S10_Q1', operator: 'eq', value: 'NO' },
        scoringWeight: 1,
        sortOrder: 8,
      },
    ],
  },

  // =========================================================================
  // SECTION 11 – CTX for HIV-Exposed Infants
  // =========================================================================
  {
    number: 11,
    title: 'CTX for HIV-Exposed Infants',
    description:
      'Measures the proportion of HIV-exposed infants who receive timely Cotrimoxazole prophylaxis.',
    scoringParadigm: 'COUNT_BASED',
    isScored: true,
    questions: [
      {
        code: 'S11_Q1',
        text: 'Number of HIV-exposed infants (HEIs) eligible for CTX prophylaxis this period',
        helpText: 'All HEIs from 6 weeks of age.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 1,
      },
      {
        code: 'S11_Q2',
        text: 'Number of eligible HEIs initiated on CTX by 6-8 weeks of age',
        helpText: 'Cross-check HEI register and pharmacy records.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S11_Q3',
        text: 'Is there evidence of CTX prophylaxis documentation in HEI records?',
        helpText: 'Review HEI register and individual HEI cards/charts for CTX entries.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 3,
      },
    ],
  },

  // =========================================================================
  // SECTION 12 – Tracking HIV-Exposed Infants
  // =========================================================================
  {
    number: 12,
    title: 'Tracking HIV-Exposed Infants',
    description:
      'Evaluates systems for tracking mother-baby pairs and HIV-exposed infants through the full PMTCT follow-up period until final HIV status determination.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S12_Q1',
        text: 'Is a mother-baby pair tracking system in place?',
        helpText: 'Check for paired identifiers, linked registers or electronic tracking.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S12_Q2',
        text: 'Are HEIs tracked through the end of breastfeeding period?',
        helpText: 'Verify follow-up appointments extend beyond cessation of breastfeeding.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S12_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S12_Q3',
        text: 'Is final HIV status documented for discharged HEIs?',
        helpText: 'Check for final antibody test result (18 months or 6 weeks after cessation of breastfeeding).',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S12_Q2', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
      {
        code: 'S12_Q4',
        text: 'Is defaulter tracing done for HEIs lost to follow-up?',
        helpText: 'Look for tracking forms, phone call logs or CHW reports for lost HEIs.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S12_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 4,
      },
      {
        code: 'S12_Q5',
        text: 'Is there a written SOP for HEI tracking and follow-up?',
        helpText: 'Request the SOP; verify it covers timelines, responsibilities and final outcome documentation.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S12_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 5,
      },
    ],
  },

  // =========================================================================
  // SECTION 13 – Enrolment of HIV-Infected Infants into ART
  // =========================================================================
  {
    number: 13,
    title: 'Enrolment of HIV-Infected Infants into ART',
    description:
      'Measures the linkage of HIV-positive infants to ART services, including documentation of ART initiation and clinic linkage.',
    scoringParadigm: 'COUNT_BASED',
    isScored: true,
    questions: [
      {
        code: 'S13_Q1',
        text: 'Number of infants diagnosed HIV-positive this period',
        helpText: 'From EID results: count of positive DNA PCR or rapid test results.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 1,
      },
      {
        code: 'S13_Q2',
        text: 'Number of HIV-positive infants initiated on ART',
        helpText: 'Cross-check with ART register for paediatric initiations.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S13_Q3',
        text: 'Number of HIV-positive infants with documented ART number and start date',
        helpText: 'Verify unique ART number assigned and start date recorded in register.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 3,
      },
      {
        code: 'S13_Q4',
        text: 'Number of HIV-positive infants linked to the ART clinic (if separate from PMTCT)',
        helpText: 'Applicable where ART clinic is separate; verify transfer/linkage documentation.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        scoringWeight: 1,
        sortOrder: 4,
      },
    ],
  },

  // =========================================================================
  // SECTION 14 – HEI / EID Registers
  // =========================================================================
  {
    number: 14,
    title: 'HEI / EID Registers',
    description:
      'Assesses the availability, quality and use of the HEI/EID register at the facility.',
    scoringParadigm: 'MATURITY_LADDER',
    isScored: true,
    questions: [
      {
        code: 'S14_Q1',
        text: 'Is the HEI/EID register available at the facility?',
        helpText: 'Verify physical presence of the register.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 1,
      },
      {
        code: 'S14_Q2',
        text: 'Is the HEI/EID register the standard/current MoH version?',
        helpText: 'Check version number or MoH approval stamp.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S14_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 2,
      },
      {
        code: 'S14_Q3',
        text: 'Is the HEI/EID register adequately completed (>90% of fields for last 10 entries)?',
        helpText: 'Review last 10 entries and estimate completion rate.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S14_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 3,
      },
      {
        code: 'S14_Q4',
        text: 'Is client confidentiality maintained for the HEI/EID register?',
        helpText: 'Register should not be left open/exposed in public areas.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 4,
      },
      {
        code: 'S14_Q5',
        text: 'Is the HEI/EID register stored securely?',
        helpText: 'Should be in a lockable cabinet or secure room when not in use.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 5,
      },
      {
        code: 'S14_Q6',
        text: 'Is the HEI/EID register actively used for reporting and clinical follow-up?',
        helpText: 'Ask staff how data is extracted for monthly reports and patient tracking.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        branchCondition: { questionCode: 'S14_Q1', operator: 'eq', value: 'YES' },
        sortOrder: 6,
      },
    ],
  },

  // =========================================================================
  // SECTION 15 – Supply Chain Reliability
  // =========================================================================
  {
    number: 15,
    title: 'Supply Chain Reliability',
    description:
      'Composite assessment of the reliability of supply chains for EID, HIV PMTCT, Syphilis and Hepatitis B commodities.',
    scoringParadigm: 'COMPOSITE',
    isScored: true,
    questions: [
      // Sub-section A – EID Supplies
      {
        code: 'S15_A1',
        text: 'Are EID commodities (DBS kits, filter paper, desiccant) currently in stock?',
        helpText: 'Physically verify stock of EID collection materials.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 1,
      },
      {
        code: 'S15_A2',
        text: 'Was there any EID stock-out in the last 3 months that interrupted services?',
        helpText: 'Check stock cards and ask staff about service interruptions.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 2,
      },
      {
        code: 'S15_A3',
        text: 'Were emergency orders needed for EID supplies in the last 3 months?',
        helpText: 'Review order records for unscheduled/emergency requisitions.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: false,
        scoringWeight: 0.5,
        sortOrder: 3,
      },
      // Sub-section B – HIV PMTCT Supplies
      {
        code: 'S15_B1',
        text: 'Are HIV PMTCT commodities (test kits, ARVs, CTX) currently in stock?',
        helpText: 'Physically verify stock of HIV rapid test kits, ARV drugs and CTX.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 4,
      },
      {
        code: 'S15_B2',
        text: 'Was there any HIV PMTCT commodity stock-out in the last 3 months that interrupted services?',
        helpText: 'Check stock cards and ask staff about service interruptions.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 5,
      },
      {
        code: 'S15_B3',
        text: 'Were emergency orders needed for HIV PMTCT supplies in the last 3 months?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: false,
        scoringWeight: 0.5,
        sortOrder: 6,
      },
      // Sub-section C – Syphilis Supplies
      {
        code: 'S15_C1',
        text: 'Are Syphilis testing commodities (RPR/rapid test kits) currently in stock?',
        helpText: 'Physically verify stock of syphilis testing materials.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 7,
      },
      {
        code: 'S15_C2',
        text: 'Was there any Syphilis test kit stock-out in the last 3 months that interrupted testing?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 8,
      },
      {
        code: 'S15_C3',
        text: 'Were emergency orders needed for Syphilis supplies in the last 3 months?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: false,
        scoringWeight: 0.5,
        sortOrder: 9,
      },
      // Sub-section D – Hepatitis B Supplies
      {
        code: 'S15_D1',
        text: 'Are Hepatitis B testing commodities (HBsAg rapid test kits) currently in stock?',
        helpText: 'Physically verify stock of HBsAg test kits.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 10,
      },
      {
        code: 'S15_D2',
        text: 'Was there any HBsAg test kit stock-out in the last 3 months that interrupted testing?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        scoringWeight: 1,
        sortOrder: 11,
      },
      {
        code: 'S15_D3',
        text: 'Were emergency orders needed for Hepatitis B supplies in the last 3 months?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: false,
        scoringWeight: 0.5,
        sortOrder: 12,
      },
    ],
  },

  // =========================================================================
  // SECTION 16 – Human Resources & Service Delivery Points
  // =========================================================================
  {
    number: 16,
    title: 'Human Resources & Service Delivery Points',
    description:
      'Descriptive section capturing staffing, service delivery models and gaps. Not scored but critical for context and planning.',
    scoringParadigm: 'DESCRIPTIVE',
    isScored: false,
    questions: [
      {
        code: 'S16_Q1',
        text: 'How many staff currently provide PMTCT services at this facility?',
        helpText: 'Include all cadres: nurses, midwives, clinical officers, counsellors, lab technicians.',
        responseType: 'NUMERIC',
        required: true,
        requiresEvidence: false,
        sortOrder: 1,
      },
      {
        code: 'S16_Q2',
        text: 'What is the primary funding source for PMTCT staff?',
        responseType: 'DROPDOWN',
        required: true,
        requiresEvidence: false,
        options: [
          { value: 'GOVERNMENT', label: 'Government' },
          { value: 'PARTNER', label: 'Partner / Donor' },
          { value: 'MIXED', label: 'Mixed (Government + Partner)' },
        ],
        sortOrder: 2,
      },
      {
        code: 'S16_Q3',
        text: 'Is there a Mother-Baby Care Point (MBCP) model implemented at this facility?',
        helpText: 'MBCP integrates ANC, PMTCT, EID and immunisation in one service point.',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: true,
        sortOrder: 3,
      },
      {
        code: 'S16_Q4',
        text: 'Where is HIV testing primarily done for ANC clients?',
        responseType: 'DROPDOWN',
        required: true,
        requiresEvidence: false,
        options: [
          { value: 'ANC', label: 'At the ANC clinic' },
          { value: 'LAB', label: 'At the laboratory' },
          { value: 'BOTH', label: 'Both ANC and laboratory' },
          { value: 'OTHER', label: 'Other arrangement' },
        ],
        sortOrder: 4,
      },
      {
        code: 'S16_Q5',
        text: 'Where is ART initiation primarily done for newly identified HIV+ pregnant women?',
        responseType: 'DROPDOWN',
        required: true,
        requiresEvidence: false,
        options: [
          { value: 'ANC', label: 'At the ANC clinic (same-day)' },
          { value: 'ART_CLINIC', label: 'At the ART clinic (separate)' },
          { value: 'BOTH', label: 'Both depending on situation' },
          { value: 'OTHER', label: 'Other arrangement' },
        ],
        sortOrder: 5,
      },
      {
        code: 'S16_Q6',
        text: 'Describe any identified service delivery gaps due to staff shortages',
        helpText: 'Free text. E.g. "No lab technician on weekends", "Only 1 midwife for ANC and maternity".',
        responseType: 'TEXT',
        required: false,
        requiresEvidence: false,
        sortOrder: 6,
      },
      {
        code: 'S16_Q7',
        text: 'Is PMTCT staffing significantly partner/donor-dependent?',
        helpText: 'If partner-funded staff were withdrawn, would PMTCT services be severely affected?',
        responseType: 'YES_NO',
        required: true,
        requiresEvidence: false,
        sortOrder: 7,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Get a section definition by number */
export function getSectionDef(sectionNumber: number): SectionDef | undefined {
  return ASSESSMENT_SECTION_DEFS.find((s) => s.number === sectionNumber);
}

/** Get a question definition by code (searches all sections) */
export function getQuestionDef(code: string): QuestionDef | undefined {
  for (const section of ASSESSMENT_SECTION_DEFS) {
    const q = section.questions.find((q) => q.code === code);
    if (q) return q;
  }
  return undefined;
}

/** Get all question codes for a section */
export function getSectionQuestionCodes(sectionNumber: number): string[] {
  const section = getSectionDef(sectionNumber);
  return section ? section.questions.map((q) => q.code) : [];
}

/** Check whether a question should be visible given current responses */
export function isQuestionVisible(
  question: QuestionDef,
  responses: Record<string, string | null>,
): boolean {
  if (!question.branchCondition) return true;

  const { questionCode, operator, value } = question.branchCondition;
  const parentValue = responses[questionCode];

  if (parentValue === null || parentValue === undefined) return false;

  switch (operator) {
    case 'eq':
      return parentValue === value;
    case 'neq':
      return parentValue !== value;
    case 'gt':
      return Number(parentValue) > Number(value);
    case 'lt':
      return Number(parentValue) < Number(value);
    default:
      return true;
  }
}
