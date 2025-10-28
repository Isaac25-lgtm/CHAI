import os
import tempfile
import uuid
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

from config import Config
from logger import log_function_call, log_email_event
from validators import DataValidator

class ExcelGenerator:
    """Handle Excel file generation with proper error handling"""
    
    @staticmethod
    @log_function_call
    def create_participant_excel(participants_data: List[Dict], protect_sheet: bool = False) -> Tuple[str, str]:
        """Generate Excel file for participant registration
        
        Args:
            participants_data: List of participant dictionaries
            protect_sheet: If True, protect the sheet to prevent editing (for regular users)
        """
        try:
            wb = Workbook()
            ws = wb.active
            ws.title = "Participant Registration"
            
            headers = [
                "No.", "Participant's Name", "Cadre", "Duty Station (Facility)",
                "District", "Mobile Number Registered", 
                "Names Registered on Mobile Money (First & Last Names)"
            ]
            
            # Apply header styling
            ExcelGenerator._apply_header_styling(ws, headers)
            
            # Set column widths
            ExcelGenerator._set_column_widths(ws)
            
            # Write participant data
            ExcelGenerator._write_participant_data(ws, participants_data)
            
            # Generate filename and save
            filename = f'participant_registration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = ExcelGenerator._save_workbook(wb, filename)
            
            return filepath, filename
            
        except Exception as e:
            raise Exception(f"Failed to create participant Excel file: {str(e)}")
    
    @staticmethod
    @log_function_call
    def create_assessment_excel(assessment_data: Dict, protect_sheet: bool = False) -> Tuple[str, str]:
        """Generate comprehensive Excel assessment report
        
        Args:
            assessment_data: Dictionary containing assessment information
            protect_sheet: If True, protect all sheets to prevent editing (for regular users)
        """
        try:
            wb = Workbook()
            
            # Detect if this is a section-specific download
            scores = assessment_data.get('scores', {})
            section_ids = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                          'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                          'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                          'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                          'patient_records']
            sections_with_data = [key for key in section_ids if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
            is_section_download = len(sections_with_data) == 1
            
            # Create summary dashboard
            ExcelGenerator._create_summary_sheet(wb, assessment_data)
            
            # Create detailed scores sheet (filtered for section-specific downloads)
            ExcelGenerator._create_details_sheet(wb, assessment_data, is_section_download)
            
            # Create action plan sheet
            ExcelGenerator._create_action_plan_sheet(wb, assessment_data)
            
            # Generate filename and save
            facility_name = assessment_data.get('facilityName', 'Unknown').replace(' ', '_')
            filename = f'assessment_report_{facility_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            filepath = ExcelGenerator._save_workbook(wb, filename)
            
            return filepath, filename
            
        except Exception as e:
            raise Exception(f"Failed to create assessment Excel file: {str(e)}")
    
    @staticmethod
    def _apply_header_styling(ws, headers: List[str]):
        """Apply consistent header styling"""
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True, size=11)
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = border
    
    @staticmethod
    def _set_column_widths(ws):
        """Set appropriate column widths"""
        column_widths = {
            'A': 6, 'B': 25, 'C': 20, 'D': 30, 
            'E': 20, 'F': 25, 'G': 35
        }
        
        for col, width in column_widths.items():
            ws.column_dimensions[col].width = width
    
    @staticmethod
    def _write_participant_data(ws, participants_data: List[Dict]):
        """Write participant data to worksheet"""
        data_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
        border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        
        for idx, participant in enumerate(participants_data, 1):
            row_num = idx + 1
            
            # Sanitize and write data
            ws.cell(row=row_num, column=1).value = idx
            ws.cell(row=row_num, column=2).value = DataValidator.sanitize_input(participant.get('participantName', ''))
            ws.cell(row=row_num, column=3).value = DataValidator.sanitize_input(participant.get('cadre', ''))
            ws.cell(row=row_num, column=4).value = DataValidator.sanitize_input(participant.get('dutyStation', ''))
            ws.cell(row=row_num, column=5).value = DataValidator.sanitize_input(participant.get('district', ''))
            ws.cell(row=row_num, column=6).value = DataValidator.sanitize_input(participant.get('mobileNumber', ''))
            ws.cell(row=row_num, column=7).value = DataValidator.sanitize_input(participant.get('mobileMoneyName', ''))
            
            # Apply styling
            for col_num in range(1, 8):
                cell = ws.cell(row=row_num, column=col_num)
                cell.border = border
                cell.fill = data_fill
                cell.alignment = Alignment(vertical='center')
    
    @staticmethod
    def _create_summary_sheet(wb: Workbook, assessment_data: Dict):
        """Create comprehensive summary dashboard sheet"""
        ws = wb.active
        ws.title = "Assessment Summary"
        
        # Define borders and fills
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        info_fill = PatternFill(start_color="E8F4F8", end_color="E8F4F8", fill_type="solid")
        
        # Detect if this is a section-specific download
        scores = assessment_data.get('scores', {})
        section_ids = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                      'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                      'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                      'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                      'patient_records']
        
        sections_with_data = [key for key in section_ids if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
        is_section_download = len(sections_with_data) == 1
        
        # Section name mapping
        section_name_map = {
            'triple_elimination_treatment': 'TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment',
            'art_pmtct': 'ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)',
            'quality_pmtct': 'Quality of PMTCT services (Review 10 client\'s charts)',
            'patient_tracking': 'Patient Tracking HIV+ Pregnant Women',
            'adherence_support': 'Adherence Support',
            'facility_linkage': 'Facility Linkage to Community Care and Support Services for Adult PLHIV',
            'sti_screening': 'STI Screening and Management in HIV Clinics Serving General Population',
            'early_infant_diagnosis': 'Early Infant Diagnosis [HEI]',
            'ctx_hei': 'CTX for HIV-Exposed Infants [HEI]',
            'tracking_hei': 'Tracking HIV-Exposed Infants [HEI]',
            'enrolment_eid_art': 'Enrolment of HIV-Infected Infants (EID Services into ART Services)',
            'hei_eid_registers': 'HIV Exposed Infant/Early Infant Diagnosis Registers',
            'supply_chain_eid': 'Supply Chain Reliability (Early Infant Diagnosis) [HEI]',
            'supply_chain_pmtct': 'Supply Chain Reliability – HIV PMTCT (Mother)',
            'supply_chain_syphilis': 'Supply Chain Reliability – Syphilis PMTCT',
            'supply_chain_hepb': 'Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)',
            'patient_records': 'Patient/Beneficiary Records'
        }
        
        # Calculate scores
        total_possible = 0
        total_scored = 0
        scored_indicators = 0
        section_name = None
        
        if is_section_download:
            section_key = sections_with_data[0]
            section_name = section_name_map.get(section_key, section_key.upper())
            total_possible = 4
            score = scores.get(section_key, 0)
            try:
                total_scored = float(score) if score not in ['N/A', '', None] else 0
            except (ValueError, TypeError):
                total_scored = 0
            scored_indicators = 1 if total_scored > 0 else 0
        else:
            for section_id in section_ids:
                total_possible += 4
                score = scores.get(section_id, 0)
                try:
                    score_val = float(score) if score not in ['N/A', '', None] else 0
                    if score_val > 0:
                        total_scored += score_val
                        scored_indicators += 1
                except (ValueError, TypeError):
                    pass
        
        percentage = round((total_scored / total_possible * 100), 1) if total_possible > 0 else 0
        
        # Determine performance level
        if percentage >= 75:
            performance = "EXCELLENT"
            perf_color = "006400"
        elif percentage >= 50:
            performance = "GOOD"
            perf_color = "90EE90"
        elif percentage >= 25:
            performance = "NEEDS IMPROVEMENT"
            perf_color = "FFC107"
        else:
            performance = "CRITICAL"
            perf_color = "DC3545"
        
        # Set column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 40
        ws.column_dimensions['C'].width = 20
        
        # Add title
        row = 1
        ws.merge_cells(f'A{row}:C{row}')
        title_cell = ws[f'A{row}']
        if is_section_download:
            title_cell.value = f"ASSESSMENT SUMMARY\n{section_name}"
        else:
            title_cell.value = "PMTCT ASSESSMENT SUMMARY REPORT"
        title_cell.font = Font(size=16 if is_section_download else 18, bold=True, color="FFFFFF")
        title_cell.fill = header_fill
        title_cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        title_cell.border = thin_border
        ws.row_dimensions[row].height = 40 if is_section_download else 30
        
        # Add facility information
        row += 2
        facility_info = [
            ("District:", assessment_data.get('district', 'N/A')),
            ("Facility Name:", assessment_data.get('facilityName', 'N/A')),
            ("Facility Level:", assessment_data.get('facilityLevel', 'N/A')),
            ("Ownership:", assessment_data.get('ownership', 'N/A')),
            ("Assessor Name:", assessment_data.get('assessorName', 'N/A')),
            ("Assessment Date:", assessment_data.get('assessmentDate', 'N/A'))
        ]
        
        for label, value in facility_info:
            ws.cell(row=row, column=1).value = label
            ws.cell(row=row, column=1).font = Font(bold=True)
            ws.cell(row=row, column=1).fill = info_fill
            ws.cell(row=row, column=1).border = thin_border
            
            ws.merge_cells(f'B{row}:C{row}')
            ws.cell(row=row, column=2).value = DataValidator.sanitize_input(value)
            ws.cell(row=row, column=2).border = thin_border
            ws.cell(row=row, column=3).border = thin_border
            row += 1
        
        # Add scoring summary
        row += 1
        ws.merge_cells(f'A{row}:C{row}')
        ws.cell(row=row, column=1).value = "ASSESSMENT SCORES"
        ws.cell(row=row, column=1).font = Font(size=14, bold=True, color="FFFFFF")
        ws.cell(row=row, column=1).fill = header_fill
        ws.cell(row=row, column=1).alignment = Alignment(horizontal='center', vertical='center')
        ws.cell(row=row, column=1).border = thin_border
        ws.row_dimensions[row].height = 25
        row += 1
        
        if is_section_download:
            score_info = [
                ("Section Score:", f"{total_scored} / {total_possible}"),
                ("Percentage:", f"{percentage}%"),
                ("Performance Level:", performance)
            ]
        else:
            score_info = [
                ("Total Sections Assessed:", f"{scored_indicators} of {len(section_ids)}"),
                ("Maximum Possible Score:", f"{total_possible} points"),
                ("Total Score Achieved:", f"{total_scored} points"),
                ("Overall Percentage:", f"{percentage}%"),
                ("Performance Level:", performance)
            ]
        
        for label, value in score_info:
            ws.cell(row=row, column=1).value = label
            ws.cell(row=row, column=1).font = Font(bold=True)
            ws.cell(row=row, column=1).fill = info_fill
            ws.cell(row=row, column=1).border = thin_border
            
            ws.merge_cells(f'B{row}:C{row}')
            ws.cell(row=row, column=2).value = value
            ws.cell(row=row, column=2).font = Font(bold=True, size=12)
            if label == "Performance Level:":
                ws.cell(row=row, column=2).fill = PatternFill(start_color=perf_color, end_color=perf_color, fill_type="solid")
                ws.cell(row=row, column=2).font = Font(bold=True, size=12, color="FFFFFF" if perf_color in ["006400", "DC3545"] else "000000")
            ws.cell(row=row, column=2).border = thin_border
            ws.cell(row=row, column=2).alignment = Alignment(horizontal='center', vertical='center')
            ws.cell(row=row, column=3).border = thin_border
            row += 1
        
        # For section downloads, show questions with color-coded answers instead of legend
        if is_section_download:
            row += 1
            ws.merge_cells(f'A{row}:C{row}')
            ws.cell(row=row, column=1).value = "ASSESSMENT RESPONSES"
            ws.cell(row=row, column=1).font = Font(size=12, bold=True, color="FFFFFF")
            ws.cell(row=row, column=1).fill = header_fill
            ws.cell(row=row, column=1).alignment = Alignment(horizontal='center', vertical='center')
            ws.cell(row=row, column=1).border = thin_border
            row += 1
            
            # Get all scores/responses for this section
            section_key = sections_with_data[0]
            
            # Build question text map from section definitions FIRST
            question_text_map = {}
            section_definitions = assessment_data.get('section_definitions', {})
            
            if section_key in section_definitions:
                section_config = section_definitions[section_key]
                
                # Handle different section types
                if 'questions' in section_config:
                    # For sections with questions array
                    for q in section_config['questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
                        
                        # Handle items within questions (multi_yes_no)
                        if 'items' in q and 'type' in q and q['type'] == 'multi_yes_no':
                            for idx, item in enumerate(q['items']):
                                # Map like tet_q1_hiv, tet_q1_syphilis
                                item_id = f"{q['id']}_{item.lower().replace(' ', '_')}"
                                question_text_map[item_id] = f"{q.get('text', '')} - {item}"
                        
                        # Handle fields within questions (data_entry_table)
                        if 'fields' in q:
                            for field in q['fields']:
                                # Use the field's name as question text
                                field_id = f"{section_key}_{field['id']}" if not field['id'].startswith(section_key) else field['id']
                                question_text_map[field_id] = field.get('name', field.get('label', field['id']))
                                # Also try without prefix
                                question_text_map[field['id']] = field.get('name', field.get('label', field['id']))
                        
                        # Handle sub-questions
                        if 'sub_questions' in q:
                            for sub_q in q['sub_questions']:
                                question_text_map[sub_q['id']] = sub_q.get('text', sub_q['id'])
                        
                        # Handle options (for checklist questions)
                        if 'options' in q:
                            for opt in q['options']:
                                if 'value' in opt:
                                    question_text_map[f"{q['id']}_{opt['value']}"] = f"{q.get('text', '')} - {opt.get('label', opt['value'])}"
                
                if 'inventory_questions' in section_config:
                    # For supply chain sections - inventory questions
                    for q in section_config['inventory_questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
                
                if 'scoring_questions' in section_config:
                    # For supply chain sections - scoring questions
                    for q in section_config['scoring_questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
            
            # NOW get all question keys - use question_text_map keys plus any from scores
            all_question_keys = list(question_text_map.keys())
            # Also add any keys from scores that might not be in the map
            for key in scores.keys():
                if key not in all_question_keys and key != section_key:
                    # Check if this key might belong to this section
                    if key.startswith(section_key) or any(key.startswith(q_id) for q_id in question_text_map.keys()):
                        all_question_keys.append(key)
            
            print(f"\n{'='*60}", flush=True)
            print(f"DEBUG: Section key: {section_key}", flush=True)
            print(f"DEBUG: Question text map size: {len(question_text_map)}", flush=True)
            print(f"DEBUG: All question keys: {len(all_question_keys)}", flush=True)
            print(f"DEBUG: Sample question keys: {all_question_keys[:5] if len(all_question_keys) > 5 else all_question_keys}", flush=True)
            
            # Display each question with its color-coded answer
            questions_shown = 0
            print(f"DEBUG: Starting question loop... ", flush=True)
            for question_key in sorted(all_question_keys):
                # Skip the final section score
                if question_key == section_key:
                    print(f"DEBUG: Skipping section score: {section_key}", flush=True)
                    continue
                    
                response = scores.get(question_key, '')
                print(f"DEBUG: Processing {question_key} = '{response}' (type: {type(response)})", flush=True)
                
                # Don't filter out any responses - show them all!
                if response in ['', None, 'N/A']:
                    print(f"DEBUG: Skipping empty/NA response for {question_key}", flush=True)
                    continue
                
                # Get question text from map or generate from key
                if question_key in question_text_map:
                    question_text = question_text_map[question_key]
                    print(f"DEBUG: Found mapping for {question_key}: {question_text[:50]}...", flush=True)
                else:
                    # Fallback: Format the question key nicely
                    clean_key = question_key.replace(section_key + '_', '').replace('_', ' ').title()
                    question_text = f"{clean_key}"
                    print(f"DEBUG: No mapping for {question_key}, using: {question_text}", flush=True)
                
                print(f"DEBUG: Writing question to Excel row {row}", flush=True)
                
                # Question text in column A (merged with B)
                ws.merge_cells(f'A{row}:B{row}')
                ws.cell(row=row, column=1).value = question_text
                ws.cell(row=row, column=1).font = Font(bold=True, size=10)
                ws.cell(row=row, column=1).alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)
                ws.cell(row=row, column=1).border = thin_border
                ws.cell(row=row, column=2).border = thin_border
                
                # Response in column C with color coding
                ws.cell(row=row, column=3).value = str(response)
                ws.cell(row=row, column=3).font = Font(bold=True, size=11, color="000000")
                ws.cell(row=row, column=3).alignment = Alignment(horizontal='center', vertical='center')
                ws.cell(row=row, column=3).border = Border(
                    left=Side(style='medium'), right=Side(style='medium'),
                    top=Side(style='medium'), bottom=Side(style='medium')
                )
                
                # Color code based on response
                response_lower = str(response).lower()
                if response_lower in ['yes', 'y']:
                    ws.cell(row=row, column=3).fill = PatternFill(start_color="006400", end_color="006400", fill_type="solid")
                    ws.cell(row=row, column=3).font = Font(bold=True, size=11, color="FFFFFF")
                elif response_lower in ['no', 'n']:
                    ws.cell(row=row, column=3).fill = PatternFill(start_color="DC3545", end_color="DC3545", fill_type="solid")
                    ws.cell(row=row, column=3).font = Font(bold=True, size=11, color="FFFFFF")
                else:
                    # For numeric or percentage values, use light blue
                    ws.cell(row=row, column=3).fill = PatternFill(start_color="E8F4F8", end_color="E8F4F8", fill_type="solid")
                
                questions_shown += 1
                row += 1
            
            print(f"DEBUG: *** Total questions shown: {questions_shown} ***", flush=True)
            print(f"{'='*60}\n", flush=True)
        else:
            # Add legend for full reports
            row += 1
            ws.merge_cells(f'A{row}:C{row}')
            ws.cell(row=row, column=1).value = "SCORING LEGEND"
            ws.cell(row=row, column=1).font = Font(size=12, bold=True, color="FFFFFF")
            ws.cell(row=row, column=1).fill = header_fill
            ws.cell(row=row, column=1).alignment = Alignment(horizontal='center', vertical='center')
            ws.cell(row=row, column=1).border = thin_border
            row += 1
            
            legend = [
                ("Score 1 (Red):", "Critical - Immediate action required"),
                ("Score 2 (Yellow):", "Needs improvement - Action required"),
                ("Score 3 (Light Green):", "Good - Minor improvements needed"),
                ("Score 4 (Dark Green):", "Excellent - Meets all standards")
            ]
            
            for label, desc in legend:
                ws.cell(row=row, column=1).value = label
                ws.cell(row=row, column=1).font = Font(bold=True)
                if "Red" in label:
                    ws.cell(row=row, column=1).fill = PatternFill(start_color="DC3545", end_color="DC3545", fill_type="solid")
                    ws.cell(row=row, column=1).font = Font(bold=True, color="FFFFFF")
                elif "Yellow" in label:
                    ws.cell(row=row, column=1).fill = PatternFill(start_color="FFC107", end_color="FFC107", fill_type="solid")
                elif "Light Green" in label:
                    ws.cell(row=row, column=1).fill = PatternFill(start_color="90EE90", end_color="90EE90", fill_type="solid")
                elif "Dark Green" in label:
                    ws.cell(row=row, column=1).fill = PatternFill(start_color="006400", end_color="006400", fill_type="solid")
                    ws.cell(row=row, column=1).font = Font(bold=True, color="FFFFFF")
                ws.cell(row=row, column=1).border = thin_border
                
                ws.merge_cells(f'B{row}:C{row}')
                ws.cell(row=row, column=2).value = desc
                ws.cell(row=row, column=2).border = thin_border
                ws.cell(row=row, column=3).border = thin_border
                row += 1
    
    @staticmethod
    def _create_details_sheet(wb: Workbook, assessment_data: Dict, is_section_download: bool = False):
        """Create comprehensive detailed scores sheet with ALL assessment sections (or just one section for section downloads)"""
        ws = wb.create_sheet("Assessment Details")
        
        # Define styling
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        section_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
        
        # Set column widths
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 60
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 50
        
        # For section downloads, identify which section
        scores = assessment_data.get('scores', {})
        section_keys = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                       'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                       'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                       'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                       'patient_records']
        
        # Check which sections have scores
        sections_with_data = [key for key in section_keys if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
        
        # Get section name mapping
        section_name_map = {
            'triple_elimination_treatment': 'TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment',
            'art_pmtct': 'ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)',
            'quality_pmtct': 'Quality of PMTCT services (Review 10 client\'s charts)',
            'patient_tracking': 'Patient Tracking HIV+ Pregnant Women',
            'adherence_support': 'Adherence Support',
            'facility_linkage': 'Facility Linkage to Community Care and Support Services for Adult PLHIV',
            'sti_screening': 'STI Screening and Management in HIV Clinics Serving General Population',
            'early_infant_diagnosis': 'Early Infant Diagnosis [HEI]',
            'ctx_hei': 'CTX for HIV-Exposed Infants [HEI]',
            'tracking_hei': 'Tracking HIV-Exposed Infants [HEI]',
            'enrolment_eid_art': 'Enrolment of HIV-Infected Infants (EID Services into ART Services)',
            'hei_eid_registers': 'HIV Exposed Infant/Early Infant Diagnosis Registers',
            'supply_chain_eid': 'Supply Chain Reliability (Early Infant Diagnosis) [HEI]',
            'supply_chain_pmtct': 'Supply Chain Reliability – HIV PMTCT (Mother)',
            'supply_chain_syphilis': 'Supply Chain Reliability – Syphilis PMTCT',
            'supply_chain_hepb': 'Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)',
            'patient_records': 'Patient/Beneficiary Records'
        }
        
        # Add title (uniform 5-column format)
        ws.merge_cells('A1:E1')
        title_cell = ws['A1']
        
        if is_section_download:
            section_key = sections_with_data[0]
            title_cell.value = f"ASSESSMENT DETAILS: {section_name_map.get(section_key, section_key.upper())}"
        else:
            title_cell.value = "FACILITY ASSESSMENT DETAILED REPORT"
        
        title_cell.font = Font(size=16, bold=True, color="FFFFFF")
        title_cell.fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        title_cell.border = thin_border
        
        # Add facility information (uniform format for all downloads)
        row = 3
        ws[f'A{row}'] = "District:"
        ws.merge_cells(f'B{row}:D{row}')
        ws[f'B{row}'] = DataValidator.sanitize_input(assessment_data.get('district', 'N/A'))
        
        row += 1
        ws[f'A{row}'] = "Facility Name:"
        ws.merge_cells(f'B{row}:D{row}')
        ws[f'B{row}'] = DataValidator.sanitize_input(assessment_data.get('facilityName', 'N/A'))
        
        row += 1
        ws[f'A{row}'] = "Facility Level:"
        ws[f'B{row}'] = DataValidator.sanitize_input(assessment_data.get('facilityLevel', 'N/A'))
        ws[f'C{row}'] = "Ownership:"
        ws[f'D{row}'] = DataValidator.sanitize_input(assessment_data.get('ownership', 'N/A'))
        
        row += 1
        ws[f'A{row}'] = "Assessor Name:"
        ws[f'B{row}'] = DataValidator.sanitize_input(assessment_data.get('assessorName', 'N/A'))
        ws[f'C{row}'] = "Assessment Date:"
        ws[f'D{row}'] = DataValidator.sanitize_input(assessment_data.get('assessmentDate', 'N/A'))
        
        # Add headers for assessment data (uniform format for all downloads)
        row += 2
        headers = ['Section', 'Indicator ID', 'Indicator Name', 'Score', 'Comments']
        
        # Set uniform column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 20
        ws.column_dimensions['C'].width = 50
        ws.column_dimensions['D'].width = 12
        ws.column_dimensions['E'].width = 40
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = Font(bold=True, size=11, color="FFFFFF")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Define comprehensive sections matching the actual assessment tool
        sections = {
            "TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment": [
                {"id": "tet_q1_hiv", "name": "Is facility offering treatment/prophylaxis for HIV?", "max_score": 0},
                {"id": "tet_q1_syphilis", "name": "Is facility offering treatment/prophylaxis for Syphilis?", "max_score": 0},
                {"id": "tet_q1_hepb", "name": "Is facility offering treatment/prophylaxis for Hepatitis B?", "max_score": 0},
                {"id": "tet_hiv_positive", "name": "Number with documented positive HIV status (TRRK, TRR, or TRR+)", "max_score": 0},
                {"id": "tet_art_initiated", "name": "Number with documented ART initiation status", "max_score": 0},
                {"id": "tet_art_pct", "name": "% On ART", "max_score": 0},
                {"id": "tet_syphilis_positive", "name": "Number with documented positive Syphilis Test Result", "max_score": 0},
                {"id": "tet_syphilis_treated", "name": "Number with documented positive Syphilis Test Result initiated on treatment", "max_score": 0},
                {"id": "tet_syphilis_treated_pct", "name": "% Treated for Syphilis", "max_score": 0},
                {"id": "tet_hepb_positive", "name": "Number with documented Hepatitis B positive Test Result", "max_score": 0},
                {"id": "tet_hepb_vl_high", "name": "Number with documented Hep B positive Test Result with viral load >200,000 copies/ml", "max_score": 0},
                {"id": "tet_hepb_art_initiated", "name": "Number with Hep B positive + high VL initiated on ARVs", "max_score": 0},
                {"id": "tet_hepb_art_pct", "name": "% on ART for Hep. B Prophylaxis", "max_score": 0},
                {"id": "tet_average_pct", "name": "% Average", "max_score": 0},
                {"id": "triple_elimination_treatment", "name": "SCORE (Based on % Average)", "max_score": 4}
            ],
            "ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)": [
                {"id": "art_pmtct", "name": "Section Score", "max_score": 4}
            ],
            "Quality of PMTCT services (Review 10 client's charts)": [
                {"id": "quality_pmtct", "name": "Section Score", "max_score": 4}
            ],
            "Patient Tracking HIV+ Pregnant Women": [
                {"id": "patient_tracking", "name": "Section Score", "max_score": 4}
            ],
            "Adherence Support": [
                {"id": "adherence_support", "name": "Section Score", "max_score": 4}
            ],
            "Facility Linkage to Community Care and Support Services for Adult PLHIV": [
                {"id": "facility_linkage", "name": "Section Score", "max_score": 4}
            ],
            "STI Screening and Management in HIV Clinics Serving General Population": [
                {"id": "sti_screening", "name": "Section Score", "max_score": 4}
            ],
            "Early Infant Diagnosis [HEI]": [
                {"id": "early_infant_diagnosis", "name": "Section Score", "max_score": 4}
            ],
            "CTX for HIV-Exposed Infants [HEI]": [
                {"id": "ctx_hei", "name": "Section Score", "max_score": 4}
            ],
            "Tracking HIV-Exposed Infants [HEI]": [
                {"id": "tracking_hei", "name": "Section Score", "max_score": 4}
            ],
            "Enrolment of HIV-Infected Infants (EID Services into ART Services)": [
                {"id": "enrolment_eid_art", "name": "Section Score", "max_score": 4}
            ],
            "HIV Exposed Infant/Early Infant Diagnosis Registers": [
                {"id": "hei_eid_registers", "name": "Section Score", "max_score": 4}
            ],
            "Supply Chain Reliability (Early Infant Diagnosis) [HEI]": [
                {"id": "supply_chain_eid", "name": "Section Score", "max_score": 4}
            ],
            "Supply Chain Reliability – HIV PMTCT (Mother)": [
                {"id": "scpm_q1", "name": "Are HIV-syphilis duo kits currently in stock?", "max_score": 0},
                {"id": "scpm_q2", "name": "How many months of stock available for HIV test kits?", "max_score": 0},
                {"id": "scpm_q3", "name": "Are HIV 1/2 STAT-PAK® Assay currently in stock?", "max_score": 0},
                {"id": "scpm_q4", "name": "How many months of HIV 1/2 STAT-PAK® Assay stock available?", "max_score": 0},
                {"id": "scpm_q5", "name": "Are maternal ARVs (e.g., TLD) currently in stock?", "max_score": 0},
                {"id": "scpm_q6", "name": "How many months of stock available for maternal ARVs?", "max_score": 0},
                {"id": "scpm_q7", "name": "Has stock-out of HIV-syphilis duo kits in past 3 months resulted in missed maternal testing?", "max_score": 0},
                {"id": "scpm_q8", "name": "Stock-outs or emergency orders for maternal ARVs in past 3 months?", "max_score": 0},
                {"id": "scpm_q9", "name": "Are HIV testing kits and maternal ART consistently available at ANC and maternity?", "max_score": 0},
                {"id": "supply_chain_pmtct", "name": "SCORE", "max_score": 4}
            ],
            "Supply Chain Reliability – Syphilis PMTCT": [
                {"id": "scsy_q1", "name": "Are syphilis RDTs currently in stock?", "max_score": 0},
                {"id": "scsy_q2", "name": "How many months of stock available for syphilis RDTs?", "max_score": 0},
                {"id": "scsy_q3", "name": "Is benzathine penicillin currently in stock?", "max_score": 0},
                {"id": "scsy_q4", "name": "How many months of stock available for benzathine penicillin?", "max_score": 0},
                {"id": "scsy_q5", "name": "Has stock-out of syphilis RDTs in last 3 months led to missed testing?", "max_score": 0},
                {"id": "scsy_q6", "name": "Was there interruption in benzathine penicillin availability in past 3 months?", "max_score": 0},
                {"id": "scsy_q7", "name": "Are both RDTs and penicillin doses consistently available across ANC and maternity?", "max_score": 0},
                {"id": "supply_chain_syphilis", "name": "SCORE", "max_score": 4}
            ],
            "Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)": [
                {"id": "schb_q1", "name": "Are HBsAg test kits currently in stock?", "max_score": 0},
                {"id": "schb_q2", "name": "How many months of stock available for HBsAg test kits?", "max_score": 0},
                {"id": "schb_q3", "name": "Is TDF or TDF/3TC for prophylaxis currently in stock?", "max_score": 0},
                {"id": "schb_q4", "name": "How many months of stock available for TDF or TDF/3TC?", "max_score": 0},
                {"id": "schb_q5", "name": "Are hepatitis B birth dose (HepB-BD) vaccines currently available in maternity?", "max_score": 0},
                {"id": "schb_q6", "name": "How many months of stock available for HepB-BD vaccines?", "max_score": 0},
                {"id": "schb_q7", "name": "Has stock-out of HBsAg test kits in past 3 months caused missed screening?", "max_score": 0},
                {"id": "schb_q8", "name": "Has there been stock-out of TDF or TDF/3TC for HBV-positive women in last 3 months?", "max_score": 0},
                {"id": "schb_q9", "name": "Are Hep B birth dose vaccines available 24/7 in maternity for timely immunization?", "max_score": 0},
                {"id": "supply_chain_hepb", "name": "SCORE", "max_score": 4}
            ],
            "HUMAN RESOURCES AND SERVICE DELIVERY POINTS": [
                {"id": "hrd_q1", "name": "Primary funding source for personnel delivering PMTCT services", "max_score": 0},
                {"id": "hrd_q2", "name": "Partner(s) support PMTCT personnel", "max_score": 0},
                {"id": "hrd_q3", "name": "PMTCT services integrated at designated Mother-Baby Care Point (MBCP)?", "max_score": 0},
                {"id": "hrd_q4", "name": "Where is HIV testing for pregnant women primarily conducted?", "max_score": 0},
                {"id": "hrd_q5", "name": "Where is syphilis testing for pregnant women primarily conducted?", "max_score": 0},
                {"id": "hrd_q6", "name": "Where is hepatitis B testing for pregnant women primarily conducted?", "max_score": 0},
                {"id": "hrd_q7a", "name": "Where is treatment/prophylaxis provided for HIV?", "max_score": 0},
                {"id": "hrd_q7b", "name": "Where is treatment/prophylaxis provided for Syphilis?", "max_score": 0},
                {"id": "hrd_q7c", "name": "Where is treatment/prophylaxis provided for Hepatitis B?", "max_score": 0},
                {"id": "hrd_q8", "name": "Where is the Hepatitis B birth dose vaccine administered?", "max_score": 0},
                {"id": "hrd_q9", "name": "Designated personnel for comprehensive PMTCT services at each delivery point?", "max_score": 0},
                {"id": "hrd_q10", "name": "Key gaps and patient referral process between service points", "max_score": 0}
            ],
            "Patient/Beneficiary Records": [
                {"id": "pr_q1", "name": "Are individual patient/beneficiary records maintained?", "max_score": 0},
                {"id": "pr_q2", "name": "Is space adequate and secure?", "max_score": 0},
                {"id": "pr_q3", "name": "Is there a standard filing system and accessibility to specific charts so patient care is not impeded?", "max_score": 0},
                {"id": "pr_q4", "name": "Does the system allow for identification of patients by category (e.g., pre-ART, ART, peds, pregnant women) and is there written documentation that describes the record filing system?", "max_score": 0},
                {"id": "patient_records", "name": "Section Score", "max_score": 4}
            ]
        }
        
        # Get scores and comments from assessment data
        comments = assessment_data.get('comments', {})
        
        # Filter sections to show based on download type
        if is_section_download:
            section_key = sections_with_data[0]
            target_section_name = section_name_map.get(section_key, section_key.upper())
            sections_to_show = {target_section_name: sections[target_section_name]}
        else:
            sections_to_show = sections
        
        # Populate data
        row += 1
        for section_name, indicators in sections_to_show.items():
            # Add section header (uniform for all downloads)
            ws.merge_cells(f'A{row}:F{row}')
            section_cell = ws.cell(row=row, column=1)
            section_cell.value = section_name
            section_cell.fill = section_fill
            section_cell.font = Font(bold=True, size=12)
            section_cell.border = thin_border
            section_cell.alignment = Alignment(horizontal='left', vertical='center')
            row += 1
            
            # For section downloads, collect ALL keys that belong to this section
            if is_section_download:
                # Get the section key (e.g., "patient_records")
                section_key = sections_with_data[0]
                
                # Collect all score keys that belong to this section
                all_section_keys = set()
                for key in scores.keys():
                    # Include keys that match the section key or start with it
                    if key == section_key or key.startswith(section_key + '_'):
                        all_section_keys.add(key)
                    # Also check if key matches any defined indicator ID
                    for ind in indicators:
                        if key == ind['id'] or key.startswith(ind['id'] + '_'):
                            all_section_keys.add(key)
                
                # Build a complete list of indicators including undefined ones
                all_indicators = list(indicators)  # Start with defined indicators
                
                # Add undefined indicators (keys that have data but aren't in the indicators list)
                defined_ids = {ind['id'] for ind in indicators}
                for key in all_section_keys:
                    if key not in defined_ids:
                        # Create a generic indicator entry for this key
                        indicator_name = key.replace('_', ' ').title()
                        all_indicators.append({
                            "id": key,
                            "name": indicator_name,
                            "max_score": 0
                        })
                
                indicators = all_indicators
            
            # Add indicators
            for indicator in indicators:
                indicator_id = indicator['id']
                score = scores.get(indicator_id, 'N/A')
                comment = DataValidator.sanitize_input(comments.get(indicator_id, ''))
                
                # Skip empty indicators in section download
                if is_section_download and score in ['N/A', '', None] and not comment:
                    continue
                
                # Uniform 5-column format for all downloads
                ws.cell(row=row, column=1).value = section_name
                ws.cell(row=row, column=2).value = indicator_id.upper()
                ws.cell(row=row, column=3).value = indicator['name']
                ws.cell(row=row, column=4).value = score if score != 'N/A' else ''
                ws.cell(row=row, column=5).value = comment
                
                # Apply styling
                for col_num in range(1, 6):
                    cell = ws.cell(row=row, column=col_num)
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical='center', wrap_text=True)
                    if col_num == 4:
                        cell.alignment = Alignment(horizontal='center', vertical='center')
                
                # Color code the score column (column 4) based on score value (1-4 scale)
                score_cell = ws.cell(row=row, column=4)
                if score != 'N/A' and isinstance(score, (int, str, float)):
                    try:
                        score_value = int(float(score))
                        if score_value == 1:
                            score_cell.fill = PatternFill(start_color="DC3545", end_color="DC3545", fill_type="solid")
                            score_cell.font = Font(bold=True, color="FFFFFF")
                        elif score_value == 2:
                            score_cell.fill = PatternFill(start_color="FFC107", end_color="FFC107", fill_type="solid")
                            score_cell.font = Font(bold=True, color="000000")
                        elif score_value == 3:
                            score_cell.fill = PatternFill(start_color="90EE90", end_color="90EE90", fill_type="solid")
                            score_cell.font = Font(bold=True, color="000000")
                        elif score_value == 4:
                            score_cell.fill = PatternFill(start_color="006400", end_color="006400", fill_type="solid")
                            score_cell.font = Font(bold=True, color="FFFFFF")
                        else:
                            score_cell.fill = PatternFill(start_color="F8F9FA", end_color="F8F9FA", fill_type="solid")
                    except (ValueError, TypeError):
                        pass
                
                row += 1
        
        # Add summary row
        row += 1
        ws.merge_cells(f'A{row}:C{row}')
        summary_cell = ws.cell(row=row, column=1)
        summary_cell.value = "TOTAL ASSESSMENT SCORE"
        summary_cell.fill = header_fill
        summary_cell.font = Font(bold=True, size=12, color="FFFFFF")
        summary_cell.border = thin_border
        summary_cell.alignment = Alignment(horizontal='center', vertical='center')
        
        # Calculate totals - only count scored sections (max_score > 0)
        total_possible = sum(ind['max_score'] for section in sections.values() for ind in section if ind['max_score'] > 0)
        total_scored = 0
        scored_indicators = 0
        
        # Count actual scores from section scores (those with max_score > 0)
        for section in sections.values():
            for ind in section:
                if ind['max_score'] > 0:  # Only count sections that have scores
                    ind_score = scores.get(ind['id'], 0)
                    try:
                        score_val = float(ind_score) if ind_score not in ['N/A', '', None] else 0
                        if score_val > 0:
                            total_scored += score_val
                            scored_indicators += 1
                    except (ValueError, TypeError):
                        pass
        
        percentage = round((total_scored / total_possible * 100), 1) if total_possible > 0 else 0
        
        # Determine color based on overall percentage (aligned with 4-point scale)
        if percentage < 25:  # Red (equivalent to score 1)
            score_fill = PatternFill(start_color="DC3545", end_color="DC3545", fill_type="solid")
        elif percentage < 50:  # Yellow (equivalent to score 2)
            score_fill = PatternFill(start_color="FFC107", end_color="FFC107", fill_type="solid")
        elif percentage < 75:  # Light Green (equivalent to score 3)
            score_fill = PatternFill(start_color="90EE90", end_color="90EE90", fill_type="solid")
        else:  # Dark Green (equivalent to score 4)
            score_fill = PatternFill(start_color="006400", end_color="006400", fill_type="solid")
        
        # First row: Total Score
        ws.cell(row=row, column=4).value = total_scored
        ws.cell(row=row, column=4).fill = score_fill
        ws.cell(row=row, column=4).font = Font(bold=True, size=12, color="FFFFFF")
        ws.cell(row=row, column=4).border = thin_border
        ws.cell(row=row, column=4).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=5).value = ""
        ws.cell(row=row, column=5).border = thin_border
        
        # Second row: Percentage in the same column as Total Score
        row += 1
        ws.merge_cells(f'A{row}:C{row}')
        percentage_label = ws.cell(row=row, column=1)
        percentage_label.value = "PERCENTAGE SCORE"
        percentage_label.fill = header_fill
        percentage_label.font = Font(bold=True, size=12, color="FFFFFF")
        percentage_label.border = thin_border
        percentage_label.alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=4).value = f"{percentage}%"
        ws.cell(row=row, column=4).fill = score_fill
        ws.cell(row=row, column=4).font = Font(bold=True, size=12, color="FFFFFF")
        ws.cell(row=row, column=4).border = thin_border
        ws.cell(row=row, column=4).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=5).value = ""
        ws.cell(row=row, column=5).border = thin_border
    
    @staticmethod
    def _create_action_plan_sheet(wb: Workbook, assessment_data: Dict):
        """Create action plan sheet with recommendations based on scores"""
        ws = wb.create_sheet("Action Plan")
        
        # Define styling
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        
        # Score-based color coding (matching assessment detail colors)
        score_1_fill = PatternFill(start_color="DC143C", end_color="DC143C", fill_type="solid")  # Dark Red - Critical
        score_2_fill = PatternFill(start_color="FF6B6B", end_color="FF6B6B", fill_type="solid")  # Red - Urgent
        score_3_fill = PatternFill(start_color="FFD93D", end_color="FFD93D", fill_type="solid")  # Yellow - Moderate
        score_4_fill = PatternFill(start_color="FFA500", end_color="FFA500", fill_type="solid")  # Orange - Minor
        
        # Set column widths
        ws.column_dimensions['A'].width = 50
        ws.column_dimensions['B'].width = 60
        ws.column_dimensions['C'].width = 20
        ws.column_dimensions['D'].width = 30
        
        # Add title
        ws.merge_cells('A1:D1')
        title_cell = ws['A1']
        title_cell.value = "IMPROVEMENT ACTION PLAN - Priority Areas for Intervention"
        title_cell.font = Font(size=16, bold=True, color="FFFFFF")
        title_cell.fill = header_fill
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        title_cell.border = thin_border
        
        # Add headers
        row = 3
        headers = ['Indicator Name', 'Recommended Action', 'Priority Level', 'Timeline']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = Font(bold=True, size=11, color="FFFFFF")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Define all sections and indicators (matching assessment details)
        sections = {
            "Service Delivery": [
                {"id": "sd1", "name": "Are hepatitis B testing services available and integrated in ANC, maternity, and postnatal care?", "max_score": 5},
                {"id": "sd2", "name": "Are HBV-positive pregnant women immediately enrolled for treatment/prophylaxis (TDF or TDF/3TC) at the facility?", "max_score": 5},
                {"id": "sd3", "name": "Is the hepatitis B birth dose vaccine (HepB-BD) routinely administered within 24 hours of birth?", "max_score": 5},
                {"id": "sd4", "name": "Are there documented standard operating procedures (SOPs) for PMTCT of hepatitis B at the facility?", "max_score": 5},
                {"id": "sd5", "name": "Does the facility have integrated maternity and ANC registers that capture hepatitis B screening, treatment, and HepB-BD vaccination?", "max_score": 5},
                {"id": "sd6", "name": "Are follow-up mechanisms in place for HBV-positive mothers and their exposed infants (post-vaccination serology at 9-12 months)?", "max_score": 5}
            ],
            "Human Resource and Service Delivery Points": [
                {"id": "hr1", "name": "What is the primary funding source for personnel delivering PMTCT services at this facility?", "max_score": 5},
                {"id": "hr2", "name": "If partner-supported, which partner(s) support PMTCT personnel?", "max_score": 5},
                {"id": "hr3", "name": "Are PMTCT services integrated and provided at a designated Mother-Baby Care Point (MBCP)?", "max_score": 5},
                {"id": "hr4", "name": "Where is hepatitis B testing for pregnant women primarily conducted?", "max_score": 5},
                {"id": "hr5", "name": "Where is treatment/prophylaxis provided for HBV", "max_score": 5},
                {"id": "hr6", "name": "Where is the Hepatitis B birth dose vaccine administered?", "max_score": 5},
                {"id": "hr7", "name": "Are there designated personnel responsible for providing comprehensive PMTCT services at each service delivery point?", "max_score": 5},
                {"id": "hr8", "name": "If PMTCT services are not co-located, what are the key gaps and how are patients referred between service points?", "max_score": 5}
            ],
            "Supply Chain Reliability for HBV commodities": [
                {"id": "sc1", "name": "Are HBsAg test kits currently in stock?", "max_score": 5},
                {"id": "sc2", "name": "How many months of stock are available for HBsAg test kits?", "max_score": 5},
                {"id": "sc3", "name": "Is TDF or TDF/3TC for prophylaxis currently in stock?", "max_score": 5},
                {"id": "sc4", "name": "How many months of stock are available for TDF or TDF/3TC?", "max_score": 5},
                {"id": "sc5", "name": "Are hepatitis B birth dose (HepB-BD) vaccines currently available in maternity?", "max_score": 5},
                {"id": "sc6", "name": "How many months of stock are available for HepB-BD vaccines?", "max_score": 5},
                {"id": "sc7", "name": "Has a stock-out of HBsAg test kits in the past 3 months caused missed screening of pregnant women?", "max_score": 5},
                {"id": "sc8", "name": "Has there been a stock-out of TDF or TDF/3TC for HBV-positive women in the last 3 months?", "max_score": 5},
                {"id": "sc9", "name": "Are hepatitis B birth dose vaccines available 24/7 in maternity units for timely newborn immunization?", "max_score": 5}
            ],
            "Infrastructure & Equipment": [
                {"id": "if1", "name": "Is there a functional cold chain (refrigerator/freezer) for storing hepatitis B vaccines at the correct temperature (2-8°C)?", "max_score": 5},
                {"id": "if2", "name": "Are rapid diagnostic test kits (RDTs) or laboratory equipment for HBsAg testing available and functional?", "max_score": 5},
                {"id": "if3", "name": "Does the facility have a designated, private space for counseling HBV-positive pregnant women?", "max_score": 5},
                {"id": "if4", "name": "Is there reliable power supply or backup generator to maintain cold chain and laboratory services?", "max_score": 5},
                {"id": "if5", "name": "Are there adequate supplies of safety boxes, gloves, and sharps disposal for safe HBV testing and vaccination?", "max_score": 5}
            ]
        }
        
        # Get scores and comments
        scores = assessment_data.get('scores', {})
        comments = assessment_data.get('comments', {})
        
        # Create indicator lookup dictionary
        indicator_lookup = {}
        for section_name, indicators in sections.items():
            for indicator in indicators:
                indicator_lookup[indicator['id']] = indicator['name']
        
        # Generate action plan for indicators with scores 1-4
        row += 1
        action_items = []
        
        for indicator_id, score in scores.items():
            if isinstance(score, (int, str)) and str(score).isdigit():
                score_int = int(score)
                if score_int <= 4:  # Include scores 1-4 in action plan
                    # Determine priority, timeline, and color based on score
                    if score_int == 1:
                        priority = "CRITICAL"
                        timeline = "Immediate (Within 2 weeks)"
                        fill_color = score_1_fill
                        font_color = "FFFFFF"
                    elif score_int == 2:
                        priority = "URGENT"
                        timeline = "Short-term (1-3 months)"
                        fill_color = score_2_fill
                        font_color = "FFFFFF"
                    elif score_int == 3:
                        priority = "MODERATE"
                        timeline = "Medium-term (3-6 months)"
                        fill_color = score_3_fill
                        font_color = "000000"
                    else:  # score == 4
                        priority = "MINOR"
                        timeline = "Long-term (6-12 months)"
                        fill_color = score_4_fill
                        font_color = "000000"
                    
                    # Get indicator name
                    indicator_name = indicator_lookup.get(indicator_id, indicator_id.upper())
                    
                    # Generate action based on comment or generic
                    comment = comments.get(indicator_id, "")
                    action = f"Address identified gaps: {comment}" if comment else f"Develop and implement improvement plan to enhance this indicator"
                    
                    action_items.append({
                        'name': indicator_name,
                        'action': action,
                        'priority': priority,
                        'timeline': timeline,
                        'fill': fill_color,
                        'font_color': font_color,
                        'score': score_int
                    })
        
        # Sort by score (lowest first - most critical)
        action_items.sort(key=lambda x: x['score'])
        
        # Populate action plan
        for item in action_items:
            ws.cell(row=row, column=1).value = item['name']
            ws.cell(row=row, column=2).value = item['action']
            ws.cell(row=row, column=3).value = item['priority']
            ws.cell(row=row, column=4).value = item['timeline']
            
            # Apply styling
            for col_num in range(1, 5):
                cell = ws.cell(row=row, column=col_num)
                cell.border = thin_border
                cell.alignment = Alignment(vertical='center', wrap_text=True)
                
                # Color code the priority column
                if col_num == 3:
                    cell.fill = item['fill']
                    cell.font = Font(bold=True, color=item['font_color'])
            
            row += 1
        
        # Add summary note if no action items
        if not action_items:
            ws.cell(row=row, column=1).value = "No critical action items identified. All indicators scored 5 (excellent performance)."
            ws.merge_cells(f'A{row}:D{row}')
            cell = ws.cell(row=row, column=1)
            cell.fill = PatternFill(start_color="6BCF7F", end_color="6BCF7F", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center')
    
    @staticmethod
    def _save_workbook(wb: Workbook, filename: str) -> str:
        """Save workbook to temporary file"""
        temp_dir = tempfile.gettempdir()
        filepath = os.path.join(temp_dir, filename)
        wb.save(filepath)
        return filepath

class EmailService:
    """Handle email operations with proper error handling"""
    
    @staticmethod
    @log_function_call
    def send_email(filepath: str, filename: str, email_type: str = "registration") -> Tuple[bool, str]:
        """Send email with attachment"""
        try:
            # Validate configuration
            if not Config.SMTP_USERNAME or not Config.SMTP_PASSWORD:
                return False, "Email configuration not properly set"
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = Config.SMTP_USERNAME
            msg['To'] = Config.RECIPIENT_EMAIL
            
            # Set subject and body based on type
            if email_type == "assessment":
                msg['Subject'] = f'Facility Assessment Report - {datetime.now().strftime("%Y-%m-%d %H:%M")}'
                body = EmailService._get_assessment_email_body()
            else:
                msg['Subject'] = f'Participant Registration - {datetime.now().strftime("%Y-%m-%d %H:%M")}'
                body = EmailService._get_registration_email_body()
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach file
            EmailService._attach_file(msg, filepath, filename)
            
            # Send email
            success = EmailService._send_smtp_message(msg)
            
            if success:
                log_email_event("Email sent", Config.RECIPIENT_EMAIL, True, f"File: {filename}")
                return True, "Email sent successfully"
            else:
                log_email_event("Email failed", Config.RECIPIENT_EMAIL, False, "SMTP error")
                return False, "Failed to send email"
                
        except Exception as e:
            log_email_event("Email error", Config.RECIPIENT_EMAIL, False, str(e))
            return False, f"Email error: {str(e)}"
    
    @staticmethod
    def _get_registration_email_body() -> str:
        """Get registration email body"""
        return f"""
Dear Team,

Please find attached the participant registration data.

Registration Date: {datetime.now().strftime("%Y-%m-%d at %H:%M")}

Best regards,
Registration System
"""
    
    @staticmethod
    def _get_assessment_email_body() -> str:
        """Get assessment email body"""
        return f"""
Dear Team,

Please find attached the facility assessment report.

Assessment Date: {datetime.now().strftime("%Y-%m-%d at %H:%M")}

This report includes:
- Overall facility performance summary
- Detailed indicator scores
- Recommended action plan

Best regards,
Assessment System
"""
    
    @staticmethod
    def _attach_file(msg: MIMEMultipart, filepath: str, filename: str):
        """Attach file to email message"""
        with open(filepath, 'rb') as f:
            part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename={filename}')
            msg.attach(part)
    
    @staticmethod
    def _send_smtp_message(msg: MIMEMultipart) -> bool:
        """Send message via SMTP"""
        try:
            server = smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT)
            if Config.SMTP_USE_TLS:
                server.starttls()
            server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            return True
        except Exception as e:
            print(f"SMTP Error: {e}")
            return False

class FileManager:
    """Handle file operations safely"""
    
    @staticmethod
    @log_function_call
    def cleanup_temp_file(filepath: str) -> bool:
        """Safely remove temporary file"""
        try:
            if filepath and os.path.exists(filepath):
                os.remove(filepath)
                return True
        except Exception as e:
            print(f"Warning: Could not delete temp file {filepath}: {e}")
        return False
    
    @staticmethod
    @log_function_call
    def ensure_temp_directory() -> str:
        """Ensure temporary directory exists"""
        temp_dir = tempfile.gettempdir()
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        return temp_dir


class WordGenerator:
    """Handle Word document generation with proper error handling"""
    
    @staticmethod
    @log_function_call
    def create_assessment_word(assessment_data: Dict) -> Tuple[str, str]:
        """Generate comprehensive Word assessment report
        
        Args:
            assessment_data: Dictionary containing assessment information
        """
        try:
            doc = Document()
            
            # Detect if this is a section-specific download
            scores = assessment_data.get('scores', {})
            section_ids = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                          'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                          'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                          'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                          'patient_records']
            sections_with_data = [key for key in section_ids if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
            is_section_download = len(sections_with_data) == 1
            
            # Create summary section
            WordGenerator._create_summary_section(doc, assessment_data, is_section_download)
            
            # Add page break
            doc.add_page_break()
            
            # Create detailed scores section
            WordGenerator._create_details_section(doc, assessment_data, is_section_download)
            
            # Add page break
            doc.add_page_break()
            
            # Create action plan section
            WordGenerator._create_action_plan_section(doc, assessment_data)
            
            # Generate filename and save
            facility_name = assessment_data.get('facilityName', 'Unknown').replace(' ', '_')
            filename = f'assessment_report_{facility_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.docx'
            filepath = WordGenerator._save_document(doc, filename)
            
            return filepath, filename
            
        except Exception as e:
            raise Exception(f"Failed to create assessment Word file: {str(e)}")
    
    @staticmethod
    def _create_summary_section(doc: Document, assessment_data: Dict, is_section_download: bool = False):
        """Create comprehensive summary section"""
        scores = assessment_data.get('scores', {})
        section_ids = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                      'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                      'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                      'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                      'patient_records']
        
        sections_with_data = [key for key in section_ids if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
        
        # Section name mapping
        section_name_map = {
            'triple_elimination_treatment': 'TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment',
            'art_pmtct': 'ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)',
            'quality_pmtct': 'Quality of PMTCT services (Review 10 client\'s charts)',
            'patient_tracking': 'Patient Tracking HIV+ Pregnant Women',
            'adherence_support': 'Adherence Support',
            'facility_linkage': 'Facility Linkage to Community Care and Support Services for Adult PLHIV',
            'sti_screening': 'STI Screening and Management in HIV Clinics Serving General Population',
            'early_infant_diagnosis': 'Early Infant Diagnosis [HEI]',
            'ctx_hei': 'CTX for HIV-Exposed Infants [HEI]',
            'tracking_hei': 'Tracking HIV-Exposed Infants [HEI]',
            'enrolment_eid_art': 'Enrolment of HIV-Infected Infants (EID Services into ART Services)',
            'hei_eid_registers': 'HIV Exposed Infant/Early Infant Diagnosis Registers',
            'supply_chain_eid': 'Supply Chain Reliability (Early Infant Diagnosis) [HEI]',
            'supply_chain_pmtct': 'Supply Chain Reliability – HIV PMTCT (Mother)',
            'supply_chain_syphilis': 'Supply Chain Reliability – Syphilis PMTCT',
            'supply_chain_hepb': 'Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)',
            'patient_records': 'Patient/Beneficiary Records'
        }
        
        # Calculate scores
        total_possible = 0
        total_scored = 0
        scored_indicators = 0
        section_name = None
        
        if is_section_download:
            section_key = sections_with_data[0]
            section_name = section_name_map.get(section_key, section_key.upper())
            total_possible = 4
            score = scores.get(section_key, 0)
            try:
                total_scored = float(score) if score not in ['N/A', '', None] else 0
            except (ValueError, TypeError):
                total_scored = 0
            scored_indicators = 1 if total_scored > 0 else 0
        else:
            for section_id in section_ids:
                total_possible += 4
                score = scores.get(section_id, 0)
                try:
                    score_val = float(score) if score not in ['N/A', '', None] else 0
                    if score_val > 0:
                        total_scored += score_val
                        scored_indicators += 1
                except (ValueError, TypeError):
                    pass
        
        percentage = round((total_scored / total_possible * 100), 1) if total_possible > 0 else 0
        
        # Determine performance level and color
        if percentage >= 75:
            performance = "EXCELLENT"
            perf_color = RGBColor(0, 100, 0)  # Dark Green
        elif percentage >= 50:
            performance = "GOOD"
            perf_color = RGBColor(144, 238, 144)  # Light Green
        elif percentage >= 25:
            performance = "NEEDS IMPROVEMENT"
            perf_color = RGBColor(255, 193, 7)  # Yellow
        else:
            performance = "CRITICAL"
            perf_color = RGBColor(220, 53, 69)  # Red
        
        # Add title
        title = doc.add_heading('', level=0)
        title_run = title.add_run('ASSESSMENT SUMMARY\n' if not is_section_download else f'ASSESSMENT SUMMARY\n{section_name}')
        title_run.font.size = Pt(18)
        title_run.font.color.rgb = RGBColor(31, 78, 120)
        title_run.bold = True
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Add facility information
        doc.add_paragraph()
        facility_info = [
            ("District:", assessment_data.get('district', 'N/A')),
            ("Facility Name:", assessment_data.get('facilityName', 'N/A')),
            ("Facility Level:", assessment_data.get('facilityLevel', 'N/A')),
            ("Ownership:", assessment_data.get('ownership', 'N/A')),
            ("Assessor Name:", assessment_data.get('assessorName', 'N/A')),
            ("Assessment Date:", assessment_data.get('assessmentDate', 'N/A'))
        ]
        
        for label, value in facility_info:
            p = doc.add_paragraph()
            p.add_run(label).bold = True
            p.add_run(f' {DataValidator.sanitize_input(value)}')
        
        # Add scoring summary
        doc.add_paragraph()
        score_heading = doc.add_heading('ASSESSMENT SCORES', level=2)
        score_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        if is_section_download:
            score_info = [
                ("Section Score:", f"{total_scored} / {total_possible}"),
                ("Percentage:", f"{percentage}%"),
                ("Performance Level:", performance)
            ]
        else:
            score_info = [
                ("Total Sections Assessed:", f"{scored_indicators} of {len(section_ids)}"),
                ("Maximum Possible Score:", f"{total_possible} points"),
                ("Total Score Achieved:", f"{total_scored} points"),
                ("Overall Percentage:", f"{percentage}%"),
                ("Performance Level:", performance)
            ]
        
        for label, value in score_info:
            p = doc.add_paragraph()
            p.add_run(label).bold = True
            run = p.add_run(f' {value}')
            run.font.size = Pt(12)
            run.bold = True
            if label == "Performance Level:":
                run.font.color.rgb = perf_color
        
        # Show questions with color-coded answers for all downloads
        doc.add_paragraph()
        responses_heading = doc.add_heading('ASSESSMENT RESPONSES', level=2)
        responses_heading.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Build question text map from section definitions FIRST
        question_text_map = {}
        section_definitions = assessment_data.get('section_definitions', {})
        
        # Determine which sections to process
        if is_section_download:
            section_key = sections_with_data[0]
            sections_to_process = [section_key]
        else:
            # For full reports, process all sections
            sections_to_process = section_definitions.keys()
        
        for current_section_key in sections_to_process:
            if current_section_key in section_definitions:
                section_config = section_definitions[current_section_key]
                
                if 'questions' in section_config:
                    for q in section_config['questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
                        
                        if 'items' in q and 'type' in q and q['type'] == 'multi_yes_no':
                            for item in q['items']:
                                item_id = f"{q['id']}_{item.lower().replace(' ', '_')}"
                                question_text_map[item_id] = f"{q.get('text', '')} - {item}"
                        
                        if 'fields' in q:
                            for field in q['fields']:
                                field_id = f"{current_section_key}_{field['id']}" if not field['id'].startswith(current_section_key) else field['id']
                                question_text_map[field_id] = field.get('name', field.get('label', field['id']))
                                question_text_map[field['id']] = field.get('name', field.get('label', field['id']))
                        
                        if 'sub_questions' in q:
                            for sub_q in q['sub_questions']:
                                question_text_map[sub_q['id']] = sub_q.get('text', sub_q['id'])
                        
                        if 'options' in q:
                            for opt in q['options']:
                                if 'value' in opt:
                                    question_text_map[f"{q['id']}_{opt['value']}"] = f"{q.get('text', '')} - {opt.get('label', opt['value'])}"
                
                if 'inventory_questions' in section_config:
                    for q in section_config['inventory_questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
                
                if 'scoring_questions' in section_config:
                    for q in section_config['scoring_questions']:
                        question_text_map[q['id']] = q.get('text', q['id'])
        
        # NOW get all question keys based on download type
        # Use question_text_map keys as the base, then add any from scores that match
        all_question_keys = list(question_text_map.keys())
        
        # For section downloads, also check scores for additional keys
        if is_section_download:
            for key in scores.keys():
                if key not in all_question_keys and key != section_key:
                    # Check if this key might belong to this section
                    if any(key.startswith(q_id) for q_id in question_text_map.keys()):
                        all_question_keys.append(key)
        else:
            # For full reports, also add any scored keys not in the map (except section scores)
            section_ids = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                          'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                          'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                          'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                          'patient_records']
            for key in scores.keys():
                if key not in all_question_keys and key not in section_ids:
                    all_question_keys.append(key)
        
        # Create table for responses
        table = doc.add_table(rows=1, cols=2)
        table.style = 'Light Grid Accent 1'
        
        # Header row
        hdr_cells = table.rows[0].cells
        hdr_cells[0].text = 'Question'
        hdr_cells[1].text = 'Response'
        for cell in hdr_cells:
            WordGenerator._set_cell_color(cell, 31, 78, 120)
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.color.rgb = RGBColor(255, 255, 255)
                    run.font.bold = True
        
        # Display each question with its color-coded answer
        for question_key in sorted(all_question_keys):
            # Skip section-level scores (already filtered out above)
            if question_key in ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                               'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                               'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                               'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                               'patient_records']:
                continue
                
            response = scores.get(question_key, '')
            
            if response in ['', None, 'N/A']:
                continue
            
            # Get question text from map or generate from key
            if question_key in question_text_map:
                question_text = question_text_map[question_key]
            else:
                clean_key = question_key.replace('_', ' ').title()
                question_text = f"{clean_key}"
            
            # Add row
            row_cells = table.add_row().cells
            row_cells[0].text = question_text
            row_cells[1].text = str(response)
            
            # Color code based on response
            response_lower = str(response).lower()
            if response_lower in ['yes', 'y']:
                WordGenerator._set_cell_color(row_cells[1], 0, 100, 0)
                for paragraph in row_cells[1].paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.font.bold = True
            elif response_lower in ['no', 'n']:
                WordGenerator._set_cell_color(row_cells[1], 220, 53, 69)
                for paragraph in row_cells[1].paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.font.bold = True
            else:
                WordGenerator._set_cell_color(row_cells[1], 232, 244, 248)
    
    @staticmethod
    def _create_details_section(doc: Document, assessment_data: Dict, is_section_download: bool = False):
        """Create comprehensive detailed scores section"""
        scores = assessment_data.get('scores', {})
        comments = assessment_data.get('comments', {})
        
        section_keys = ['triple_elimination_treatment', 'art_pmtct', 'quality_pmtct', 'patient_tracking',
                       'adherence_support', 'facility_linkage', 'sti_screening', 'early_infant_diagnosis',
                       'ctx_hei', 'tracking_hei', 'enrolment_eid_art', 'hei_eid_registers',
                       'supply_chain_eid', 'supply_chain_pmtct', 'supply_chain_syphilis', 'supply_chain_hepb',
                       'patient_records']
        
        sections_with_data = [key for key in section_keys if key in scores or any(k.startswith(key + '_') for k in scores.keys())]
        
        section_name_map = {
            'triple_elimination_treatment': 'TRIPLE ELIMINATION (HIV, Syphilis and Hep B): Linkage to treatment',
            'art_pmtct': 'ART in PMTCT Facilities (VL uptake at ANC1 for ARTK)',
            'quality_pmtct': 'Quality of PMTCT services (Review 10 client\'s charts)',
            'patient_tracking': 'Patient Tracking HIV+ Pregnant Women',
            'adherence_support': 'Adherence Support',
            'facility_linkage': 'Facility Linkage to Community Care and Support Services for Adult PLHIV',
            'sti_screening': 'STI Screening and Management in HIV Clinics Serving General Population',
            'early_infant_diagnosis': 'Early Infant Diagnosis [HEI]',
            'ctx_hei': 'CTX for HIV-Exposed Infants [HEI]',
            'tracking_hei': 'Tracking HIV-Exposed Infants [HEI]',
            'enrolment_eid_art': 'Enrolment of HIV-Infected Infants (EID Services into ART Services)',
            'hei_eid_registers': 'HIV Exposed Infant/Early Infant Diagnosis Registers',
            'supply_chain_eid': 'Supply Chain Reliability (Early Infant Diagnosis) [HEI]',
            'supply_chain_pmtct': 'Supply Chain Reliability – HIV PMTCT (Mother)',
            'supply_chain_syphilis': 'Supply Chain Reliability – Syphilis PMTCT',
            'supply_chain_hepb': 'Supply Chain Reliability – Hepatitis B PMTCT (Maternal and Birth Dose)',
            'patient_records': 'Patient/Beneficiary Records'
        }
        
        # Add title
        title = doc.add_heading('ASSESSMENT DETAILS', level=1)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Add facility information
        p = doc.add_paragraph()
        p.add_run(f"District: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('district', 'N/A')))
        
        p = doc.add_paragraph()
        p.add_run(f"Facility Name: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('facilityName', 'N/A')))
        
        p = doc.add_paragraph()
        p.add_run(f"Facility Level: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('facilityLevel', 'N/A')))
        p.add_run("  |  ")
        p.add_run("Ownership: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('ownership', 'N/A')))
        
        p = doc.add_paragraph()
        p.add_run(f"Assessor: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('assessorName', 'N/A')))
        p.add_run("  |  ")
        p.add_run("Date: ").bold = True
        p.add_run(DataValidator.sanitize_input(assessment_data.get('assessmentDate', 'N/A')))
        
        doc.add_paragraph()
        
        # Filter sections to show based on download type
        if is_section_download:
            section_key = sections_with_data[0]
            target_section_name = section_name_map.get(section_key, section_key.upper())
            sections_to_show = [(target_section_name, section_key)]
        else:
            sections_to_show = [(section_name_map.get(key, key.upper()), key) for key in section_keys]
        
        # Create table for all sections
        for section_name, section_key in sections_to_show:
            # Check if section has data
            section_score = scores.get(section_key)
            if section_score in [None, '', 'N/A'] and not is_section_download:
                continue
            
            # Add section heading
            section_heading = doc.add_heading(section_name, level=2)
            
            # Get all keys for this section
            all_section_keys = [k for k in scores.keys() if k == section_key or k.startswith(section_key + '_')]
            
            if all_section_keys:
                # Create table
                table = doc.add_table(rows=1, cols=3)
                table.style = 'Light Grid Accent 1'
                
                # Header row
                hdr_cells = table.rows[0].cells
                hdr_cells[0].text = 'Indicator'
                hdr_cells[1].text = 'Score'
                hdr_cells[2].text = 'Comments'
                
                for cell in hdr_cells:
                    WordGenerator._set_cell_color(cell, 68, 114, 196)
                    for paragraph in cell.paragraphs:
                        for run in paragraph.runs:
                            run.font.color.rgb = RGBColor(255, 255, 255)
                            run.font.bold = True
                
                # Add data rows
                for key in sorted(all_section_keys):
                    score = scores.get(key, 'N/A')
                    comment = DataValidator.sanitize_input(comments.get(key, ''))
                    
                    if score in ['N/A', '', None] and not comment:
                        continue
                    
                    indicator_name = key.replace('_', ' ').title()
                    
                    row_cells = table.add_row().cells
                    row_cells[0].text = indicator_name
                    row_cells[1].text = str(score) if score != 'N/A' else ''
                    row_cells[2].text = comment
                    
                    # Color code the score cell
                    if score != 'N/A' and isinstance(score, (int, str, float)):
                        try:
                            score_value = int(float(score))
                            if score_value == 1:
                                WordGenerator._set_cell_color(row_cells[1], 220, 53, 69)
                                for paragraph in row_cells[1].paragraphs:
                                    for run in paragraph.runs:
                                        run.font.color.rgb = RGBColor(255, 255, 255)
                                        run.font.bold = True
                            elif score_value == 2:
                                WordGenerator._set_cell_color(row_cells[1], 255, 193, 7)
                                for paragraph in row_cells[1].paragraphs:
                                    for run in paragraph.runs:
                                        run.font.bold = True
                            elif score_value == 3:
                                WordGenerator._set_cell_color(row_cells[1], 144, 238, 144)
                                for paragraph in row_cells[1].paragraphs:
                                    for run in paragraph.runs:
                                        run.font.bold = True
                            elif score_value == 4:
                                WordGenerator._set_cell_color(row_cells[1], 0, 100, 0)
                                for paragraph in row_cells[1].paragraphs:
                                    for run in paragraph.runs:
                                        run.font.color.rgb = RGBColor(255, 255, 255)
                                        run.font.bold = True
                        except (ValueError, TypeError):
                            pass
                
                doc.add_paragraph()
    
    @staticmethod
    def _create_action_plan_section(doc: Document, assessment_data: Dict):
        """Create action plan section with recommendations"""
        scores = assessment_data.get('scores', {})
        comments = assessment_data.get('comments', {})
        
        # Add title
        title = doc.add_heading('IMPROVEMENT ACTION PLAN', level=1)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        subtitle = doc.add_paragraph('Priority Areas for Intervention')
        subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
        subtitle.runs[0].font.size = Pt(14)
        subtitle.runs[0].italic = True
        
        doc.add_paragraph()
        
        # Generate action plan for indicators with scores 1-4
        action_items = []
        
        for indicator_id, score in scores.items():
            if isinstance(score, (int, str)) and str(score).isdigit():
                score_int = int(score)
                if score_int <= 4:
                    # Determine priority, timeline, and color based on score
                    if score_int == 1:
                        priority = "CRITICAL"
                        timeline = "Immediate (Within 2 weeks)"
                        color = (220, 20, 60)
                    elif score_int == 2:
                        priority = "URGENT"
                        timeline = "Short-term (1-3 months)"
                        color = (255, 107, 107)
                    elif score_int == 3:
                        priority = "MODERATE"
                        timeline = "Medium-term (3-6 months)"
                        color = (255, 217, 61)
                    else:  # score == 4
                        priority = "MINOR"
                        timeline = "Long-term (6-12 months)"
                        color = (255, 165, 0)
                    
                    indicator_name = indicator_id.replace('_', ' ').title()
                    comment = comments.get(indicator_id, "")
                    action = f"Address identified gaps: {comment}" if comment else f"Develop and implement improvement plan to enhance this indicator"
                    
                    action_items.append({
                        'name': indicator_name,
                        'action': action,
                        'priority': priority,
                        'timeline': timeline,
                        'color': color,
                        'score': score_int
                    })
        
        # Sort by score (lowest first - most critical)
        action_items.sort(key=lambda x: x['score'])
        
        if action_items:
            # Create table
            table = doc.add_table(rows=1, cols=4)
            table.style = 'Light Grid Accent 1'
            
            # Header row
            hdr_cells = table.rows[0].cells
            hdr_cells[0].text = 'Indicator Name'
            hdr_cells[1].text = 'Recommended Action'
            hdr_cells[2].text = 'Priority Level'
            hdr_cells[3].text = 'Timeline'
            
            for cell in hdr_cells:
                WordGenerator._set_cell_color(cell, 31, 78, 120)
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(255, 255, 255)
                        run.font.bold = True
            
            # Populate action plan
            for item in action_items:
                row_cells = table.add_row().cells
                row_cells[0].text = item['name']
                row_cells[1].text = item['action']
                row_cells[2].text = item['priority']
                row_cells[3].text = item['timeline']
                
                # Color code the priority column
                WordGenerator._set_cell_color(row_cells[2], *item['color'])
                for paragraph in row_cells[2].paragraphs:
                    for run in paragraph.runs:
                        run.font.color.rgb = RGBColor(255, 255, 255) if item['score'] <= 2 else RGBColor(0, 0, 0)
                        run.font.bold = True
        else:
            p = doc.add_paragraph("No critical action items identified. All indicators scored excellently!")
            p.runs[0].font.size = Pt(12)
            p.runs[0].bold = True
            p.runs[0].font.color.rgb = RGBColor(0, 128, 0)
    
    @staticmethod
    def _set_cell_color(cell, r: int, g: int, b: int):
        """Set cell background color using RGB values"""
        shading_elm = OxmlElement('w:shd')
        shading_elm.set(qn('w:fill'), f"{r:02x}{g:02x}{b:02x}")
        cell._element.get_or_add_tcPr().append(shading_elm)
    
    @staticmethod
    def _save_document(doc: Document, filename: str) -> str:
        """Save document to temporary file"""
        temp_dir = tempfile.gettempdir()
        filepath = os.path.join(temp_dir, filename)
        doc.save(filepath)
        return filepath
