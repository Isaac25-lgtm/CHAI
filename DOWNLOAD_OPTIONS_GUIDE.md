# 📥 CHAI Download Options - Complete Guide

## Overview

The CHAI Health Systems Management Portal provides robust download functionality for both **Participant Registration** and **Facility Assessment** data. This guide explains all available download options, their formats, and use cases.

---

## 🎯 Download Options Summary

| Feature | Format | Location | Purpose |
|---------|--------|----------|---------|
| **Participant Registration** | Excel (.xlsx) | Registration Module | Download participant data for finance processing and record keeping |
| **Participant Registration** | PDF (.pdf) | Registration Module | Download printable snapshot of registered participants |
| **Assessment Reports** | Excel (.xlsx) | Assessment Tools Module | Download comprehensive 3-sheet facility assessment report |
| **Assessment Sections** | PDF (.pdf) | Assessment Tools Module | Download section-specific assessment snapshot |

---

## 📋 Participant Registration Downloads

### 1. Excel Download (`.xlsx`)

**Location:** Registration page → "Download Excel" button

**What it contains:**
- Professionally formatted Excel spreadsheet
- All registered participants in a tabular format
- Columns included:
  1. **No.** - Sequential participant number
  2. **Participant's Name** - Full name
  3. **Cadre** - Professional category (e.g., Nurse, Doctor, CHW)
  4. **Duty Station (Facility)** - Where they work
  5. **District** - Geographic location
  6. **Mobile Number Registered** - Contact number
  7. **Names Registered on Mobile Money** - First & Last Names for disbursements

**Use cases:**
- Finance team processing mobile money disbursements
- Program management and participant tracking
- Data archiving and record keeping
- Further analysis in Excel
- Integration with other systems

**Features:**
- ✅ Editable by default (users can modify after download)
- ✅ Professional formatting with headers and borders
- ✅ Optimized column widths for readability
- ✅ Compatible with all Excel versions
- ✅ Can be imported into databases

**How to use:**
1. Add participants to the registration form
2. Review the participant list in the table
3. Click **"Download Excel"** button
4. Excel file will be downloaded to your browser's download folder
5. File naming: `participant_registration_YYYYMMDD_HHMMSS.xlsx`

---

### 2. PDF Download (`.pdf`)

**Location:** Registration page → "Download PDF" button

**What it contains:**
- Printable PDF document
- Screenshot-like replica of the participant registration
- Same data as Excel format but in PDF layout
- Professional formatting for printing and archival

**Use cases:**
- Creating physical copies for filing
- Print-friendly format for meetings
- Archival purposes (PDF/A compatible)
- Quick sharing via email or messaging
- Offline reference without Excel

**Features:**
- ✅ Print-ready format
- ✅ Preserves formatting across devices
- ✅ Cannot be edited (data integrity)
- ✅ Smaller file size than Excel
- ✅ Universal compatibility

**How to use:**
1. Add participants to the registration form
2. Review the participant list
3. Click **"Download PDF"** button
4. PDF file will be downloaded to your browser's download folder
5. File naming: `participant_registration_YYYY-MM-DD.pdf`

---

## 🏥 Assessment Reports Downloads

### 3. Comprehensive Assessment Excel (`.xlsx`)

**Location:** Assessment Tools page → "Download Excel" button (after completing assessment)

**What it contains:**
A comprehensive **3-sheet Excel workbook**:

#### **Sheet 1: Assessment Summary**
- Facility information (name, district, level, ownership)
- Assessor details and assessment date
- Overall performance score and percentage
- Section-wise performance breakdown
- Key gaps identified
- Color-coded performance indicators

#### **Sheet 2: Detailed Indicator Scores**
- Individual indicator assessments
- Scores for each criterion (0-5 scale)
- Comments and observations
- Performance percentages
- Color-coded results (Red/Yellow/Light Green/Dark Green)

#### **Sheet 3: Action Plan Template**
- Priority-ranked improvements
- Gap-based recommendations
- Space for responsible persons
- Timeline fields
- Resource requirements
- Implementation tracking

**Scoring System:**
- **4 (Dark Green)** = Excellent - Fully meets standards, best practices observed
- **3 (Light Green)** = Good - Meets most standards with minor gaps
- **2 (Yellow)** = Needs Improvement - Significant gaps identified
- **1 (Red)** = Poor - Major deficiencies requiring urgent attention
- **0** = Not assessed/Not applicable

**Use cases:**
- Facility performance analysis
- Quality improvement planning
- Gap identification and prioritization
- Monitoring and evaluation
- Reporting to stakeholders
- Program documentation

**Features:**
- ✅ Editable by default (customize action plans)
- ✅ Three professional worksheets
- ✅ Color-coded performance visualization
- ✅ Ready-to-use action plan template
- ✅ Automatic calculations and percentages

**How to use:**
1. Complete the facility assessment form
2. Fill in all required sections and scores
3. Click **"Download Excel"** button
4. Excel workbook will be downloaded
5. File naming: `assessment_report_FacilityName_YYYYMMDD_HHMMSS.xlsx`

---

### 4. Section-Specific Assessment PDF (`.pdf`)

**Location:** Assessment Tools page → "Download Section PDF" button (for specific sections)

**What it contains:**
- PDF snapshot of a specific assessment section
- Section name and description
- All questions and responses for that section
- Scores and color-coded results
- Facility information header
- Assessment date and assessor details

**Sections available:**
- TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment
- ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)
- Quality of PMTCT services (Review 10 client's charts)
- Patient Tracking HIV+ Pregnant Women
- Adherence Support
- Facility Linkage to Community Care and Support Services for Adult PLHIV
- STI Screening and Management in HIV Clinics Serving General Population
- Early Infant Diagnosis [HEI]
- CTX for HIV-Exposed Infants [HEI]
- Tracking HIV-Exposed Infants [HEI]
- Enrolment of HIV-Infected Infants (EID Services into ART Services)
- HIV Exposed Infant/Early Infant Diagnosis Registers
- Supply Chain Reliability (Early Infant Diagnosis) [HEI]
- Supply Chain Reliability – HIV PMTCT (Mother)
- Supply Chain Reliability – Syphilis PMTCT
- Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)
- Human Resources and Service Delivery Points
- ANC/Maternity/PNC Registers
- Patient/Beneficiary Records

**Use cases:**
- Quick reference for specific sections
- Targeted feedback to facility staff
- Section-specific action planning
- Focused quality improvement
- Sharing specific findings without full report

**Features:**
- ✅ Section-focused view
- ✅ Print-ready format
- ✅ Preserves all responses and scores
- ✅ Professional formatting
- ✅ Cannot be edited (data integrity)

**How to use:**
1. Complete assessment for a specific section
2. Click **"Download Section PDF"** button for that section
3. PDF file will be downloaded
4. File naming: `assessment_section_SectionName_YYYY-MM-DD.pdf`

---

## 🔄 Download Workflow

### Typical Registration Workflow:
1. **Navigate** to Registration module
2. **Add participants** one by one or in batch
3. **Review** the participant table
4. **Submit** to save data to database and send email
5. **Download Excel** for finance processing
6. **Download PDF** for physical filing (optional)
7. **Clear form** to start fresh

### Typical Assessment Workflow:
1. **Navigate** to Assessment Tools module
2. **Select facility** and enter basic information
3. **Complete sections** relevant to the facility
4. **Score indicators** using 0-5 scale
5. **Submit** to save assessment to database and send email
6. **Download Excel** for comprehensive report
7. **Download Section PDF** for specific feedback (optional)

---

## 📧 Email Integration

All downloads are also automatically emailed when you click "Submit" (if email is configured):

### What gets emailed:
- **Registration:** Excel file attached to email
- **Assessment:** Excel report attached to email

### Email recipients:
- Configured in `config.py` (line 28): `RECIPIENT_EMAIL`
- Default: `omodingisaac111@gmail.com` for centralized record keeping
- Can be overridden via environment variable

### Email features:
- ✅ Automatic attachment of Excel files
- ✅ Professional email formatting
- ✅ Delivery confirmation
- ✅ Fallback: If email fails, you can still download manually

---

## 💾 File Storage

### Temporary files:
- All downloads are generated as **temporary files**
- Files are automatically cleaned up after download
- No files are permanently stored on the server

### Database storage:
- All participant and assessment data is **saved to the database**
- You can regenerate reports anytime from the admin dashboard
- Database provides audit trail and historical records

---

## 🔒 Security & Permissions

### Download Access:
- ✅ **Login required** - Must be authenticated to download
- ✅ **Rate limited** - Prevents abuse (30-50 downloads per hour)
- ✅ **CSRF protection** - Prevents unauthorized downloads
- ✅ **Data validation** - Ensures data integrity before download

### File Protection:
- **Excel files:** Editable by default (allows customization)
- **PDF files:** Read-only (preserves data integrity)
- **No password protection** - Files are accessible to all users who download them

---

## 🎨 Customization Options

### To modify Excel formatting:
Edit `utils.py` → `ExcelGenerator` class methods:
- `_apply_header_styling()` - Change header colors and fonts
- `_set_column_widths()` - Adjust column widths
- `_create_summary_sheet()` - Customize summary dashboard

### To change PDF layout:
Edit `utils.py` → `PDFGenerator` class methods:
- `create_registration_pdf()` - Modify registration PDF layout
- `create_section_pdf()` - Customize section PDF format

### To modify download file naming:
Edit the filename generation in:
- Line 57 in `utils.py` for participant Excel
- Line 124 in `utils.py` for assessment Excel

---

## 🐛 Troubleshooting

### "Please add at least one participant before downloading"
- **Cause:** No participants in the list
- **Solution:** Add participants first, then download

### "Validation errors found"
- **Cause:** Invalid or missing required data
- **Solution:** Check error messages and fix data entry

### "Error downloading file"
- **Cause:** Network issue or server error
- **Solution:** Try again or check browser console for errors

### Email sent but want to download again
- **Cause:** Email was sent but you need another copy
- **Solution:** Click "Download Excel" or "Download PDF" button

### Excel file won't open
- **Cause:** Corrupted download or old Excel version
- **Solution:** Re-download file or use newer Excel version

### PDF displays incorrectly
- **Cause:** PDF viewer compatibility
- **Solution:** Try different PDF viewer (Adobe Reader, browser built-in)

---

## 📊 Technical Details

### API Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/download` | POST | Download participant Excel |
| `/download-registration-pdf` | POST | Download participant PDF |
| `/download-assessment` | POST | Download assessment Excel |
| `/download-assessment-pdf` | POST | Download section PDF |

### Request Format:
All download endpoints expect JSON POST requests with appropriate data:
```json
{
  "participants": [...],  // For registration downloads
  "scores": {...},        // For assessment downloads
  "facilityName": "...",  // Facility information
  ...
}
```

### Response Format:
- **Success:** File download (binary stream)
- **Error:** JSON response with error message

### Rate Limits:
- **Registration downloads:** 30 requests per hour per IP
- **Assessment downloads:** 20 requests per hour per IP

---

## 📚 Related Documentation

- **README.md** - Main project overview
- **DEPLOYMENT.md** - Deployment instructions
- **ADMIN_DASHBOARD_IMPLEMENTATION.md** - Admin features
- **DOUBLE_CONFIRMATION_FEATURE.md** - Security features

---

## 🤝 Support

For questions about download functionality:
- **Email:** omodingisaac111@gmail.com
- **GitHub Issues:** [Create an issue](https://github.com/Isaac25-lgtm/CHAI/issues)

---

**Last Updated:** November 2024  
**Version:** 2.0.0  
**Author:** CHAI Development Team
