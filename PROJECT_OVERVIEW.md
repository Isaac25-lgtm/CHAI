# 🏥 CHAI Health Systems Management Portal - Project Overview

## What is CHAI?

**CHAI** (Clinton Health Access Initiative) Health Systems Management Portal is a comprehensive, secure web-based platform designed for health program management in Uganda. It features participant registration and facility assessment tools with automated Excel/PDF reporting and email notifications.

---

## 🎯 Primary Purpose

The CHAI portal serves two main functions:

1. **Participant Registration System** - For tracking health workers, training participants, and managing mobile money disbursements
2. **Facility Assessment Tools** - For evaluating health facility performance using standardized indicators

---

## 🌍 Target Users

- **CHAI (Clinton Health Access Initiative)** staff
- **Ministry of Health Uganda** personnel
- **District Health Offices** in the Acholi Sub Region
- **Health facility managers** and supervisors
- **PMTCT program coordinators**
- **Quality improvement teams**

---

## 🏗️ System Architecture

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Flask 3.0.0 (Python) |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Database** | SQLite (local) / PostgreSQL (production) |
| **Excel Generation** | openpyxl 3.1.2 |
| **PDF Generation** | python-docx, reportlab |
| **Email** | SMTP (Gmail compatible) |
| **Deployment** | Gunicorn WSGI server |
| **Authentication** | Session-based with CSRF protection |

### Key Files

```
CHAI/
├── app.py                      # Main Flask application (1500+ lines)
├── config.py                   # Configuration management
├── models.py                   # Database models (User, Participant, Assessment)
├── utils.py                    # Excel/PDF/Email utilities
├── validators.py               # Data validation
├── logger.py                   # Logging system
├── admin_routes.py             # Admin dashboard routes
├── templates/
│   ├── index.html             # Main portal landing page
│   ├── login.html             # Login page
│   ├── registration.html      # Participant registration (32KB)
│   ├── tools.html             # Assessment tools (284KB - comprehensive!)
│   └── admin_dashboard.html   # Admin interface
├── requirements.txt           # Python dependencies
└── README.md                  # Main documentation
```

---

## 📋 Module 1: Participant Registration

### Purpose
Register and track participants in health programs, trainings, and mentorship activities.

### Key Features
- ✅ Batch participant registration
- ✅ Mobile Money account tracking for disbursements
- ✅ District and facility-based organization
- ✅ Real-time data validation
- ✅ Automated Excel report generation
- ✅ Email notifications with attachments
- ✅ Table view of registered participants
- ✅ Delete/edit functionality

### Data Fields Captured
1. Participant's Name
2. Cadre (e.g., Nurse, Doctor, CHW)
3. Duty Station (Facility)
4. District
5. Mobile Number Registered
6. Names Registered on Mobile Money
7. Registration Date
8. Campaign Day (optional)

### Output Formats
- **Excel (.xlsx)** - For finance processing and data analysis
- **PDF (.pdf)** - For printing and archival

### Use Cases
- PMTCT mentorship registration
- Training participant management
- Mobile money disbursement tracking
- Health worker enrollment
- Event registration

---

## 🏥 Module 2: Facility Assessment Tools

### Purpose
Conduct comprehensive health facility assessments using standardized indicators across multiple domains.

### Assessment Categories

The assessment tool covers **19 comprehensive sections**:

#### PMTCT & Triple Elimination (HIV, Syphilis, Hepatitis B)
1. **Triple Elimination Treatment Linkage**
   - HIV, Syphilis, and Hepatitis B screening and treatment
   - Viral load monitoring
   - ART initiation tracking

2. **ART in PMTCT Facilities**
   - VL uptake at ANC1
   - Screening for STI/CaCx/GBV
   - Family planning integration

3. **Quality of PMTCT Services**
   - Chart review of 10 clients
   - Service quality indicators
   - Retention and suppression rates

#### Patient Management & Tracking
4. **Patient Tracking - HIV+ Pregnant Women**
   - Standard procedures for tracking
   - Defaulter tracking systems
   - Documentation completeness

5. **Adherence Support**
   - Adherence counseling systems
   - Routine adherence assessments
   - Intervention documentation

6. **Facility Linkage to Community Care**
   - Referral systems to community services
   - Follow-up documentation
   - Linkage optimization

#### STI & Screening Services
7. **STI Screening and Management**
   - Syndromic screening procedures
   - Treatment access and referrals
   - Partner notification services

#### Early Infant Diagnosis (EID)
8. **Early Infant Diagnosis [HEI]**
   - DBS collection systems
   - PCR testing tracking
   - Final HIV status documentation

9. **CTX for HIV-Exposed Infants**
   - CTX initiation by 8 weeks
   - Documentation completeness
   - Written procedures

10. **Tracking HIV-Exposed Infants**
    - Tracking through breastfeeding
    - Mother-infant appointment systems
    - LTFU rate monitoring

11. **Enrollment of HIV-Infected Infants into ART**
    - Linkage documentation
    - EID register tracking
    - ART enrollment verification

#### Supply Chain Management
12. **Supply Chain - EID Supplies**
    - DBS collection supplies
    - Stock-out prevention
    - Emergency order tracking

13. **Supply Chain - HIV PMTCT (Mother)**
    - HIV test kits availability
    - Maternal ARVs stock
    - Stock-out history

14. **Supply Chain - Syphilis PMTCT**
    - Syphilis RDT availability
    - Benzathine penicillin stock
    - Testing/treatment integration

15. **Supply Chain - Hepatitis B PMTCT**
    - HBsAg test kits
    - TDF/TDF+3TC prophylaxis
    - Birth dose vaccine availability

#### Human Resources & Service Delivery
16. **Human Resources and Service Delivery Points**
    - Personnel funding sources
    - Service integration at MBCP
    - Service point mapping

#### Data Management
17. **HEI/EID Registers**
    - Register availability and use
    - Completeness and legibility
    - Security and confidentiality

18. **ANC/Maternity/PNC Registers**
    - 11 different register types
    - Completeness assessment
    - Documentation quality

19. **Patient/Beneficiary Records**
    - Record maintenance systems
    - Storage security
    - Filing system organization

### Scoring System

Each indicator is scored using a **4-point color-coded scale**:

| Score | Color | Performance Level | Description |
|-------|-------|-------------------|-------------|
| **4** | 🟢 Dark Green | Excellent | Fully meets standards, best practices observed |
| **3** | 🟢 Light Green | Good | Meets most standards with minor gaps |
| **2** | 🟡 Yellow | Needs Improvement | Significant gaps identified |
| **1** | 🔴 Red | Poor | Major deficiencies requiring urgent attention |

### Output Formats

**Excel Report (3 sheets):**
1. **Summary Dashboard** - Overview, scores, and key gaps
2. **Detailed Scores** - Individual indicator assessments
3. **Action Plan** - Priority improvements and recommendations

**PDF Snapshot:**
- Section-specific PDF reports
- Print-ready format
- Preserves all responses and scores

---

## 📥 Download System

### Download Options Available

| Module | Format | Purpose |
|--------|--------|---------|
| Registration | Excel (.xlsx) | Finance processing, data analysis |
| Registration | PDF (.pdf) | Printing, archival |
| Assessment | Excel (.xlsx) | Comprehensive 3-sheet report |
| Assessment | PDF (.pdf) | Section-specific snapshots |

### How Downloads Work

1. **User fills in data** (participants or assessment)
2. **Submit button** saves to database + sends email
3. **Download buttons** generate files on-demand
4. **Files are temporary** - auto-deleted after download
5. **Email integration** - files automatically attached to emails

For complete details, see **[DOWNLOAD_OPTIONS_GUIDE.md](DOWNLOAD_OPTIONS_GUIDE.md)**

---

## 🔒 Security Features

### Authentication & Authorization
- ✅ Login required for all operations
- ✅ Session-based authentication
- ✅ CSRF protection on all forms
- ✅ Session expiration (24 hours)
- ✅ Password validation (basic - should be enhanced in production)

### Data Protection
- ✅ Input validation and sanitization
- ✅ Rate limiting (prevents abuse)
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ XSS protection (template escaping)
- ✅ Secure session cookies

### Audit & Logging
- ✅ Activity logging (login, registration, assessment)
- ✅ API call logging with response times
- ✅ Security event logging
- ✅ Database transaction logging

---

## 👥 User Roles

### Admin Users
- Full access to admin dashboard
- View all participants and assessments
- Download consolidated reports
- User management (create/delete users)
- Activity log access

### Regular Users
- Access to registration module
- Access to assessment tools module
- Can submit and download own data
- Limited to assigned facilities/districts

---

## 📊 Database Schema

### Main Tables

1. **users**
   - id, username, password, role, email
   - created_at, last_login

2. **participants**
   - id, participant_name, cadre, duty_station
   - district, mobile_number, mobile_money_name
   - registration_date, campaign_day, submitted_by
   - created_at

3. **assessments**
   - id, facility_name, district, facility_level, ownership
   - assessor_name, assessment_date
   - scores_json (all indicator scores)
   - overall_score, category scores
   - campaign_day, submitted_by, created_at

4. **activity_logs**
   - id, activity_type, username, details
   - module, facility_name, ip_address, timestamp

---

## 📧 Email Integration

### Configuration
- **SMTP Server:** Gmail (smtp.gmail.com:587)
- **Authentication:** App passwords (OAuth2)
- **Recipient:** Configurable via environment variable
- **Attachments:** Excel files (registration, assessment)

### Email Features
- ✅ Automatic sending on form submission
- ✅ Professional formatting
- ✅ Excel attachments
- ✅ Delivery confirmation
- ✅ Fallback to manual download if email fails

### Setup Instructions
1. Configure SMTP credentials in `.env` file
2. Use Gmail App Password (not regular password)
3. Set RECIPIENT_EMAIL for your team
4. Test email delivery

---

## 🚀 Deployment Options

### Local Development
```bash
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
python app.py
```

### Render.com (Recommended - Free)
1. Fork repository
2. Connect to Render
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn app:app`

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

### Windows Executable
- Standalone .exe available in releases
- No installation required
- Browser opens automatically

---

## 🎯 Real-World Use Cases

### PMTCT Programs
- Register pregnant women in PMTCT programs
- Track ART initiation and adherence
- Assess facility PMTCT service quality
- Monitor HIV-exposed infant follow-up

### Health Facility Assessments
- Conduct SIMS (Site Improvement through Monitoring System) assessments
- Identify gaps in service delivery
- Create action plans for quality improvement
- Track performance over time

### Training & Mentorship
- Register training participants
- Track mobile money disbursements
- Manage mentorship programs
- Generate attendance reports

### Supply Chain Monitoring
- Assess commodity availability
- Track stock-outs
- Monitor emergency orders
- Ensure consistent supply of test kits and medicines

---

## 📈 Reporting & Analytics

### Available Reports

1. **Participant Registration Report**
   - List of all registered participants
   - Mobile money details for disbursements
   - Facility and district breakdown

2. **Assessment Summary Report**
   - Overall facility performance score
   - Section-wise scores and percentages
   - Key gaps identified
   - Color-coded visualization

3. **Detailed Assessment Report**
   - Individual indicator scores
   - Comments and observations
   - Performance percentages
   - Trend analysis

4. **Action Plan Template**
   - Priority-ranked improvements
   - Gap-based recommendations
   - Resource requirements
   - Implementation tracking

### Admin Dashboard Analytics
- Total participants registered
- Total assessments completed
- Recent activity timeline
- User activity logs
- Download consolidated reports

---

## 🔄 Typical Workflows

### Registration Workflow
1. User logs in
2. Navigates to Registration module
3. Adds participants (one or batch)
4. Reviews participant table
5. Clicks "Submit" (saves + emails)
6. Downloads Excel for finance
7. Downloads PDF for filing (optional)
8. Clears form for next batch

### Assessment Workflow
1. User logs in
2. Navigates to Assessment Tools
3. Selects facility and enters basic info
4. Completes relevant sections
5. Scores indicators (0-4 scale)
6. Reviews responses
7. Clicks "Submit" (saves + emails)
8. Downloads Excel report
9. Downloads section PDFs as needed
10. Uses action plan template for QI

---

## 🛠️ Customization

### To Add/Modify Assessment Sections
Edit `TOOL_SECTIONS` in `app.py` (lines 95-864)

### To Change Scoring Criteria
Edit `SCORING_CRITERIA` in `app.py` (lines 868-874)

### To Modify Excel Formatting
Edit `ExcelGenerator` class in `utils.py`

### To Add New User Fields
Update `User` model in `models.py` and run migrations

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Main project overview and setup |
| **DOWNLOAD_OPTIONS_GUIDE.md** | Comprehensive download functionality guide |
| **PROJECT_OVERVIEW.md** | This file - high-level project explanation |
| **DEPLOYMENT.md** | Deployment instructions |
| **ADMIN_DASHBOARD_IMPLEMENTATION.md** | Admin features documentation |
| **DOUBLE_CONFIRMATION_FEATURE.md** | Security features documentation |
| **FIXES_SUMMARY.md** | Bug fixes and improvements log |

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📞 Support

- **Email:** omodingisaac111@gmail.com
- **GitHub Issues:** [Create an issue](https://github.com/Isaac25-lgtm/CHAI/issues)
- **Organization:** CHAI (Clinton Health Access Initiative)
- **Region:** Acholi Sub Region, Uganda

---

## 📄 License

MIT License - free to use and modify for health system strengthening initiatives

---

## 🎓 Learning Resources

### For Developers
- Flask documentation: https://flask.palletsprojects.com/
- openpyxl documentation: https://openpyxl.readthedocs.io/
- SQLAlchemy ORM: https://docs.sqlalchemy.org/

### For Users
- DOWNLOAD_OPTIONS_GUIDE.md - How to use download features
- README.md - Quick start guide
- ADMIN_DASHBOARD_IMPLEMENTATION.md - Admin features

---

## 🌟 Project Highlights

- **🔐 Secure:** Login required, CSRF protection, rate limiting
- **📊 Comprehensive:** 19 assessment sections, 100+ indicators
- **📧 Automated:** Email reports with Excel attachments
- **📱 Responsive:** Works on desktop, tablet, and mobile
- **🌍 Real-world:** Used in Uganda health programs
- **🆓 Free:** Open source with MIT license
- **☁️ Cloud-ready:** Deployable to Render, Heroku, PythonAnywhere

---

**Built with ❤️ for improving health systems in Uganda**

*Supporting PMTCT, HIV/AIDS programs, and health facility quality improvement across the Acholi Sub Region*

---

**Last Updated:** November 2024  
**Version:** 2.0.0  
**Author:** CHAI Development Team
