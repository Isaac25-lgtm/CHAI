"""
PMTCT Assessment Configuration
Section 4: PMTCT Indicators and Assessment Criteria

This file defines the complete structure of the PMTCT assessment tool including:
- Assessment sections and subsections
- Question types and response options
- Scoring logic and thresholds
"""

PMTCT_ASSESSMENT = {
    "title": "SECTION 4: PMTCT Assessment",
    "sections": [
        {
            "id": "anc_registers",
            "title": "ANC/Maternity/PNC Registers",
            "standard": "Each facility retains accurate, complete, and updated patient registers that are regularly reviewed.",
            "instructions": "Review the last 10 pages of register to assess legibility and completeness. If the entry fields are at least 90% complete, score Y for Yes, and N for No if less than 90%.",
            "questions": [
                {
                    "id": "anc_reg_q1",
                    "text": "Do following registers exist and are they in use?",
                    "type": "checklist_table",
                    "columns": ["Register Type", "Available (Y/N)", "Standard versions (Y/N)", "90% complete (Y/N)"],
                    "items": [
                        "ANC registers",
                        "Maternity Registers",
                        "PNC Registers",
                        "Family Planning Register",
                        "ART Cards",
                        "ART Register",
                        "HEI clinical cards",
                        "HEI Register",
                        "SGBV register",
                        "Appointment register",
                        "Missed appointment register"
                    ],
                    "scoring": {
                        "method": "count_yes_per_row",
                        "thresholds": {
                            "red": "1/3",
                            "yellow": "2/3",
                            "green": "3/3"
                        }
                    }
                }
            ]
        },
        {
            "id": "patient_records",
            "title": "Patient/Beneficiary Records",
            "standard": "Each ART/pre-ART or PMTCT facility maintains current individual patient/beneficiary records and provides an adequate and secure storage space with an organized filing system that allows for easy accessibility and patient confidentiality.",
            "questions": [
                {
                    "id": "pr_q1",
                    "text": "Are individual patient/beneficiary records maintained?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "pr_q2"}
                },
                {
                    "id": "pr_q2",
                    "text": "Is space adequate and secure?",
                    "type": "yes_no",
                    "depends_on": {"pr_q1": "yes"},
                    "scoring": {"no": "red", "yes_next": "pr_q3"}
                },
                {
                    "id": "pr_q3",
                    "text": "Is there a standard filing system and accessibility to specific charts so patient care is not impeded?",
                    "type": "yes_no",
                    "depends_on": {"pr_q2": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "pr_q4"}
                },
                {
                    "id": "pr_q4",
                    "text": "Does the system allow for identification of patients by category (e.g., pre-ART, ART, peds, pregnant women) and is there written documentation that describes the record filing system?",
                    "type": "yes_no",
                    "depends_on": {"pr_q3": "yes"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "triple_elimination_testing",
            "title": "TRIPLE ELIMINATION (HIV, Syphilis and Hep B) - Testing",
            "standard": "All pregnant women are tested for HIV, Syphilis, and Hepatitis B at first ANC visit",
            "questions": [
                {
                    "id": "te_q1",
                    "text": "Is facility offering testing for HIV, Syphilis and Hep B?",
                    "type": "multi_yes_no",
                    "items": ["HIV", "Syphilis", "Hepatitis B"],
                    "scoring": {"any_no": "red", "all_yes_next": "te_q2"}
                },
                {
                    "id": "te_q2",
                    "text": "Review ANC1 entries for previous month, ascertain triple testing vs ANC1",
                    "type": "data_entry_table",
                    "depends_on": {"te_q1": "all_yes"},
                    "fields": [
                        {"id": "anc1_attendance", "label": "ANC 1 Attendances", "type": "number"},
                        {"id": "hiv_tested_anc1", "label": "Number tested for HIV at ANC 1 (documented records)", "type": "number"},
                        {"id": "hiv_screening_pct", "label": "% HIV Screening/Testing at ANC", "type": "calculated", "formula": "(hiv_tested_anc1 / anc1_attendance) * 100"},
                        {"id": "syphilis_tested_anc1", "label": "Number tested for syphilis at ANC 1 (documented records)", "type": "number"},
                        {"id": "syphilis_testing_pct", "label": "% Syphilis Testing", "type": "calculated", "formula": "(syphilis_tested_anc1 / anc1_attendance) * 100"},
                        {"id": "hepb_tested_anc1", "label": "Number of pregnant women tested for Hepatitis B at ANC 1", "type": "number"},
                        {"id": "hepb_testing_pct", "label": "% Hep. B Testing", "type": "calculated", "formula": "(hepb_tested_anc1 / anc1_attendance) * 100"},
                        {"id": "hiv_status_documented", "label": "Number with a documented HIV status", "type": "number"}
                    ]
                },
                {
                    "id": "te_q2_results",
                    "text": "Testing Results",
                    "type": "data_entry_table",
                    "depends_on": {"te_q1": "all_yes"},
                    "fields": [
                        {"id": "hiv_positive_first_time", "label": "Number of pregnant women tested positive for HIV for the first time in this pregnancy", "type": "number"},
                        {"id": "hiv_positive_pct", "label": "% HIV positive for the first time at ANC 1", "type": "calculated", "formula": "(hiv_positive_first_time / hiv_tested_anc1) * 100"},
                        {"id": "syphilis_positive_first_time", "label": "Number of pregnant women tested positive for syphilis for the first time in this pregnancy", "type": "number"},
                        {"id": "syphilis_positive_pct", "label": "% Syphilis Testing Positive", "type": "calculated", "formula": "(syphilis_positive_first_time / syphilis_tested_anc1) * 100"},
                        {"id": "hepb_positive_first_time", "label": "Number of pregnant women documented tested positive for hepatitis B for the first time in this pregnancy", "type": "number"},
                        {"id": "hepb_positive_pct", "label": "% Hep. B Testing Positive", "type": "calculated", "formula": "(hepb_positive_first_time / hepb_tested_anc1) * 100"}
                    ]
                },
                {
                    "id": "te_q2_hepb_vl",
                    "text": "Hepatitis B viral load testing",
                    "type": "data_entry_table",
                    "depends_on": {"te_q1": "all_yes"},
                    "fields": [
                        {"id": "hepb_vl_sent_cphl", "label": "Number of pregnant women with documented HBV-positive test results who had Hepatitis B viral load samples sent to CPHL", "type": "number"},
                        {"id": "hepb_vl_sent_pct", "label": "% Hep. B Testing Positive sample sent to CPHL for viral load testing", "type": "calculated", "formula": "(hepb_vl_sent_cphl / hepb_positive_first_time) * 100"},
                        {"id": "hepb_vl_received", "label": "Number of viral load sample results with HBV positive test received from CPHL", "type": "number"},
                        {"id": "hepb_vl_received_pct", "label": "% Hep. B viral load results received from CPHL", "type": "calculated", "formula": "(hepb_vl_received / hepb_vl_sent_cphl) * 100"},
                        {"id": "hepb_vl_high", "label": "Number of Hepatitis B viral load samples for pregnant women with VL >200,000 IU/mL", "type": "number"},
                        {"id": "hepb_vl_high_pct", "label": "% Hep. B Testing Positive VL results >200,000 IU/mL", "type": "calculated", "formula": "(hepb_vl_high / hepb_vl_received) * 100"}
                    ]
                },
                {
                    "id": "te_q3",
                    "text": "Is facility offering maternal re-testing for pregnant women in the 3rd Trimester, L&D and PNC; Male Partner Testing, and HIV Self-Testing Kits (HIVSTKs)?",
                    "type": "multi_yes_no",
                    "depends_on": {"te_q1": "hiv_yes"},
                    "items": [
                        "Re-testing: ANC",
                        "Re-testing: Maternity",
                        "Re-testing: PNC",
                        "Male Partner Testing",
                        "HIVSTKs"
                    ],
                    "scoring": {"any_no": "light_green", "all_yes": "dark_green"}
                }
            ]
        },
        {
            "id": "triple_elimination_treatment",
            "title": "TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment",
            "standard": "All pregnant women with a positive HIV, syphilis, Hep. B test – with viral load more than 200,000 copies/ml) result are eligible for treatment/prophylaxis.",
            "questions": [
                {
                    "id": "tet_q1",
                    "text": "Is facility offering treatment/prophylaxis for HIV, Syphilis, and Hep B?",
                    "type": "multi_yes_no",
                    "items": ["HIV", "Syphilis", "Hepatitis B"],
                    "scoring": {"any_no": "red", "all_yes_next": "tet_q2"}
                },
                {
                    "id": "tet_q2",
                    "text": "Review ANC1 entries for previous month, ascertain treatment initiation",
                    "type": "data_entry_table",
                    "depends_on": {"tet_q1": "all_yes"},
                    "fields": [
                        {"id": "hiv_positive_documented", "label": "Number with a document positive HIV status (TRRK, TRR, or TRR+)", "type": "number"},
                        {"id": "art_initiated", "label": "Number with a documented ART initiation status", "type": "number"},
                        {"id": "art_pct", "label": "% On ART", "type": "calculated", "formula": "(art_initiated / hiv_positive_documented) * 100"},
                        {"id": "syphilis_positive_documented", "label": "Number with a documented positive Syphilis Test Result", "type": "number"},
                        {"id": "syphilis_treated", "label": "Number with a documented positive Syphilis Test Result initiated on treatment", "type": "number"},
                        {"id": "syphilis_treated_pct", "label": "% Treated for Syphilis", "type": "calculated", "formula": "(syphilis_treated / syphilis_positive_documented) * 100"},
                        {"id": "hepb_positive_documented", "label": "Number with a documented Hepatitis B positive Test Result", "type": "number"},
                        {"id": "hepb_vl_high_documented", "label": "Number with a documented Hepatitis B positive Test Result with viral load more than 200,000 copies/ml", "type": "number"},
                        {"id": "hepb_art_initiated", "label": "Number with a documented Hepatitis B positive Test Result with viral load more than 200,000 copies/ml initiated on ARVs", "type": "number"},
                        {"id": "hepb_art_pct", "label": "% on ART for Hep. B Prophylaxis", "type": "calculated", "formula": "(hepb_art_initiated / hepb_vl_high_documented) * 100"},
                        {"id": "average_pct", "label": "% Average", "type": "calculated", "formula": "(art_pct + syphilis_treated_pct + hepb_art_pct) / 3"}
                    ],
                    "scoring": {
                        "field": "average_pct",
                        "thresholds": {
                            "red": "<60",
                            "yellow": "60-79",
                            "light_green": "80-89",
                            "dark_green": ">=90"
                        }
                    }
                }
            ]
        },
        {
            "id": "art_pmtct",
            "title": "ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)",
            "standard": "All pregnant and breastfeeding women LHIV are expected to have additional screening and tests for clinical monitoring.",
            "questions": [
                {
                    "id": "ap_q1",
                    "text": "Are the following provided at the health facility for pregnant and breastfeeding women LHIV?",
                    "type": "multi_yes_no",
                    "items": [
                        "STI /ca cx/ GBV screening",
                        "FP",
                        "VL testing",
                        "IAC",
                        "CD4",
                        "CTX"
                    ],
                    "scoring": {"any_no": "red"}
                },
                {
                    "id": "ap_q2",
                    "text": "Quality of PMTCT services (Review 10 client's charts who have been in care for at least a year)",
                    "instructions": "Indicate Y for Yes, N for No and NA for Not Applicable for each of the clients' charts below and calculate a %ge score of the Y against the total eligible (Excluding the NAs). After calculating the %ge score, indicate the score using the following guidance: If <60%=Red, If 60-79%=Yellow, If 80-89%=Light Green, If ≥ 90%=Dark Green",
                    "type": "chart_review_table",
                    "services": [
                        "Screened for STI",
                        "Screened for CaCx",
                        "Screened for SGBV",
                        "Counselled on FP",
                        "Had a VL after 3 months",
                        "Suppressed",
                        "Unsuppressed",
                        "Unsuppressed with IAC",
                        "Had a Baseline CD4",
                        "On CTX",
                        "Retained"
                    ],
                    "charts": 10,
                    "scoring": {
                        "method": "percentage",
                        "thresholds": {
                            "red": "<60",
                            "yellow": "60-79",
                            "light_green": "80-89",
                            "dark_green": ">=90"
                        }
                    }
                }
            ]
        },
        {
            "id": "patient_tracking",
            "title": "Patient Tracking HIV+ Pregnant Women",
            "standard": "Each ART facility has a standard procedure for identifying and tracking HIV positive pregnant women on ART who have defaulted on their appointments. The system contains the following core elements: defined staff roles/responsibilities, procedures for patient identification and tracking, and standardized documentation that includes updating of relevant facility indicators.",
            "questions": [
                {
                    "id": "pt_q1",
                    "text": "Are there standard procedures for identifying and tracking HIV+ pregnant women who have defaulted on their ART appointments? Review entries in the appointment book from one month ago.",
                    "type": "yes_no_with_text",
                    "additional_text": "Which interventions does the facility use to minimize missed appointments? See evidence of outlined interventions",
                    "scoring": {"no": "red", "yes_next": "pt_q2"}
                },
                {
                    "id": "pt_q2",
                    "text": "Is ART patient tracking documentation complete and does it show evidence of defaulted ART patients brought back into care? Review entries in previous month in the missed appointment register",
                    "type": "yes_no",
                    "depends_on": {"pt_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "pt_q3"}
                },
                {
                    "id": "pt_q3",
                    "text": "Are tracking results used to update site indicators (e.g., Lost-to-Follow-Up [LTFU] rates)?",
                    "type": "yes_no",
                    "depends_on": {"pt_q2": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "pt_q4"}
                },
                {
                    "id": "pt_q4",
                    "text": "Is a written SOP available for identifying and tracking defaulters?",
                    "type": "yes_no",
                    "depends_on": {"pt_q3": "yes"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "adherence_support",
            "title": "Adherence Support",
            "standard": "Each facility that provides ART has an adherence support system that provides and documents all the following: 1) Adherence counselling prior to ARV treatment initiation, 2) Routine adherence assessments during ART, 3) Counselling interventions for patients with poor adherence.",
            "questions": [
                {
                    "id": "as_q1",
                    "text": "Are there any adherence support procedures in place?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "as_q2"}
                },
                {
                    "id": "as_q2",
                    "text": "Are all three adherence support elements (pre-ART counselling, routine adherence assessment, and intervention counselling) implemented?",
                    "type": "yes_no",
                    "depends_on": {"as_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "as_q3"}
                },
                {
                    "id": "as_q3",
                    "text": "Review 10 charts of adult ART patients. What percent of reviewed charts have documentation of adherence assessment at the last clinical visit?",
                    "type": "percentage_input",
                    "depends_on": {"as_q2": "yes"},
                    "scoring": {
                        "thresholds": {
                            "yellow": "<60",
                            "light_green": "60-79",
                            "continue": ">=80"
                        }
                    }
                },
                {
                    "id": "as_q4",
                    "text": "Is a written procedure or algorithm available that addresses all the adherence support elements?",
                    "type": "yes_no",
                    "depends_on": {"as_q3": ">=80"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "community_linkage",
            "title": "Facility Linkage to Community Care and Support Services for Adult PLHIV",
            "standard": "All health facilities treating adult PLHIV document and track referrals of pre-ART and ART patients to community services.",
            "instructions": "If patients at this facility do not have access to community services, check NA, and SKIP this section.",
            "na_option": True,
            "questions": [
                {
                    "id": "cl_q1",
                    "text": "Is a system in place to document referrals of PLHIV to community-based services (e.g., community health workers, community-based care, PLHIV support groups)?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "cl_q2"}
                },
                {
                    "id": "cl_q2",
                    "text": "Does the referral system include follow-up and documentation to determine if the patient accessed the referral services?",
                    "type": "yes_no",
                    "depends_on": {"cl_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "cl_q3"}
                },
                {
                    "id": "cl_q3",
                    "text": "Can the facility provide documentation showing that facility staff review the referrals logbook routinely to optimize linkages to community services?",
                    "type": "yes_no",
                    "depends_on": {"cl_q2": "yes"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "sti_screening",
            "title": "STI Screening and Management in HIV Clinics Serving General Population",
            "instructions": "Review 10 ART charts",
            "questions": [
                {
                    "id": "sti_q1",
                    "text": "Are all PLHIV routinely offered syndromic screening for STIs [e.g., vaginal, or urethral discharge, genital ulcer disease, or (for women) lower abdominal pain] at the initial consultation and then at every clinical assessment thereafter?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "sti_q2"}
                },
                {
                    "id": "sti_q2",
                    "text": "Do clients with STI signs or symptoms have access to STI treatment either onsite or through referral?",
                    "type": "yes_no",
                    "depends_on": {"sti_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "sti_q3"}
                },
                {
                    "id": "sti_q3",
                    "text": "Review 10 adult charts. What percent of reviewed charts have documentation of syndromic screening for STIs [e.g., vaginal or ureteral discharge, genital ulcer disease, or (for women) lower abdominal pain] at the last clinical assessment?",
                    "type": "percentage_input",
                    "depends_on": {"sti_q2": "yes"},
                    "scoring": {
                        "thresholds": {
                            "yellow": "<70",
                            "continue": ">=70"
                        }
                    }
                },
                {
                    "id": "sti_q4",
                    "text": "Are there written procedures or algorithms for routinely offering partner notification services, including STI screening and treatment?",
                    "type": "yes_no",
                    "depends_on": {"sti_q3": ">=70"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "eid",
            "title": "Early Infant Diagnosis [HEI]",
            "standard": "All HIV-exposed infants (HEIs) receive DNA PCR or other virologic testing for early infant diagnosis, with a documented final HIV status at the end of breastfeeding and documented return of HIV results to caregivers.",
            "instructions": "If the answer to Q1 is NO, Skip to Q5",
            "questions": [
                {
                    "id": "eid_q1",
                    "text": "Is there routine collection of dried blood spots (DBS) at this facility for PCR testing for HEIs?",
                    "type": "yes_no",
                    "scoring": {"no_skip_to": "eid_q5", "yes_next": "eid_q2"}
                },
                {
                    "id": "eid_q2",
                    "text": "Is there a system in place for tracking HEIs through the end of breastfeeding and documenting final HIV status?",
                    "type": "yes_no",
                    "depends_on": {"eid_q1": "yes"},
                    "scoring": {"no": "red", "yes_next": "eid_q3"}
                },
                {
                    "id": "eid_q3",
                    "text": "Is there a system for documenting return of HIV results to a caregiver?",
                    "type": "yes_no",
                    "depends_on": {"eid_q2": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "eid_q4"}
                },
                {
                    "id": "eid_q4",
                    "text": "Review register entries of 10 HEIs born 3 or more months prior to the visit. How many HEIs do not have documentation that the results of PCR testing were provided to a caregiver?",
                    "type": "number_input",
                    "depends_on": {"eid_q3": "yes"},
                    "scoring": {
                        "thresholds": {
                            "dark_green": "0",
                            "light_green": "1",
                            "yellow": "2",
                            "red": ">=3"
                        }
                    },
                    "note": "All infants with documentation= Dark Green STOP. Q5-7 are only scored if the answer to Q1 is NO."
                },
                {
                    "id": "eid_q5",
                    "text": "Does the facility have a system for tracking the linkage of HIV-exposed infants to DBS collection services?",
                    "type": "yes_no",
                    "depends_on": {"eid_q1": "no"},
                    "scoring": {"no": "red", "yes_next": "eid_q6"}
                },
                {
                    "id": "eid_q6",
                    "text": "Does the referral system include follow-up and documentation to determine if the patient accessed the DBS collection service?",
                    "type": "yes_no",
                    "depends_on": {"eid_q5": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "eid_q7"}
                },
                {
                    "id": "eid_q7",
                    "text": "Can the facility provide documentation showing that facility staff review the referrals logbook routinely to optimize linkages to DBS collection?",
                    "type": "yes_no",
                    "depends_on": {"eid_q6": "yes"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "ctx_hei",
            "title": "CTX for HIV-Exposed Infants [HEI]",
            "standard": "All HEIs initiate CTX by 8 weeks of age.",
            "instructions": "Review registers or charts for 10 HEI's born 3-12 months prior to SIMS visit. Use the SAME HEIs as above in EID section.",
            "questions": [
                {
                    "id": "ctx_q1",
                    "text": "Review register or charts for 10 HEIs born 3-12 months prior to the visit. How many HEIs do not have documented receipt of CTX by 8 weeks of age?",
                    "type": "number_input",
                    "scoring": {
                        "thresholds": {
                            "dark_green": "0_continue",
                            "light_green": "1",
                            "yellow": "2",
                            "red": ">=3"
                        }
                    }
                },
                {
                    "id": "ctx_q2",
                    "text": "Is a written procedure or algorithm for provision of CTX to HEIs available?",
                    "type": "yes_no",
                    "depends_on": {"ctx_q1": "0"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "tracking_hei",
            "title": "Tracking HIV-Exposed Infants [HEI]",
            "standard": "Each facility caring for HIV-exposed infants (HEIs) has a standard procedure for identifying and tracking HIV-exposed infants through the documentation of final HIV status at the end of breastfeeding period. It contains the following core elements: defined staff roles/responsibilities, procedures for patient identification and tracking, and standardized documentation that includes updating of relevant facility indicators.",
            "questions": [
                {
                    "id": "thei_q1",
                    "text": "Are there standard procedures for identifying and tracking HIV-exposed infants through the end of breastfeeding and documenting final HIV status?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "thei_q2"}
                },
                {
                    "id": "thei_q2",
                    "text": "Is patient tracking documentation complete and does it show evidence of defaulted patients brought back into care?",
                    "type": "yes_no",
                    "depends_on": {"thei_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "thei_q3"}
                },
                {
                    "id": "thei_q3",
                    "text": "Are results used to update facility indicators (e.g., Lost to Follow-up [LTFU] rates)?",
                    "type": "yes_no",
                    "depends_on": {"thei_q2": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "thei_q4"}
                },
                {
                    "id": "thei_q4",
                    "text": "Is there a mother-infant appointment book or register for mother baby pairs (i.e., HIV-positive mothers and their HIV-exposed infants) used as part of the defaulter tracking program?",
                    "type": "yes_no",
                    "depends_on": {"thei_q3": "yes"},
                    "scoring": {"no": "light_green", "yes_next": "thei_q5"}
                },
                {
                    "id": "thei_q5",
                    "text": "Is a written SOP for identifying and tracking defaulters available?",
                    "type": "yes_no",
                    "depends_on": {"thei_q4": "yes"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "enrollment_hiv_infants",
            "title": "Enrolment of HIV-Infected Infants identified through Early Infant Diagnosis (EID) Services into ART Services",
            "standard": "All HIV-infected infants are enrolled into ART services.",
            "questions": [
                {
                    "id": "ehi_q1",
                    "text": "Is there a system in place for documenting enrolment into ART services of HIV-infected infants identified through EID services?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "ehi_q2"}
                },
                {
                    "id": "ehi_q2",
                    "text": "Does the HIV-exposed infant/EID register document linkage to treatment (such as by including date of enrolment, ART number, or ART regimen)?",
                    "type": "yes_no",
                    "depends_on": {"ehi_q1": "yes"},
                    "scoring": {"no": "yellow", "yes_next": "ehi_q3"}
                },
                {
                    "id": "ehi_q3",
                    "text": "Review register entries of last 10 HIV-infected infants (up to one year prior to the visit). How many HIV-infected infants do not have documentation of linkage into ART services?",
                    "type": "number_input",
                    "depends_on": {"ehi_q2": "yes"},
                    "scoring": {
                        "thresholds": {
                            "dark_green": "0",
                            "light_green": "1",
                            "yellow": "2",
                            "red": ">=3"
                        }
                    }
                }
            ]
        },
        {
            "id": "hei_eid_registers",
            "title": "HIV Exposed Infant/Early Infant Diagnosis Registers",
            "standard": "Each facility retains accurate, complete, and updated patient registers that are regularly reviewed.",
            "questions": [
                {
                    "id": "heir_q1",
                    "text": "Do HEI/EID registers exist and are they in use?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes_next": "heir_q2"}
                },
                {
                    "id": "heir_q2",
                    "text": "Review the last 10 pages of register. Do the HEI/EID patient registers meet all the following criteria? Tick all that apply:",
                    "type": "multi_checkbox",
                    "depends_on": {"heir_q1": "yes"},
                    "items": [
                        "National or IP standard versions in use?",
                        "Entries are legible and 90% of every field complete?",
                        "Updated daily/weekly (per guidelines)?"
                    ],
                    "scoring": {"not_all": "red", "all_next": "heir_q3"}
                },
                {
                    "id": "heir_q3",
                    "text": "Do the HEI/EID patient registers meet all the following criteria? Tick all that apply:",
                    "type": "multi_checkbox",
                    "depends_on": {"heir_q2": "all"},
                    "items": [
                        "Regularly reviewed?",
                        "Used for routine facility reporting?",
                        "When in use, placed so that patient confidentiality is maintained?",
                        "Stored (when not in use) in a secure location?"
                    ],
                    "scoring": {"not_all": "yellow", "all_next": "heir_q4"}
                },
                {
                    "id": "heir_q4",
                    "text": "Are HEI/EID patient registers used to inform clinic processes?",
                    "type": "yes_no",
                    "depends_on": {"heir_q3": "all"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "supply_chain_eid",
            "title": "Supply Chain Reliability (Early Infant Diagnosis) [HEI]",
            "standard": "Each PMTCT facility has a reliable supply of Early Infant Diagnosis (EID) dried blood spot (DBS) supplies which consist of: a collection card, alcohol swabs, gauze, lancets and latex gloves (or a DBS bundle).",
            "instructions": "If DBS collection for EID does not occur at this facility, check NA, and SKIP this section.",
            "na_option": True,
            "questions": [
                {
                    "id": "sceid_q1",
                    "text": "Has a stock-out of EID supplies in the past 3 months resulted in an interruption of HIV testing for infants?",
                    "type": "yes_no",
                    "scoring": {"yes": "red", "no_next": "sceid_q2"}
                },
                {
                    "id": "sceid_q2",
                    "text": "Has there been a stock-out or low stock status of EID kits supplies in the past 3 months that required placement of an emergency order?",
                    "type": "yes_no",
                    "depends_on": {"sceid_q1": "no"},
                    "scoring": {"yes": "yellow", "no_next": "sceid_q3"}
                },
                {
                    "id": "sceid_q3",
                    "text": "Are EID supplies distributed to testing points at this facility as standardized bundles to ensure that all components are consistently available?",
                    "type": "yes_no",
                    "depends_on": {"sceid_q2": "no"},
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "supply_chain_hiv_pmtct",
            "title": "Supply Chain Reliability – HIV PMTCT (Mother)",
            "standard": "Each PMTCT facility maintains consistent availability of HIV test kits (HIV-syphilis duo, Determine, STAT-PAK/First Response), ARVs for maternal treatment, and cotrimoxazole for prophylaxis.",
            "instructions": "If HIV testing or maternal ART is not provided at this facility, check NA, and SKIP this section.",
            "na_option": True,
            "questions": [
                {
                    "id": "schiv_q1",
                    "text": "Are HIV-syphilis duo kits currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "schiv_q2",
                    "text": "How many months of stock are available for HIV test kits?",
                    "type": "number_input"
                },
                {
                    "id": "schiv_q3",
                    "text": "Are the HIV 1/2 STAT-PAK® Assay currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "schiv_q4",
                    "text": "How many months of HIV 1/2 STAT-PAK® Assay stock are available?",
                    "type": "number_input"
                },
                {
                    "id": "schiv_q5",
                    "text": "Are maternal ARVs (e.g., TLD) currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "schiv_q6",
                    "text": "How many months of stock are available for maternal ARVs?",
                    "type": "number_input"
                },
                {
                    "id": "schiv_q7",
                    "text": "Has a stock-out of HIV-syphilis duo kits in the past 3 months resulted in missed maternal testing at ANC?",
                    "type": "yes_no",
                    "scoring": {"no": "green", "yes": "red"}
                },
                {
                    "id": "schiv_q8",
                    "text": "Have there been stock-outs or emergency orders for maternal ARVs in the past 3 months?",
                    "type": "yes_no",
                    "scoring": {"no": "green", "yes": "red"}
                },
                {
                    "id": "schiv_q9",
                    "text": "Are HIV testing kits and maternal ART consistently available at ANC and maternity points?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "supply_chain_syphilis",
            "title": "Supply Chain Reliability – Syphilis PMTCT",
            "standard": "Facilities should have continuous access to syphilis RDTs and benzathine penicillin for both initial and follow-up treatment.",
            "instructions": "If syphilis testing or treatment is not offered at this facility, check NA, and SKIP this section.",
            "note": "Note: Consider the use of HIV/Syphilis duo kits where applicable, and syphilis RDTs primarily for women with known HIV negative status.",
            "na_option": True,
            "questions": [
                {
                    "id": "scsyph_q1",
                    "text": "Are syphilis RDTs currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "scsyph_q2",
                    "text": "How many months of stock are available for syphilis RDTs?",
                    "type": "number_input"
                },
                {
                    "id": "scsyph_q3",
                    "text": "Is benzathine penicillin currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "scsyph_q4",
                    "text": "How many months of stock are available for benzathine penicillin?",
                    "type": "number_input"
                },
                {
                    "id": "scsyph_q5",
                    "text": "Has a stock-out of syphilis RDTs in the last 3 months led to missed testing for pregnant women?",
                    "type": "yes_no",
                    "scoring": {"no": "light_green", "yes": "red"}
                },
                {
                    "id": "scsyph_q6",
                    "text": "Was there any interruption in benzathine penicillin availability in the past 3 months?",
                    "type": "yes_no",
                    "scoring": {"no": "light_green", "yes": "red"}
                },
                {
                    "id": "scsyph_q7",
                    "text": "Are both RDTs and penicillin doses consistently available across ANC and maternity areas?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "supply_chain_hepb",
            "title": "Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)",
            "standard": "Facilities should have reliable stocks of HBsAg test kits, TDF or TDF/3TC prophylaxis for eligible women, and birth dose hepatitis B vaccines.",
            "instructions": "If Hepatitis B services are not offered at this facility, check NA, and SKIP this section.",
            "na_option": True,
            "questions": [
                {
                    "id": "schepb_q1",
                    "text": "Are HBsAg test kits currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "schepb_q2",
                    "text": "How many months of stock are available for HBsAg test kits?",
                    "type": "number_input"
                },
                {
                    "id": "schepb_q3",
                    "text": "Is TDF or TDF/3TC for prophylaxis currently in stock?",
                    "type": "yes_no"
                },
                {
                    "id": "schepb_q4",
                    "text": "How many months of stock are available for TDF or TDF/3TC?",
                    "type": "number_input"
                },
                {
                    "id": "schepb_q5",
                    "text": "Are hepatitis B birth dose (HepB-BD) vaccines currently available in maternity?",
                    "type": "yes_no"
                },
                {
                    "id": "schepb_q6",
                    "text": "How many months of stock are available for HepB-BD vaccines?",
                    "type": "number_input"
                },
                {
                    "id": "schepb_q7",
                    "text": "Has a stock-out of HBsAg test kits in the past 3 months caused missed screening of pregnant women?",
                    "type": "yes_no",
                    "scoring": {"yes": "red", "no_continue": True}
                },
                {
                    "id": "schepb_q8",
                    "text": "Has there been a stock-out of TDF or TDF/3TC for HBV-positive women in the last 3 months?",
                    "type": "yes_no",
                    "scoring": {"yes": "yellow", "no_continue": True}
                },
                {
                    "id": "schepb_q9",
                    "text": "Are hepatitis B birth dose vaccines available 24/7 in maternity units for timely newborn immunization?",
                    "type": "yes_no",
                    "scoring": {"no": "red", "yes": "dark_green"}
                }
            ]
        },
        {
            "id": "human_resources",
            "title": "HUMAN RESOURCES AND SERVICE DELIVERY POINTS",
            "standard": "PMTCT services for HIV, syphilis, and hepatitis B should be integrated and delivered at Mother-Baby Care Points (MBCPs), where designated personnel provide testing, treatment, counselling, and vaccination.",
            "questions": [
                {
                    "id": "hr_q1",
                    "text": "What is the primary funding source for personnel delivering PMTCT services at this facility?",
                    "type": "radio",
                    "options": [
                        "Public payroll",
                        "Partner-supported",
                        "Both public and partner"
                    ],
                    "note": "If partner-supported, proceed to Q2"
                },
                {
                    "id": "hr_q2",
                    "text": "If partner-supported, which partner(s) support PMTCT personnel?",
                    "type": "text_input",
                    "depends_on": {"hr_q1": ["Partner-supported", "Both public and partner"]},
                    "placeholder": "E.g., UPMB, Baylor, EGPAF"
                },
                {
                    "id": "hr_q3",
                    "text": "Are PMTCT services integrated and provided at a designated Mother-Baby Care Point (MBCP)?",
                    "type": "yes_no",
                    "note": "If No, proceed to Q4–Q8 to explore distribution of services"
                },
                {
                    "id": "hr_q4",
                    "text": "Where is HIV testing for pregnant women primarily conducted?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "MBCP", "Laboratory", "OPD", "Other"]
                },
                {
                    "id": "hr_q5",
                    "text": "Where is syphilis testing for pregnant women primarily conducted?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "MBCP", "Laboratory", "OPD", "Other"]
                },
                {
                    "id": "hr_q6",
                    "text": "Where is hepatitis B testing for pregnant women primarily conducted?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "MBCP", "Laboratory", "OPD", "Other"]
                },
                {
                    "id": "hr_q7a",
                    "text": "Where is treatment/prophylaxis provided for: HIV?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "ART Clinic", "MBCP", "Other"]
                },
                {
                    "id": "hr_q7b",
                    "text": "Where is treatment/prophylaxis provided for: Syphilis?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "ART Clinic", "MBCP", "Other"]
                },
                {
                    "id": "hr_q7c",
                    "text": "Where is treatment/prophylaxis provided for: Hepatitis B?",
                    "type": "multi_checkbox",
                    "options": ["ANC", "Maternity", "ART Clinic", "MBCP", "Other"]
                },
                {
                    "id": "hr_q8",
                    "text": "Where is the Hepatitis B birth dose vaccine administered?",
                    "type": "multi_checkbox",
                    "options": ["Maternity ward", "EPI/Immunization clinic", "MBCP", "Other"]
                },
                {
                    "id": "hr_q9",
                    "text": "Are there designated personnel responsible for providing comprehensive PMTCT services at each service delivery point?",
                    "type": "yes_no",
                    "note": "If Yes, indicate cadre(s) and their allocation in comments"
                },
                {
                    "id": "hr_q10",
                    "text": "If PMTCT services are not co-located, what are the key gaps and how are patients referred between service points?",
                    "type": "text_area",
                    "placeholder": "Brief description (e.g., no MBCP, mothers referred from ANC to ART clinic)"
                }
            ]
        }
    ]
}


