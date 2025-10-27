# PMTCT Assessment Implementation

## Overview

A comprehensive PMTCT (Prevention of Mother-to-Child Transmission) assessment tool has been integrated into the Participant Registration System. This tool provides a detailed assessment framework covering HIV, Syphilis, and Hepatitis B services for pregnant women and HIV-exposed infants.

## Implementation Date

October 25, 2025

## What Has Been Implemented

### 1. PMTCT Configuration File (`pmtct_config.py`)

A structured Python configuration file containing the complete PMTCT assessment framework with:

- **19 Major Assessment Sections** including:
  - ANC/Maternity/PNC Registers
  - Patient/Beneficiary Records
  - Triple Elimination (HIV, Syphilis, Hep B) - Testing & Treatment
  - ART in PMTCT Facilities
  - Patient Tracking for HIV+ Pregnant Women
  - Adherence Support
  - Community Linkage
  - STI Screening and Management
  - Early Infant Diagnosis (EID)
  - CTX for HIV-Exposed Infants
  - Tracking HIV-Exposed Infants
  - Enrollment of HIV-Infected Infants
  - HEI/EID Registers
  - Supply Chain Reliability (EID, HIV, Syphilis, Hepatitis B)
  - Human Resources and Service Delivery Points

- **Multiple Question Types**:
  - Yes/No questions
  - Multi Yes/No (checkbox lists)
  - Number inputs
  - Percentage inputs
  - Text inputs and text areas
  - Radio buttons
  - Multi-checkbox selections
  - Data entry tables with automatic calculations
  - Chart review tables (for reviewing 10 client charts)
  - Checklist tables

- **Advanced Scoring Logic**:
  - Color-coded scoring (Red, Yellow, Light Green, Dark Green)
  - Percentage-based thresholds
  - Conditional question flows
  - Automatic calculations for data entry tables
  - NA (Not Applicable) options for sections

### 2. Frontend JavaScript (`static/js/pmtct_assessment.js`)

A comprehensive JavaScript module providing:

- Dynamic rendering of assessment sections based on configuration
- Question type handlers for all question types
- Response collection and validation
- Conditional question logic (show/hide based on previous answers)
- Automatic calculations for data entry tables
- Score calculation based on responses
- Data export for submission

### 3. CSS Styling (`static/css/pmtct_assessment.css`)

Professional styling for the PMTCT assessment interface including:

- Clean, modern card-based layout
- Responsive design for mobile and desktop
- Color-coded score indicators
- Interactive form elements
- Table styles for data entry and chart reviews
- Progress indicators
- Validation error styling

### 4. Backend API Integration (`app.py`)

New API endpoint added:
```python
@app.route('/api/pmtct-config')
@login_required
def get_pmtct_config()
```

This endpoint serves the PMTCT assessment configuration to the frontend.

### 5. User Interface Updates (`templates/tools.html`)

Enhanced the Facility Assessment Tools page with:

- **Assessment Type Selector**: Toggle between:
  - Standard Hepatitis B Assessment (existing 5-point scoring system)
  - Comprehensive PMTCT Assessment (new detailed assessment)

- **Seamless Integration**: Both assessment types share the same facility information form

- **Dynamic Loading**: PMTCT configuration is loaded on-demand when selected

## Assessment Structure

### Section Examples

#### 1. Triple Elimination Testing

Questions about testing services for HIV, Syphilis, and Hepatitis B including:
- Service availability checks
- ANC1 attendance data
- Testing rates and percentages
- Viral load testing for Hepatitis B
- Re-testing services

#### 2. Supply Chain Reliability

Tracks stock levels and availability of:
- HIV test kits and ARVs
- Syphilis RDTs and benzathine penicillin
- Hepatitis B test kits and prophylaxis
- HepB birth dose vaccines
- Stock-out history and emergency orders

#### 3. Early Infant Diagnosis

Comprehensive assessment of HEI services:
- DBS collection for PCR testing
- Tracking systems
- Result return to caregivers
- CTX provision
- Linkage to ART services

## How to Use

### For Assessors

1. **Login** to the system
2. Navigate to **Facility Assessment Tools**
3. **Select Assessment Type**:
   - Choose "Standard Hepatitis B Assessment" for quick assessments
   - Choose "Comprehensive PMTCT Assessment" for detailed reviews

4. **Complete Facility Information**:
   - District, Facility Name, Facility Level
   - Ownership, Assessor Name, Assessment Date
   - Campaign Day (if applicable)

5. **Complete Assessment Sections**:
   - Answer all applicable questions
   - Mark N/A for sections that don't apply
   - Add comments where required

6. **Submit Assessment**

### For Administrators

The assessment data is stored in the same `Assessment` model with:
- `scores_json`: Contains all responses in JSON format
- Category scores can be calculated based on section performance
- Export functionality available for analysis

## Assessment Scoring

### Color-Coded System

- **Red**: Critical deficiencies, immediate action required
- **Yellow**: Significant gaps, improvement needed
- **Light Green**: Minor gaps, nearly compliant
- **Dark Green**: Fully compliant, excellent performance
- **Green**: Compliant (intermediate between Light and Dark Green)

### Scoring Methods

1. **Binary Scoring**: Yes/No questions with direct score assignment
2. **Threshold-Based**: Percentage calculations with defined thresholds
3. **Count-Based**: Number of items meeting criteria (e.g., infants without documentation)
4. **Composite Scoring**: Average of multiple indicators

## Data Model Support

The existing `Assessment` model supports the new PMTCT structure through:

- **Flexible JSON Storage**: `scores_json` field stores all responses
- **Category Scores**: Can be calculated from detailed responses
- **Metadata**: Facility information, assessor, date, campaign day
- **Audit Trail**: Activity logging for all assessments

## Future Enhancements

The framework is designed to support:

1. **Full Form Rendering**: Complete interactive forms for all 19 sections
2. **Real-time Validation**: Client-side and server-side validation
3. **Progress Saving**: Save and resume assessments
4. **Offline Capability**: Work offline and sync later
5. **Advanced Analytics**: Dashboard views of PMTCT performance across facilities
6. **Report Generation**: Automated PDF reports with findings and recommendations
7. **Comparison Views**: Compare assessments over time
8. **Benchmarking**: Compare facility performance against standards

## File Structure

```
participant_registration/
├── pmtct_config.py                      # Assessment configuration
├── static/
│   ├── css/
│   │   └── pmtct_assessment.css        # Styling
│   └── js/
│       └── pmtct_assessment.js         # Frontend logic
├── templates/
│   └── tools.html                       # Updated with PMTCT integration
└── app.py                               # API endpoint added
```

## Technical Details

### Configuration Structure

```python
PMTCT_ASSESSMENT = {
    "title": "SECTION 4: PMTCT Assessment",
    "sections": [
        {
            "id": "section_id",
            "title": "Section Title",
            "standard": "Standard description",
            "instructions": "Instructions for assessors",
            "na_option": True/False,
            "questions": [
                {
                    "id": "question_id",
                    "text": "Question text",
                    "type": "question_type",
                    "depends_on": {"previous_q": "required_value"},
                    "scoring": {...}
                }
            ]
        }
    ]
}
```

### Question Types Supported

- `yes_no`: Simple Yes/No questions
- `multi_yes_no`: Multiple Yes/No questions in a list
- `yes_no_with_text`: Yes/No with additional text field
- `number_input`: Numeric data entry
- `percentage_input`: Percentage values
- `text_input`: Short text responses
- `text_area`: Long text responses
- `radio`: Single selection from options
- `multi_checkbox`: Multiple selections
- `data_entry_table`: Table with calculations
- `chart_review_table`: Review multiple charts
- `checklist_table`: Checklist with scoring per item

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Configuration loads on-demand
- Minimal impact on initial page load
- Efficient rendering for large forms
- Client-side calculations for immediate feedback

## Security

- Login required for access
- CSRF protection on all endpoints
- Data validation on submission
- Audit logging of all assessments

## Support

For questions or issues:
- Email: eolal@clintonhealthaccess.org
- Email: omodingisaac111@gmail.com

## Version History

### Version 1.0 (October 25, 2025)
- Initial implementation of PMTCT assessment framework
- 19 assessment sections configured
- Multiple question types supported
- Integration with existing assessment system
- Documentation completed

---

## Notes for Developers

### Adding New Sections

To add new assessment sections:

1. Edit `pmtct_config.py`
2. Add section to `PMTCT_ASSESSMENT["sections"]` list
3. Define questions with appropriate types and scoring
4. Test the rendering and scoring logic

### Customizing Scoring

Scoring rules are defined in the question's `scoring` object:
```python
"scoring": {
    "method": "threshold",  # or "count", "binary", "composite"
    "thresholds": {
        "red": "<60",
        "yellow": "60-79",
        "light_green": "80-89",
        "dark_green": ">=90"
    }
}
```

### Database Schema

The Assessment model automatically handles the new structure. No migration needed as data is stored in JSON format.

---

*This implementation provides a robust foundation for comprehensive PMTCT assessments while maintaining compatibility with the existing system.*


