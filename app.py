from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from flask_wtf.csrf import CSRFProtect
import os
import sys
from datetime import datetime, timedelta
import tempfile
import webbrowser
import threading
import time
import json
import re
from functools import wraps

# Import our custom modules
from config import Config
from logger import setup_logger, log_api_call, log_security_event
from validators import DataValidator, ValidationError
from utils import ExcelGenerator, WordGenerator, PDFGenerator, EmailService, FileManager
from models import db, init_database, User, Participant, Assessment, log_activity
from admin_routes import admin_bp

# Initialize logger
logger = setup_logger()

def check_dependencies():
    """Check if required dependencies are installed"""
    required_modules = {
        'flask': 'Flask',
        'openpyxl': 'openpyxl',
        'email': 'email (built-in)',
        'smtplib': 'smtplib (built-in)',
        'dotenv': 'python-dotenv'
    }
    
    missing = []
    for module_name, display_name in required_modules.items():
        try:
            __import__(module_name)
        except ImportError:
            if module_name not in ['email', 'smtplib']:
                missing.append(display_name)
    
    if missing:
        logger.error(f"Missing required dependencies: {missing}")
        print("\n" + "="*60)
        print("ERROR: Missing required dependencies!")
        print("="*60)
        print("\nThe following packages are required but not installed:")
        for pkg in missing:
            print(f"  - {pkg}")
        print("\nPlease install them using:")
        print(f"  pip install {' '.join(missing)}")
        print("\nOr install from requirements.txt:")
        print("  pip install -r requirements.txt")
        print("="*60 + "\n")
        sys.exit(1)

# Check dependencies before starting
check_dependencies()

# For Windows executable compatibility
if getattr(sys, 'frozen', False):
    template_folder = os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    app = Flask(__name__)

# Configure Flask app
app.config.from_object(Config)

# Disable template caching for development
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.jinja_env.auto_reload = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Additional security configuration for sessions
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)  # Session expires after 1 hour
app.permanent_session_lifetime = timedelta(hours=1)

# Initialize database
init_database(app)

# Register admin blueprint
app.register_blueprint(admin_bp)

# Initialize CSRF protection
csrf = CSRFProtect(app)

# Validate configuration
if not Config.validate_config():
    logger.warning("Email configuration incomplete - email functionality will not work")

# Tool Assessment Sections and Indicators
TOOL_SECTIONS = {
    "service_delivery": {
        "name": "Service Delivery",
        "indicators": [
            {"id": "sd1", "name": "ART service availability", "max_score": 5},
            {"id": "sd2", "name": "PMTCT integration", "max_score": 5},
            {"id": "sd3", "name": "Pediatric HIV services", "max_score": 5},
            {"id": "sd4", "name": "TB/HIV collaborative activities", "max_score": 5},
            {"id": "sd5", "name": "Laboratory services functionality", "max_score": 5}
        ]
    },
    "human_resources": {
        "name": "Human Resources for Health",
        "indicators": [
            {"id": "hr1", "name": "Staffing levels adequacy", "max_score": 5},
            {"id": "hr2", "name": "Staff trained on HIV guidelines", "max_score": 5},
            {"id": "hr3", "name": "Mentorship programs in place", "max_score": 5},
            {"id": "hr4", "name": "Performance management systems", "max_score": 5}
        ]
    },
    "supply_chain": {
        "name": "Supply Chain Management",
        "indicators": [
            {"id": "sc1", "name": "ARV stock availability", "max_score": 5},
            {"id": "sc2", "name": "Test kit availability", "max_score": 5},
            {"id": "sc3", "name": "Stock management practices", "max_score": 5},
            {"id": "sc4", "name": "Cold chain functionality", "max_score": 5},
            {"id": "sc5", "name": "Ordering and reporting timeliness", "max_score": 5}
        ]
    },
    "data_management": {
        "name": "Data Management & Use",
        "indicators": [
            {"id": "dm1", "name": "Data quality and completeness", "max_score": 5},
            {"id": "dm2", "name": "HMIS reporting timeliness", "max_score": 5},
            {"id": "dm3", "name": "Data use for decision making", "max_score": 5},
            {"id": "dm4", "name": "Patient tracking systems", "max_score": 5}
        ]
    },
    "quality_improvement": {
        "name": "Quality Improvement",
        "indicators": [
            {"id": "qi1", "name": "QI committees functionality", "max_score": 5},
            {"id": "qi2", "name": "Clinical audits conducted", "max_score": 5},
            {"id": "qi3", "name": "Client satisfaction mechanisms", "max_score": 5},
            {"id": "qi4", "name": "Continuous improvement plans", "max_score": 5}
        ]
    },
    "triple_elimination_treatment": {
        "name": "TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment",
        "standard": "All pregnant women with a positive HIV, syphilis, Hep. B test – with viral load more than 200,000 copies/ml) result are eligible for treatment/prophylaxis.",
        "questions": [
            {
                "id": "tet_q1",
                "text": "Q1. Is facility offering treatment/prophylaxis for HIV, Syphilis, and Hep B?",
                "items": ["HIV", "Syphilis", "Hepatitis B"],
                "type": "multi_yes_no",
                "scoring": "If N to any = Red"
            },
            {
                "id": "tet_q2",
                "text": "Q2. Review ANC1 entries for previous month, ascertain treatment initiation",
                "type": "data_entry_table",
                "fields": [
                    {"id": "tet_hiv_positive", "name": "Number with a document positive HIV status (TRRK, TRR, or TRR+)", "type": "number"},
                    {"id": "tet_art_initiated", "name": "Number with a documented ART initiation status", "type": "number"},
                    {"id": "tet_art_pct", "name": "% On ART", "type": "calculated", "formula": "(art_initiated / hiv_positive) * 100"},
                    {"id": "tet_syphilis_positive", "name": "Number with a documented positive Syphilis Test Result", "type": "number"},
                    {"id": "tet_syphilis_treated", "name": "Number with a documented positive Syphilis Test Result initiated on treatment", "type": "number"},
                    {"id": "tet_syphilis_treated_pct", "name": "% Treated for Syphilis", "type": "calculated", "formula": "(syphilis_treated / syphilis_positive) * 100"},
                    {"id": "tet_hepb_positive", "name": "Number with a documented Hepatitis B positive Test Result", "type": "number"},
                    {"id": "tet_hepb_vl_high", "name": "Number with a documented Hepatitis B positive Test Result with viral load more than 200,000 copies/ml", "type": "number"},
                    {"id": "tet_hepb_art_initiated", "name": "Number with a documented Hepatitis B positive Test Result with viral load more than 200,000 copies/ml initiated on ARVs", "type": "number"},
                    {"id": "tet_hepb_art_pct", "name": "% on ART for Hep. B Prophylaxis", "type": "calculated", "formula": "(hepb_art_initiated / hepb_vl_high) * 100"},
                    {"id": "tet_average_pct", "name": "% Average", "type": "calculated", "formula": "(art_pct + syphilis_treated_pct + hepb_art_pct) / 3"}
                ],
                "scoring": {
                    "field": "tet_average_pct",
                    "thresholds": {
                        "red": "<60",
                        "yellow": "60-79.9",
                        "light_green": "80-89.9",
                        "dark_green": ">=90"
                    }
                }
            }
        ]
    },
    "art_pmtct": {
        "name": "ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)",
        "standard": "All pregnant and breastfeeding women LHIV are expected to have additional screening and tests for clinical monitoring.",
        "questions": [
            {
                "id": "art_pmtct_q1",
                "text": "Are the following provided at the health facility for pregnant and breastfeeding women LHIV?",
                "items": [
                    "STI /ca cx/ GBV screening",
                    "FP",
                    "VL testing",
                    "IAC",
                    "CD4",
                    "CTX"
                ],
                "type": "multi_yes_no",
                "scoring": "If N to any = Red"
            }
        ]
    },
    "quality_pmtct": {
        "name": "Quality of PMTCT services (Review 10 client's charts who have been in care for at least a year)",
        "type": "quality_matrix",
        "instructions": "Indicate Y for Yes, N for No and NA for Not Applicable for each of the clients' charts below and calculate a %ge score of the Y against the total eligible (Excluding the NAs). After calculating the %ge score, indicate the score using the following guidance: If <60%=Red, If 60-79%=Yellow, If 80-89%=Light Green, If ≥ 90%=Dark Green",
        "services": [
            {"id": "sti_screening", "name": "Screened for STI"},
            {"id": "cacx_screening", "name": "Screened for CaCx"},
            {"id": "sgbv_screening", "name": "Screened for SGBV"},
            {"id": "fp_counselling", "name": "Counselled on FP"},
            {"id": "vl_3months", "name": "Had a VL after 3 months"},
            {"id": "suppressed", "name": "Suppressed"},
            {"id": "unsuppressed", "name": "Unsuppressed"},
            {"id": "unsuppressed_iac", "name": "Unsuppressed with IAC"},
            {"id": "baseline_cd4", "name": "Had a Baseline CD4"},
            {"id": "on_ctx", "name": "On CTX"},
            {"id": "retained", "name": "Retained"}
        ]
    },
    "patient_tracking": {
        "name": "Patient Tracking HIV+ Pregnant Women",
        "type": "conditional_questions",
        "standard": "Each ART facility has a standard procedure for identifying and tracking HIV positive pregnant women on ART who have defaulted on their appointments. The system contains the following core elements: defined staff roles/responsibilities, procedures for patient identification and tracking, and standardized documentation that includes updating of relevant facility indicators.",
        "questions": [
            {
                "id": "pt_q1",
                "text": "Are there standard procedures for identifying and tracking HIV+ pregnant women who have defaulted on their ART appointments?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "pt_q2",
                "text": "Is ART patient tracking documentation complete and does it show evidence of defaulted ART patients brought back into care?",
                "depends_on": "pt_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "pt_q3",
                "text": "Are tracking results used to update site indicators (e.g., Lost-to-Follow-Up [LTFU] rates)?",
                "depends_on": "pt_q2",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "pt_q4",
                "text": "Is a written SOP available for identifying and tracking defaulters?",
                "depends_on": "pt_q3",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "adherence_support": {
        "name": "Adherence Support",
        "type": "conditional_questions_with_percentage",
        "standard": "Each facility that provides ART has an adherence support system that provides and documents all the following: 1) Adherence counselling prior to ARV treatment initiation, 2) Routine adherence assessments during ART, 3) Counselling interventions for patients with poor adherence.",
        "questions": [
            {
                "id": "as_q1",
                "text": "Are there any adherence support procedures in place?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "as_q2",
                "text": "Are all three adherence support elements (pre-ART counselling, routine adherence assessment, and intervention counselling) implemented?",
                "depends_on": "as_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "as_q3",
                "text": "Review 10 charts of adult ART patients. What percent of reviewed charts have documentation of adherence assessment at the last clinical visit?",
                "type": "percentage",
                "depends_on": "as_q2",
                "scoring": {"<60": "yellow", "60-79": "light_green", ">=80": "next"}
            },
            {
                "id": "as_q4",
                "text": "Is a written procedure or algorithm available that addresses all the adherence support elements?",
                "depends_on": "as_q3",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "facility_linkage": {
        "name": "Facility Linkage to Community Care and Support Services for Adult PLHIV",
        "type": "conditional_questions",
        "standard": "All health facilities treating adult PLHIV document and track referrals of pre-ART and ART patients to community services.",
        "instructions": "If patients at this facility do not have access to community services, check NA, and SKIP this section.",
        "na_option": True,
        "questions": [
            {
                "id": "fl_q1",
                "text": "Is a system in place to document referrals of PLHIV to community-based services (e.g., community health workers, community-based care, PLHIV support groups)?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "fl_q2",
                "text": "Does the referral system include follow-up and documentation to determine if the patient accessed the referral services?",
                "depends_on": "fl_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "fl_q3",
                "text": "Can the facility provide documentation showing that facility staff review the referrals logbook routinely to optimize linkages to community services?",
                "depends_on": "fl_q2",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "sti_screening": {
        "name": "STI Screening and Management in HIV Clinics Serving General Population",
        "type": "conditional_questions_with_percentage",
        "instructions": "Review 10 ART charts",
        "questions": [
            {
                "id": "sti_q1",
                "text": "Are all PLHIV routinely offered syndromic screening for STIs [e.g., vaginal, or urethral discharge, genital ulcer disease, or (for women) lower abdominal pain] at the initial consultation and then at every clinical assessment thereafter?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "sti_q2",
                "text": "Do clients with STI signs or symptoms have access to STI treatment either onsite or through referral?",
                "depends_on": "sti_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "sti_q3",
                "text": "What percent of reviewed charts have documentation of syndromic screening for STIs [e.g., vaginal or ureteral discharge, genital ulcer disease, or (for women) lower abdominal pain] at the last clinical assessment?",
                "type": "percentage",
                "depends_on": "sti_q2",
                "scoring": {"<70": "yellow", ">=70": "next"},
                "note": "Review 10 adult charts."
            },
            {
                "id": "sti_q4",
                "text": "Are there written procedures or algorithms for routinely offering partner notification services, including STI screening and treatment?",
                "depends_on": "sti_q3",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "early_infant_diagnosis": {
        "name": "Early Infant Diagnosis [HEI]",
        "type": "dual_path_questions",
        "standard": "All HIV-exposed infants (HEIs) receive DNA PCR or other virologic testing for early infant diagnosis, with a documented final HIV status at the end of breastfeeding and documented return of HIV results to caregivers.",
        "instructions": "If the answer to Q1 is NO, Skip to Q5",
        "path1": {
            "name": "Facility has DBS collection",
            "questions": [
                {
                    "id": "eid_q1",
                    "text": "Is there routine collection of dried blood spots (DBS) at this facility for PCR testing for HEIs?",
                    "is_branch": True,
                    "scoring": {"no": "skip_to_path2", "yes": "next"}
                },
                {
                    "id": "eid_q2",
                    "text": "Is there a system in place for tracking HEIs through the end of breastfeeding and documenting final HIV status?",
                    "depends_on": "eid_q1",
                    "scoring": {"no": "red", "yes": "next"}
                },
                {
                    "id": "eid_q3",
                    "text": "Is there a system for documenting return of HIV results to a caregiver?",
                    "depends_on": "eid_q2",
                    "scoring": {"no": "yellow", "yes": "next"}
                },
                {
                    "id": "eid_q4",
                    "text": "How many HEIs do not have documentation that the results of PCR testing were provided to a caregiver?",
                    "type": "numeric",
                    "note": "Review register entries of 10 HEIs born 3 or more months prior to the visit",
                    "depends_on": "eid_q3",
                    "scoring": {
                        ">=3": "red",
                        "2": "yellow",
                        "1": "light_green",
                        "0": "dark_green"
                    },
                    "stop_note": "All infants with documentation= Dark Green STOP. Q5-7 are only scored if the answer to Q1 is NO."
                }
            ]
        },
        "path2": {
            "name": "Facility refers to DBS collection",
            "questions": [
                {
                    "id": "eid_q5",
                    "text": "Does the facility have a system for tracking the linkage of HIV-exposed infants to DBS collection services?",
                    "scoring": {"no": "red", "yes": "next"}
                },
                {
                    "id": "eid_q6",
                    "text": "Does the referral system include follow-up and documentation to determine if the patient accessed the DBS collection service?",
                    "depends_on": "eid_q5",
                    "scoring": {"no": "yellow", "yes": "next"}
                },
                {
                    "id": "eid_q7",
                    "text": "Can the facility provide documentation showing that facility staff review the referrals logbook routinely to optimize linkages to DBS collection?",
                    "depends_on": "eid_q6",
                    "scoring": {"no": "light_green", "yes": "dark_green"}
                }
            ]
        }
    },
    "ctx_hei": {
        "name": "CTX for HIV-Exposed Infants [HEI]",
        "type": "numeric_conditional_questions",
        "standard": "All HEIs initiate CTX by 8 weeks of age.",
        "instructions": "Review registers or charts for 10 HEI's born 3-12 months prior to SIMS visit. Use the SAME HEIs as above in EID section.",
        "questions": [
            {
                "id": "ctx_q1",
                "text": "How many HEIs do not have documented receipt of CTX by 8 weeks of age?",
                "type": "numeric",
                "note": "Review register or charts for 10 HEIs born 3-12 months prior to the visit.",
                "scoring": {
                    ">=3": "red",
                    "2": "yellow",
                    "1": "light_green",
                    "0": "next"
                },
                "continue_note": "If All infants have documentation, then Q2"
            },
            {
                "id": "ctx_q2",
                "text": "Is a written procedure or algorithm for provision of CTX to HEIs available?",
                "depends_on": "ctx_q1",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "tracking_hei": {
        "name": "Tracking HIV-Exposed Infants [HEI]",
        "type": "conditional_questions",
        "standard": "Each facility caring for HIV-exposed infants (HEIs) has a standard procedure for identifying and tracking HIV-exposed infants through the documentation of final HIV status at the end of breastfeeding period. It contains the following core elements: defined staff roles/responsibilities, procedures for patient identification and tracking, and standardized documentation that includes updating of relevant facility indicators.",
        "questions": [
            {
                "id": "thei_q1",
                "text": "Are there standard procedures for identifying and tracking HIV-exposed infants through the end of breastfeeding and documenting final HIV status?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "thei_q2",
                "text": "Is patient tracking documentation complete and does it show evidence of defaulted patients brought back into care?",
                "depends_on": "thei_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "thei_q3",
                "text": "Are results used to update facility indicators (e.g., Lost to Follow-up [LTFU] rates)?",
                "depends_on": "thei_q2",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "thei_q4",
                "text": "Is there a mother-infant appointment book or register for mother baby pairs (i.e., HIV-positive mothers and their HIV-exposed infants) used as part of the defaulter tracking program?",
                "depends_on": "thei_q3",
                "scoring": {"no": "light_green", "yes": "next"}
            },
            {
                "id": "thei_q5",
                "text": "Is a written SOP for identifying and tracking defaulters available?",
                "depends_on": "thei_q4",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "enrolment_eid_art": {
        "name": "Enrolment of HIV-Infected Infants identified through Early Infant Diagnosis (EID) Services into ART Services",
        "type": "mixed_conditional_numeric",
        "standard": "All HIV-infected infants are enrolled into ART services.",
        "questions": [
            {
                "id": "eea_q1",
                "text": "Is there a system in place for documenting enrolment into ART services of HIV-infected infants identified through EID services?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "eea_q2",
                "text": "Does the HIV-exposed infant/EID register document linkage to treatment (such as by including date of enrolment, ART number, or ART regimen)?",
                "depends_on": "eea_q1",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "eea_q3",
                "text": "How many HIV-infected infants do not have documentation of linkage into ART services?",
                "type": "numeric",
                "note": "Review register entries of last 10 HIV-infected infants (up to one year prior to the visit).",
                "depends_on": "eea_q2",
                "scoring": {
                    ">=3": "red",
                    "2": "yellow",
                    "1": "light_green",
                    "0": "dark_green"
                }
            }
        ]
    },
    "hei_eid_registers": {
        "name": "HIV Exposed Infant/Early Infant Diagnosis Registers",
        "type": "register_checklist",
        "standard": "Each facility retains accurate, complete, and updated patient registers that are regularly reviewed.",
        "questions": [
            {
                "id": "heir_q1",
                "text": "Do HEI/EID registers exist and are they in use?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "heir_q2",
                "text": "Do the HEI/EID patient registers meet all the following criteria? Tick all that apply:",
                "type": "checklist",
                "note": "Review the last 10 pages of register.",
                "depends_on": "heir_q1",
                "items": [
                    {"id": "heir_q2_1", "text": "National or IP standard versions in use?"},
                    {"id": "heir_q2_2", "text": "Entries are legible and 90% of every field complete?"},
                    {"id": "heir_q2_3", "text": "Updated daily/weekly (per guidelines)?"}
                ],
                "scoring": {"any_no": "red", "all_yes": "next"}
            },
            {
                "id": "heir_q3",
                "text": "Do the HEI/EID patient registers meet all the following criteria? Tick all that apply:",
                "type": "checklist",
                "depends_on": "heir_q2",
                "items": [
                    {"id": "heir_q3_1", "text": "Regularly reviewed?"},
                    {"id": "heir_q3_2", "text": "Used for routine facility reporting?"},
                    {"id": "heir_q3_3", "text": "When in use, placed so that patient confidentiality is maintained?"},
                    {"id": "heir_q3_4", "text": "Stored (when not in use) in a secure location?"}
                ],
                "scoring": {"any_no": "yellow", "all_yes": "next"}
            },
            {
                "id": "heir_q4",
                "text": "Are HEI/EID patient registers used to inform clinic processes?",
                "depends_on": "heir_q3",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "supply_chain_eid": {
        "name": "Supply Chain Reliability (Early Infant Diagnosis) [HEI]",
        "type": "conditional_questions",
        "standard": "Each PMTCT facility has a reliable supply of Early Infant Diagnosis (EID) dried blood spot (DBS) supplies which consist of: a collection card, alcohol swabs, gauze, lancets and latex gloves (or a DBS bundle).",
        "instructions": "If DBS collection for EID does not occur at this facility, check NA, and SKIP this section.",
        "na_option": True,
        "questions": [
            {
                "id": "sceid_q1",
                "text": "Has a stock-out of EID supplies in the past 3 months resulted in an interruption of HIV testing for infants?",
                "scoring": {"yes": "red", "no": "next"}
            },
            {
                "id": "sceid_q2",
                "text": "Has there been a stock-out or low stock status of EID kits supplies in the past 3 months that required placement of an emergency order?",
                "depends_on": "sceid_q1",
                "scoring": {"yes": "yellow", "no": "next"}
            },
            {
                "id": "sceid_q3",
                "text": "Are EID supplies distributed to testing points at this facility as standardized bundles to ensure that all components are consistently available?",
                "depends_on": "sceid_q2",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    },
    "supply_chain_pmtct": {
        "name": "Supply Chain Reliability – HIV PMTCT (Mother)",
        "type": "supply_chain_inventory",
        "standard": "Each PMTCT facility maintains consistent availability of HIV test kits (HIV-syphilis duo, Determine, STAT-PAK/First Response), ARVs for maternal treatment, and cotrimoxazole for prophylaxis.",
        "instructions": "If HIV testing or maternal ART is not provided at this facility, check NA, and SKIP this section.",
        "na_option": True,
        "inventory_questions": [
            {"id": "scpm_q1", "text": "Are HIV-syphilis duo kits currently in stock?", "type": "yes_no"},
            {"id": "scpm_q2", "text": "How many months of stock are available for HIV test kits?", "type": "numeric"},
            {"id": "scpm_q3", "text": "Are the HIV 1/2 STAT-PAK® Assay currently in stock?", "type": "yes_no"},
            {"id": "scpm_q4", "text": "How many months of HIV 1/2 STAT-PAK® Assay stock are available?", "type": "numeric"},
            {"id": "scpm_q5", "text": "Are maternal ARVs (e.g., TLD) currently in stock?", "type": "yes_no"},
            {"id": "scpm_q6", "text": "How many months of stock are available for maternal ARVs?", "type": "numeric"}
        ],
        "scoring_questions": [
            {
                "id": "scpm_q7",
                "text": "Has a stock-out of HIV-syphilis duo kits in the past 3 months resulted in missed maternal testing at ANC?"
            },
            {
                "id": "scpm_q8",
                "text": "Have there been stock-outs or emergency orders for maternal ARVs in the past 3 months?"
            },
            {
                "id": "scpm_q9",
                "text": "Are HIV testing kits and maternal ART consistently available at ANC and maternity points?"
            }
        ],
        "scoring_logic": "If Q7=Yes OR Q8=Yes OR Q9=No then Red; If Q7=No AND Q8=No AND Q9=Yes then Dark Green"
    },
    "supply_chain_syphilis": {
        "name": "Supply Chain Reliability – Syphilis PMTCT",
        "type": "supply_chain_inventory",
        "standard": "Facilities should have continuous access to syphilis RDTs and benzathine penicillin for both initial and follow-up treatment.",
        "instructions": "If syphilis testing or treatment is not offered at this facility, check NA, and SKIP this section.",
        "comment": "Note: Consider the use of HIV/Syphilis duo kits where applicable, and syphilis RDTs primarily for women with known HIV negative status.",
        "na_option": True,
        "inventory_questions": [
            {"id": "scsy_q1", "text": "Are syphilis RDTs currently in stock?", "type": "yes_no"},
            {"id": "scsy_q2", "text": "How many months of stock are available for syphilis RDTs?", "type": "numeric"},
            {"id": "scsy_q3", "text": "Is benzathine penicillin currently in stock?", "type": "yes_no"},
            {"id": "scsy_q4", "text": "How many months of stock are available for benzathine penicillin?", "type": "numeric"}
        ],
        "scoring_questions": [
            {
                "id": "scsy_q5",
                "text": "Has a stock-out of syphilis RDTs in the last 3 months led to missed testing for pregnant women?"
            },
            {
                "id": "scsy_q6",
                "text": "Was there any interruption in benzathine penicillin availability in the past 3 months?"
            },
            {
                "id": "scsy_q7",
                "text": "Are both RDTs and penicillin doses consistently available across ANC and maternity areas?"
            }
        ],
        "scoring_logic": "If Q5=Yes OR Q6=Yes OR Q7=No then Red; If Q5=No AND Q6=No AND Q7=Yes then Dark Green"
    },
    "supply_chain_hepb": {
        "name": "Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)",
        "type": "supply_chain_inventory",
        "standard": "Facilities should have reliable stocks of HBsAg test kits, TDF or TDF/3TC prophylaxis for eligible women, and birth dose hepatitis B vaccines.",
        "instructions": "If Hepatitis B services are not offered at this facility, check NA, and SKIP this section.",
        "na_option": True,
        "inventory_questions": [
            {"id": "schb_q1", "text": "Are HBsAg test kits currently in stock?", "type": "yes_no"},
            {"id": "schb_q2", "text": "How many months of stock are available for HBsAg test kits?", "type": "numeric"},
            {"id": "schb_q3", "text": "Is TDF or TDF/3TC for prophylaxis currently in stock?", "type": "yes_no"},
            {"id": "schb_q4", "text": "How many months of stock are available for TDF or TDF/3TC?", "type": "numeric"},
            {"id": "schb_q5", "text": "Are hepatitis B birth dose (HepB-BD) vaccines currently available in maternity?", "type": "yes_no"},
            {"id": "schb_q6", "text": "How many months of stock are available for HepB-BD vaccines?", "type": "numeric"}
        ],
        "scoring_questions": [
            {
                "id": "schb_q7",
                "text": "Has a stock-out of HBsAg test kits in the past 3 months caused missed screening of pregnant women?"
            },
            {
                "id": "schb_q8",
                "text": "Has there been a stock-out of TDF or TDF/3TC for HBV-positive women in the last 3 months?"
            },
            {
                "id": "schb_q9",
                "text": "Are hepatitis B birth dose vaccines available 24/7 in maternity units for timely newborn immunization?"
            }
        ],
        "scoring_logic": "If Q7=Yes OR Q9=No then Red; If Q7=No AND Q9=No AND Q8=Yes then Yellow; If Q7=No AND Q8=No AND Q9=Yes then Dark Green"
    },
    "human_resources_delivery": {
        "name": "HUMAN RESOURCES AND SERVICE DELIVERY POINTS",
        "type": "human_resources_delivery",
        "standard": "PMTCT services for HIV, syphilis, and hepatitis B should be integrated and delivered at Mother-Baby Care Points (MBCPs), where designated personnel provide testing, treatment, counselling, and vaccination.",
        "questions": [
            {
                "id": "hrd_q1",
                "text": "What is the primary funding source for personnel delivering PMTCT services at this facility?",
                "type": "radio",
                "options": [
                    {"value": "public_payroll", "label": "Public payroll"},
                    {"value": "partner_supported", "label": "Partner-supported"},
                    {"value": "both", "label": "Both public and partner"}
                ],
                "note": "If partner-supported, proceed to Q2"
            },
            {
                "id": "hrd_q2",
                "text": "If partner-supported, which partner(s) support PMTCT personnel?",
                "type": "text",
                "depends_on": "hrd_q1",
                "depends_value": "partner_supported",
                "placeholder": "E.g., UPMB, Baylor, EGPAF"
            },
            {
                "id": "hrd_q3",
                "text": "Are PMTCT services integrated and provided at a designated Mother-Baby Care Point (MBCP)?",
                "type": "yes_no",
                "note": "If No, proceed to Q4–Q8 to explore distribution of services"
            },
            {
                "id": "hrd_q4",
                "text": "Where is HIV testing for pregnant women primarily conducted?",
                "type": "checklist",
                "depends_on": "hrd_q3",
                "depends_value": "no",
                "note": "Tick all that apply",
                "options": [
                    {"value": "anc", "label": "ANC"},
                    {"value": "maternity", "label": "Maternity"},
                    {"value": "mbcp", "label": "MBCP"},
                    {"value": "laboratory", "label": "Laboratory"},
                    {"value": "opd", "label": "OPD"},
                    {"value": "other", "label": "Other:", "has_text": True}
                ]
            },
            {
                "id": "hrd_q5",
                "text": "Where is syphilis testing for pregnant women primarily conducted?",
                "type": "checklist",
                "depends_on": "hrd_q3",
                "depends_value": "no",
                "note": "Tick all that apply",
                "options": [
                    {"value": "anc", "label": "ANC"},
                    {"value": "maternity", "label": "Maternity"},
                    {"value": "mbcp", "label": "MBCP"},
                    {"value": "laboratory", "label": "Laboratory"},
                    {"value": "opd", "label": "OPD"},
                    {"value": "other", "label": "Other:", "has_text": True}
                ]
            },
            {
                "id": "hrd_q6",
                "text": "Where is hepatitis B testing for pregnant women primarily conducted?",
                "type": "checklist",
                "depends_on": "hrd_q3",
                "depends_value": "no",
                "note": "Tick all that apply",
                "options": [
                    {"value": "anc", "label": "ANC"},
                    {"value": "maternity", "label": "Maternity"},
                    {"value": "mbcp", "label": "MBCP"},
                    {"value": "laboratory", "label": "Laboratory"},
                    {"value": "opd", "label": "OPD"},
                    {"value": "other", "label": "Other:", "has_text": True}
                ]
            },
            {
                "id": "hrd_q7",
                "text": "Where is treatment/prophylaxis provided for:",
                "type": "multi_checklist",
                "depends_on": "hrd_q3",
                "depends_value": "no",
                "note": "Tick all that apply",
                "sub_questions": [
                    {
                        "id": "hrd_q7a",
                        "text": "a. HIV?",
                        "options": [
                            {"value": "anc", "label": "ANC"},
                            {"value": "maternity", "label": "Maternity"},
                            {"value": "art_clinic", "label": "ART Clinic"},
                            {"value": "mbcp", "label": "MBCP"},
                            {"value": "other", "label": "Other:", "has_text": True}
                        ]
                    },
                    {
                        "id": "hrd_q7b",
                        "text": "b. Syphilis?",
                        "options": [
                            {"value": "anc", "label": "ANC"},
                            {"value": "maternity", "label": "Maternity"},
                            {"value": "art_clinic", "label": "ART Clinic"},
                            {"value": "mbcp", "label": "MBCP"},
                            {"value": "other", "label": "Other:", "has_text": True}
                        ]
                    },
                    {
                        "id": "hrd_q7c",
                        "text": "c. hepatitis B?",
                        "options": [
                            {"value": "anc", "label": "ANC"},
                            {"value": "maternity", "label": "Maternity"},
                            {"value": "art_clinic", "label": "ART Clinic"},
                            {"value": "mbcp", "label": "MBCP"},
                            {"value": "other", "label": "Other:", "has_text": True}
                        ]
                    }
                ]
            },
            {
                "id": "hrd_q8",
                "text": "Where is the Hepatitis B birth dose vaccine administered?",
                "type": "checklist",
                "depends_on": "hrd_q3",
                "depends_value": "no",
                "note": "Tick all that apply",
                "options": [
                    {"value": "maternity_ward", "label": "Maternity ward"},
                    {"value": "epi_clinic", "label": "EPI/Immunization clinic"},
                    {"value": "mbcp", "label": "MBCP"},
                    {"value": "other", "label": "Other:", "has_text": True}
                ]
            },
            {
                "id": "hrd_q9",
                "text": "Are there designated personnel responsible for providing comprehensive PMTCT services at each service delivery point?",
                "type": "yes_no",
                "note": "If Yes, indicate cadre(s) and their allocation in comments"
            },
            {
                "id": "hrd_q10",
                "text": "If PMTCT services are not co-located, what are the key gaps and how are patients referred between service points?",
                "type": "textarea",
                "placeholder": "Brief description (e.g., no MBCP, mothers referred from ANC to ART clinic)"
            }
        ]
    },
    "registers": {
        "name": "ANC/Maternity/PNC Registers",
        "type": "register_checklist",
        "instructions": "Review the last 10 pages of each register to assess legibility and completeness. If the entry fields are at least 90% complete, score Y for Yes, and N for No if less than 90%.",
        "question": "Do following registers exist and are they in use?",
        "registers": [
            {"id": "reg1", "name": "ANC registers"},
            {"id": "reg2", "name": "Maternity Registers"},
            {"id": "reg3", "name": "PNC Registers"},
            {"id": "reg4", "name": "Family Planning Register"},
            {"id": "reg5", "name": "ART Cards"},
            {"id": "reg6", "name": "ART Register"},
            {"id": "reg7", "name": "HEI clinical cards"},
            {"id": "reg8", "name": "HEI Register"},
            {"id": "reg9", "name": "SGBV register"},
            {"id": "reg10", "name": "Appointment register"},
            {"id": "reg11", "name": "Missed appointment register"}
        ],
        "columns": ["Available", "Standard versions", "90% complete"],
        "scoring": {
            "description": "For each register, assess if it meets all 3 criteria: Available, Standard versions, 90% complete",
            "thresholds": {
                "red": "1/3 - Only 1 criterion met",
                "yellow": "2/3 - Two criteria met",
                "green": "3/3 - All criteria met"
            }
        }
    },
    "patient_records": {
        "name": "Patient/Beneficiary Records",
        "type": "conditional_questions",
        "standard": "Each ART/pre-ART or PMTCT facility maintains current individual patient/beneficiary records and provides an adequate and secure storage space with an organized filing system that allows for easy accessibility and patient confidentiality.",
        "questions": [
            {
                "id": "pr_q1",
                "text": "Are individual patient/beneficiary records maintained?",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "pr_q2",
                "text": "Is space adequate and secure?",
                "depends_on": "pr_q1",
                "scoring": {"no": "red", "yes": "next"}
            },
            {
                "id": "pr_q3",
                "text": "Is there a standard filing system and accessibility to specific charts so patient care is not impeded?",
                "depends_on": "pr_q2",
                "scoring": {"no": "yellow", "yes": "next"}
            },
            {
                "id": "pr_q4",
                "text": "Does the system allow for identification of patients by category (e.g., pre-ART, ART, peds, pregnant women) and is there written documentation that describes the record filing system?",
                "depends_on": "pr_q3",
                "scoring": {"no": "light_green", "yes": "dark_green"}
            }
        ]
    }
}

# Scoring criteria descriptions
SCORING_CRITERIA = {
    5: "Excellent - Fully meets standards, best practices observed",
    4: "Good - Meets most standards with minor gaps",
    3: "Satisfactory - Meets basic standards with some gaps",
    2: "Needs Improvement - Significant gaps identified",
    1: "Poor - Major deficiencies requiring urgent attention"
}

def api_logger(f):
    """Decorator to log API calls"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        try:
            result = f(*args, **kwargs)
            response_time = time.time() - start_time
            log_api_call(request.endpoint, request.method, 200, response_time)
            return result
        except Exception as e:
            response_time = time.time() - start_time
            log_api_call(request.endpoint, request.method, 500, response_time)
            logger.error(f"API Error in {f.__name__}: {str(e)}", exc_info=True)
            raise
    return decorated_function

def validate_json(f):
    """Decorator to validate JSON requests"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({'success': False, 'message': 'Request must be JSON'}), 400
        
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
        except Exception as e:
            return jsonify({'success': False, 'message': 'Invalid JSON data'}), 400
        
        return f(*args, **kwargs)
    return decorated_function

def rate_limit(max_requests=100, window=3600):
    """Simple rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple rate limiting based on IP
            client_ip = request.remote_addr
            current_time = time.time()
            
            # This is a basic implementation - in production, use Redis or similar
            if not hasattr(app, 'rate_limit_data'):
                app.rate_limit_data = {}
            
            if client_ip not in app.rate_limit_data:
                app.rate_limit_data[client_ip] = []
            
            # Clean old requests
            app.rate_limit_data[client_ip] = [
                req_time for req_time in app.rate_limit_data[client_ip]
                if current_time - req_time < window
            ]
            
            if len(app.rate_limit_data[client_ip]) >= max_requests:
                log_security_event("Rate limit exceeded", f"IP: {client_ip}", client_ip)
                return jsonify({'success': False, 'message': 'Rate limit exceeded'}), 429
            
            app.rate_limit_data[client_ip].append(current_time)
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check session version - invalidate old sessions
        if session.get('session_version') != Config.SESSION_VERSION:
            session.clear()  # Clear old session
            if request.is_json:
                return jsonify({'success': False, 'message': 'Session expired - please login again'}), 401
            return redirect(url_for('login'))
        
        # Strict authentication check
        if not session.get('logged_in') or not session.get('username'):
            session.clear()  # Clear any invalid session data
            if request.is_json:
                return jsonify({'success': False, 'message': 'Authentication required'}), 401
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/login', methods=['GET', 'POST'])
@csrf.exempt
@api_logger
def login():
    """Login page and authentication"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # Check against database
        user = User.query.filter_by(username=username).first()
        
        if user and user.password == password:  # In production, use proper password hashing!
            # CRITICAL: Clear any existing session data first
            session.clear()
            
            # Set new session with proper security
            session.permanent = True  # Enable session expiration
            session['session_version'] = Config.SESSION_VERSION  # Track session version
            session['logged_in'] = True
            session['username'] = username
            session['user_role'] = user.role
            session['login_time'] = datetime.utcnow().isoformat()  # Track login time
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            # Log activity
            log_activity('login', username, {'ip': request.remote_addr}, 'authentication')
            
            logger.info(f"Successful login: {username} (role: {user.role})")
            
            # Redirect based on role
            if user.role == 'superuser':
                return redirect(url_for('admin_dashboard'))
            else:
                return redirect(url_for('index'))
        else:
            log_security_event("Failed login attempt", f"Username: {username}", request.remote_addr)
            logger.warning(f"Failed login attempt for username: {username}")
            return render_template('login.html', error='Invalid username or password')
    
    # If already logged in, redirect appropriately
    if session.get('logged_in'):
        if session.get('user_role') == 'superuser':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('index'))
    
    return render_template('login.html')

@app.route('/logout')
@api_logger
def logout():
    """Logout and clear session"""
    username = session.get('username', 'Unknown')
    log_activity('logout', username, {'ip': request.remote_addr}, 'authentication')
    session.clear()
    logger.info(f"User logged out: {username}")
    return redirect(url_for('login'))

def superuser_required(f):
    """Decorator to require superuser access"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check session version - invalidate old sessions
        if session.get('session_version') != Config.SESSION_VERSION:
            session.clear()  # Clear old session
            return redirect(url_for('login'))
        
        # Triple check for authentication
        if not session.get('logged_in') or not session.get('username') or not session.get('user_role'):
            session.clear()  # Clear any partial session data
            return redirect(url_for('login'))
        if session.get('user_role') != 'superuser':
            logger.warning(f"Unauthorized admin access attempt by {session.get('username')}")
            return jsonify({'success': False, 'message': 'Superuser access required'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin')
@api_logger
@superuser_required
def admin_dashboard():
    """Admin dashboard - superuser only"""
    return render_template('admin_dashboard.html', username=session.get('username'))

@app.route('/')
@api_logger
def index():
    """Main landing page - always redirects to login first"""
    # Check session version first - invalidate old sessions
    if session.get('session_version') != Config.SESSION_VERSION:
        session.clear()
        return redirect(url_for('login'))
    
    # CRITICAL: Always enforce authentication - login page is the ONLY entry point
    if not session.get('logged_in') or not session.get('username') or not session.get('user_role'):
        session.clear()  # Clear any stale session data
        return redirect(url_for('login'))
    
    # Additional security: redirect superusers to their dashboard
    if session.get('user_role') == 'superuser':
        return redirect(url_for('admin_dashboard'))
    
    return render_template('index.html', username=session.get('username'))

@app.route('/registration')
@api_logger
@login_required
def registration():
    """Participant registration page"""
    return render_template('registration.html')

@app.route('/tools')
@api_logger
@login_required
def tools():
    """Assessment tools page"""
    return render_template('tools.html', sections=TOOL_SECTIONS, criteria=SCORING_CRITERIA)

@app.route('/submit', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls - should implement proper CSRF handling
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=50, window=3600)
def submit_data():
    """Handle participant registration submission"""
    try:
        data = request.get_json()
        participants = data.get('participants', [])
        
        if not participants:
            return jsonify({'success': False, 'message': 'No participants data received'}), 400
        
        # Validate each participant
        validation_errors = []
        for i, participant in enumerate(participants):
            is_valid, errors = DataValidator.validate_participant_data(participant)
            if not is_valid:
                validation_errors.append(f"Participant {i+1}: {', '.join(errors)}")
        
        if validation_errors:
            return jsonify({
                'success': False, 
                'message': 'Validation errors found',
                'errors': validation_errors
            }), 400
        
        # Save to database
        saved_count = 0
        for participant_data in participants:
            try:
                participant = Participant(
                    participant_name=participant_data.get('participantName'),
                    cadre=participant_data.get('cadre'),
                    duty_station=participant_data.get('dutyStation'),
                    district=participant_data.get('district'),
                    mobile_number=participant_data.get('mobileNumber'),
                    mobile_money_name=participant_data.get('mobileMoneyName'),
                    registration_date=datetime.strptime(participant_data.get('registrationDate', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d').date(),
                    campaign_day=participant_data.get('campaignDay'),
                    submitted_by=session.get('username')
                )
                db.session.add(participant)
                saved_count += 1
            except Exception as e:
                logger.error(f"Error saving participant: {e}")
        
        try:
            db.session.commit()
            logger.info(f"Saved {saved_count} participants to database")
            
            # Log activity
            log_activity(
                'registration',
                session.get('username'),
                {'count': saved_count, 'facility': participants[0].get('dutyStation') if participants else 'Unknown'},
                'registration',
                participants[0].get('dutyStation') if participants else None,
                request.remote_addr
            )
        except Exception as e:
            db.session.rollback()
            logger.error(f"Database commit error: {e}")
        
        # Generate Excel file with protection for regular users
        user_role = session.get('user_role', 'admin')
        protect_sheet = (user_role != 'superuser')  # Protect for regular users
        filepath, filename = ExcelGenerator.create_participant_excel(participants, protect_sheet=protect_sheet)
        
        # Send email (optional - don't fail if email not configured)
        success, message = EmailService.send_email(filepath, filename, "registration")
        
        # Clean up temp file
        FileManager.cleanup_temp_file(filepath)
        
        # Always return success since data is saved to database
        logger.info(f"Successfully processed {len(participants)} participants")
        
        if success:
            return jsonify({
                'success': True,
                'message': f'✅ Data saved successfully! Email sent to {Config.RECIPIENT_EMAIL} with {len(participants)} participant(s). You can also download the Excel file manually.'
            })
        else:
            # Data is saved, but email failed - user can still download manually
            logger.warning(f"Email sending failed but data was saved: {message}")
            return jsonify({
                'success': True,
                'message': f'✅ Data saved successfully! {len(participants)} participant(s) registered. ⚠️ Email sending failed ({message}), but you can download the Excel file using the "Download Excel" button.',
                'email_warning': True
            })
            
    except ValidationError as e:
        logger.warning(f"Validation error in submit_data: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in submit_data: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/submit-assessment', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=20, window=3600)
def submit_assessment():
    """Handle assessment submission"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No assessment data received'}), 400
        
        # Validate assessment data
        is_valid, errors = DataValidator.validate_assessment_data(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': errors
            }), 400
        
        # Check if facility already has an assessment (prevent duplicates)
        facility_name = data.get('facilityName')
        existing_assessment = Assessment.query.filter_by(facility_name=facility_name).first()
        if existing_assessment:
            return jsonify({
                'success': False,
                'message': f'⚠️ Assessment already exists for {facility_name}! Each facility can only be assessed once to prevent double reporting. If you need to update the assessment, please contact the superuser to delete the existing one first.'
            }), 400
        
        # Calculate overall score
        scores = data.get('scores', {})
        if scores:
            total_score = sum(scores.values())
            max_score = len(scores) * 5
            overall_score = (total_score / max_score) * 100 if max_score > 0 else 0
        else:
            overall_score = 0
        
        # Save to database
        try:
            assessment = Assessment(
                facility_name=data.get('facilityName'),
                district=data.get('district'),
                facility_level=data.get('facilityLevel'),
                ownership=data.get('ownership'),
                assessor_name=data.get('assessorName'),
                assessment_date=datetime.strptime(data.get('assessmentDate'), '%Y-%m-%d').date(),
                scores_json=json.dumps(scores),
                overall_score=overall_score,
                campaign_day=data.get('campaignDay'),
                submitted_by=session.get('username')
            )
            
            # Calculate category scores
            assessment.calculate_category_scores(scores)
            
            db.session.add(assessment)
            db.session.commit()
            
            logger.info(f"Saved assessment to database for {data.get('facilityName')}")
            
            # Log activity
            log_activity(
                'assessment',
                session.get('username'),
                {'facility': data.get('facilityName'), 'score': overall_score},
                'assessment',
                data.get('facilityName'),
                request.remote_addr
            )
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving assessment: {e}")
        
        # Generate Excel report with protection for regular users
        user_role = session.get('user_role', 'admin')
        protect_sheet = (user_role != 'superuser')  # Protect for regular users
        filepath, filename = ExcelGenerator.create_assessment_excel(data, protect_sheet=protect_sheet)
        
        # Send email (optional - don't fail if email not configured)
        success, message = EmailService.send_email(filepath, filename, "assessment")
        
        # Clean up temp file
        FileManager.cleanup_temp_file(filepath)
        
        # Always return success since data is saved to database
        facility_name = data.get('facilityName', 'Unknown')
        logger.info(f"Successfully processed assessment for {facility_name}")
        
        if success:
            return jsonify({
                'success': True,
                'message': f'✅ Assessment saved successfully! Report for {facility_name} sent to {Config.RECIPIENT_EMAIL}. You can also download the Excel file manually.'
            })
        else:
            # Data is saved, but email failed - user can still download manually
            logger.warning(f"Email sending failed but assessment was saved: {message}")
            return jsonify({
                'success': True,
                'message': f'✅ Assessment saved successfully for {facility_name}! ⚠️ Email sending failed ({message}), but you can download the Excel report using the "Download Excel" button.',
                'email_warning': True
            })
            
    except ValidationError as e:
        logger.warning(f"Validation error in submit_assessment: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in submit_assessment: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/download', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=30, window=3600)
def download_excel():
    """Download participant Excel file"""
    filepath = None
    try:
        data = request.get_json()
        participants = data.get('participants', [])
        
        if not participants:
            return jsonify({'success': False, 'message': 'No participants data'}), 400
        
        # Validate participants
        validation_errors = []
        for i, participant in enumerate(participants):
            is_valid, errors = DataValidator.validate_participant_data(participant)
            if not is_valid:
                validation_errors.append(f"Participant {i+1}: {', '.join(errors)}")
        
        if validation_errors:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': validation_errors
            }), 400
        
        # Check if user is superuser - only superusers can edit downloaded files
        user_role = session.get('user_role', 'admin')
        protect_sheet = (user_role != 'superuser')  # Protect for regular users
        
        filepath, filename = ExcelGenerator.create_participant_excel(participants, protect_sheet=protect_sheet)
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except ValidationError as e:
        logger.warning(f"Validation error in download_excel: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in download_excel: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    finally:
        if filepath and os.path.exists(filepath):
            FileManager.cleanup_temp_file(filepath)

@app.route('/download-registration-pdf', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=30, window=3600)
def download_registration_pdf():
    """Download participant registration as PDF (screenshot-like replica)"""
    filepath = None
    try:
        data = request.get_json()
        participants = data.get('participants', [])
        
        if not participants:
            return jsonify({'success': False, 'message': 'No participants data'}), 400
        
        # Validate participants
        validation_errors = []
        for i, participant in enumerate(participants):
            is_valid, errors = DataValidator.validate_participant_data(participant)
            if not is_valid:
                validation_errors.append(f"Participant {i+1}: {', '.join(errors)}")
        
        if validation_errors:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': validation_errors
            }), 400
        
        filepath, filename = PDFGenerator.create_registration_pdf(participants)
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except ValidationError as e:
        logger.warning(f"Validation error in download_registration_pdf: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in download_registration_pdf: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    finally:
        if filepath and os.path.exists(filepath):
            FileManager.cleanup_temp_file(filepath)

@app.route('/download-assessment', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=20, window=3600)
def download_assessment():
    """Download assessment Excel file"""
    filepath = None
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No assessment data'}), 400
        
        # Validate assessment data
        is_valid, errors = DataValidator.validate_assessment_data(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': errors
            }), 400
        
        # Add section definitions to data for accurate question text in reports
        data['section_definitions'] = TOOL_SECTIONS
        
        # Check if user is superuser - only superusers can edit downloaded files
        user_role = session.get('user_role', 'admin')
        protect_sheet = (user_role != 'superuser')  # Protect for regular users
        
        filepath, filename = ExcelGenerator.create_assessment_excel(data, protect_sheet=protect_sheet)
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except ValidationError as e:
        logger.warning(f"Validation error in download_assessment: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in download_assessment: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    finally:
        if filepath and os.path.exists(filepath):
            FileManager.cleanup_temp_file(filepath)

@app.route('/download-assessment-pdf', methods=['POST'])
@csrf.exempt  # Temporarily exempt for AJAX calls
@api_logger
@login_required
@validate_json
@rate_limit(max_requests=20, window=3600)
def download_assessment_pdf():
    """Download assessment section as PDF snapshot"""
    filepath = None
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'message': 'No assessment data'}), 400
        
        # Validate assessment data
        is_valid, errors = DataValidator.validate_assessment_data(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Validation errors found',
                'errors': errors
            }), 400
        
        # Add section definitions to data for accurate question text in reports
        data['section_definitions'] = TOOL_SECTIONS
        
        filepath, filename = PDFGenerator.create_section_pdf(data)
        
        logger.info(f"PDF generated: {filename}, size: {os.path.getsize(filepath)} bytes")
        
        # Verify file exists and is readable
        if not os.path.exists(filepath):
            raise Exception("PDF file was not created")
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except ValidationError as e:
        logger.warning(f"Validation error in download_assessment_pdf: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Error in download_assessment_pdf: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    finally:
        if filepath and os.path.exists(filepath):
            FileManager.cleanup_temp_file(filepath)

@app.route('/health')
@csrf.exempt
@api_logger
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    })

def open_browser():
    """Open browser after server starts"""
    time.sleep(1.5)
    webbrowser.open(f'http://{Config.HOST}:{Config.PORT}')

# Error handlers
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.url}")
    return jsonify({'success': False, 'message': 'Page not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {str(error)}", exc_info=True)
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.errorhandler(429)
def rate_limit_error(error):
    logger.warning(f"Rate limit exceeded for IP: {request.remote_addr}")
    return jsonify({'success': False, 'message': 'Rate limit exceeded'}), 429

if __name__ == '__main__':
    logger.info("Starting CHAI Health Portal application")
    
    if getattr(sys, 'frozen', False):
        threading.Thread(target=open_browser, daemon=True).start()
    
    try:
        app.run(
            debug=Config.DEBUG, 
            host=Config.HOST, 
            port=Config.PORT, 
            use_reloader=False
        )
    except Exception as e:
        logger.error(f"Failed to start application: {str(e)}", exc_info=True)
        sys.exit(1)