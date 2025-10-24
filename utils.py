import os
import tempfile
import uuid
from datetime import datetime
from typing import Dict, List, Tuple, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
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
            
            # Apply sheet protection for regular users
            if protect_sheet:
                ws.protection.sheet = True
                ws.protection.password = 'CHAI_PROTECTED_2024'
                ws.protection.enable()
                # Add a watermark message in a hidden cell
                ws['Z1'] = 'READ ONLY - Contact superuser for editing'
                ws['Z1'].font = Font(color="FF0000", size=8)
            
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
            
            # Create summary dashboard
            ExcelGenerator._create_summary_sheet(wb, assessment_data)
            
            # Create detailed scores sheet
            ExcelGenerator._create_details_sheet(wb, assessment_data)
            
            # Create action plan sheet
            ExcelGenerator._create_action_plan_sheet(wb, assessment_data)
            
            # Apply protection to all sheets if requested
            if protect_sheet:
                for ws in wb.worksheets:
                    ws.protection.sheet = True
                    ws.protection.password = 'CHAI_PROTECTED_2024'
                    ws.protection.enable()
                    # Add watermark
                    ws['Z1'] = 'READ ONLY - Contact superuser for editing'
                    ws['Z1'].font = Font(color="FF0000", size=8)
            
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
        """Create summary dashboard sheet"""
        ws = wb.active
        ws.title = "Sheet1"
        
        # Define borders and fills
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="CCCCCC", end_color="CCCCCC", fill_type="solid")
        completed_fill = PatternFill(start_color="90EE90", end_color="90EE90", fill_type="solid")
        
        # Set column widths
        ws.column_dimensions['A'].width = 20  # District
        ws.column_dimensions['B'].width = 35  # Health Facility
        ws.column_dimensions['C'].width = 10  # New
        ws.column_dimensions['D'].width = 35  # Health Facility
        ws.column_dimensions['E'].width = 15  # Level
        ws.column_dimensions['F'].width = 20  # Form Submitted
        ws.column_dimensions['G'].width = 15  # Completed
        
        # Create headers
        headers = ['District', 'Health Facility', 'New', 'Health Facility', 'Level', 'Form Submitted', 
                   'Completed']
        
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = Font(bold=True, size=10)
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Add facility data
        row_num = 2
        district = DataValidator.sanitize_input(assessment_data.get('district', 'N/A'))
        facility_name = DataValidator.sanitize_input(assessment_data.get('facilityName', 'N/A'))
        facility_level = DataValidator.sanitize_input(assessment_data.get('facilityLevel', 'N/A'))
        
        # Populate row
        ws.cell(row=row_num, column=1).value = district
        ws.cell(row=row_num, column=2).value = facility_name
        ws.cell(row=row_num, column=4).value = facility_name
        ws.cell(row=row_num, column=5).value = facility_level
        ws.cell(row=row_num, column=6).value = "Yes"
        ws.cell(row=row_num, column=7).value = "yes"
        
        # Apply green fill to "Completed" column
        ws.cell(row=row_num, column=7).fill = completed_fill
        
        # Apply borders to all cells in the row
        for col_num in range(1, len(headers) + 1):
            ws.cell(row=row_num, column=col_num).border = thin_border
            ws.cell(row=row_num, column=col_num).alignment = Alignment(vertical='center')
    
    @staticmethod
    def _create_details_sheet(wb: Workbook, assessment_data: Dict):
        """Create detailed scores sheet with all indicators, scores and comments"""
        ws = wb.create_sheet("Assessment Details")
        
        # Define styling
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        section_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
        
        # Set column widths
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['C'].width = 50
        ws.column_dimensions['D'].width = 10
        ws.column_dimensions['E'].width = 10
        ws.column_dimensions['F'].width = 50
        
        # Add title
        ws.merge_cells('A1:F1')
        title_cell = ws['A1']
        title_cell.value = "FACILITY ASSESSMENT DETAILED REPORT"
        title_cell.font = Font(size=16, bold=True, color="FFFFFF")
        title_cell.fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        title_cell.border = thin_border
        
        # Add facility information
        row = 3
        ws[f'A{row}'] = "District:"
        ws[f'B{row}'] = DataValidator.sanitize_input(assessment_data.get('district', 'N/A'))
        ws[f'C{row}'] = "Facility Name:"
        ws[f'D{row}'].value = DataValidator.sanitize_input(assessment_data.get('facilityName', 'N/A'))
        ws.merge_cells(f'D{row}:F{row}')
        
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
        
        # Add headers for assessment data
        row += 2
        headers = ['Section', 'Indicator ID', 'Indicator Name', 'Max Score', 'Score', 'Comments']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = Font(bold=True, size=11, color="FFFFFF")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Define sections and indicators
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
        
        # Get scores and comments from assessment data
        scores = assessment_data.get('scores', {})
        comments = assessment_data.get('comments', {})
        
        # Populate data
        row += 1
        for section_name, indicators in sections.items():
            # Add section header
            ws.merge_cells(f'A{row}:F{row}')
            section_cell = ws.cell(row=row, column=1)
            section_cell.value = section_name
            section_cell.fill = section_fill
            section_cell.font = Font(bold=True, size=12)
            section_cell.border = thin_border
            section_cell.alignment = Alignment(horizontal='left', vertical='center')
            row += 1
            
            # Add indicators
            for indicator in indicators:
                indicator_id = indicator['id']
                score = scores.get(indicator_id, 'N/A')
                comment = DataValidator.sanitize_input(comments.get(indicator_id, ''))
                
                ws.cell(row=row, column=1).value = section_name
                ws.cell(row=row, column=2).value = indicator_id.upper()
                ws.cell(row=row, column=3).value = indicator['name']
                ws.cell(row=row, column=4).value = indicator['max_score']
                ws.cell(row=row, column=5).value = score if score != 'N/A' else ''
                ws.cell(row=row, column=6).value = comment
                
                # Apply styling
                for col_num in range(1, 7):
                    cell = ws.cell(row=row, column=col_num)
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical='center', wrap_text=True)
                    if col_num in [4, 5]:
                        cell.alignment = Alignment(horizontal='center', vertical='center')
                
                # Color code the score column (column 5) based on score value
                score_cell = ws.cell(row=row, column=5)
                if score != 'N/A' and isinstance(score, (int, str)) and str(score).isdigit():
                    score_value = int(score)
                    max_score = indicator['max_score']
                    percentage = (score_value / max_score * 100) if max_score > 0 else 0
                    
                    # Traffic light color coding
                    if percentage < 60:  # Red for low scores (0-59.9%)
                        score_cell.fill = PatternFill(start_color="FF6B6B", end_color="FF6B6B", fill_type="solid")
                        score_cell.font = Font(bold=True, color="FFFFFF")
                    elif percentage < 80:  # Yellow for medium scores (60-79.9%)
                        score_cell.fill = PatternFill(start_color="FFD93D", end_color="FFD93D", fill_type="solid")
                        score_cell.font = Font(bold=True, color="000000")
                    else:  # Green for high scores (80-100%)
                        score_cell.fill = PatternFill(start_color="6BCF7F", end_color="6BCF7F", fill_type="solid")
                        score_cell.font = Font(bold=True, color="FFFFFF")
                
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
        
        # Calculate totals
        total_possible = sum(ind['max_score'] for section in sections.values() for ind in section)
        total_scored = sum(int(score) if isinstance(score, (int, str)) and str(score).isdigit() else 0 for score in scores.values())
        percentage = round((total_scored / total_possible * 100), 1) if total_possible > 0 else 0
        
        # Determine color based on overall percentage
        if percentage < 60:  # Red for low scores (0-59.9%)
            score_fill = PatternFill(start_color="FF6B6B", end_color="FF6B6B", fill_type="solid")
        elif percentage < 80:  # Yellow for medium scores (60-79.9%)
            score_fill = PatternFill(start_color="FFD93D", end_color="FFD93D", fill_type="solid")
        else:  # Green for high scores (80-100%)
            score_fill = PatternFill(start_color="6BCF7F", end_color="6BCF7F", fill_type="solid")
        
        # First row: Max Score and Total Score
        ws.cell(row=row, column=4).value = total_possible
        ws.cell(row=row, column=4).fill = header_fill
        ws.cell(row=row, column=4).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=row, column=4).border = thin_border
        ws.cell(row=row, column=4).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=5).value = total_scored
        ws.cell(row=row, column=5).fill = score_fill
        ws.cell(row=row, column=5).font = Font(bold=True, size=12, color="FFFFFF")
        ws.cell(row=row, column=5).border = thin_border
        ws.cell(row=row, column=5).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=6).value = ""
        ws.cell(row=row, column=6).border = thin_border
        
        # Second row: Percentage in the same column as Total Score
        row += 1
        ws.merge_cells(f'A{row}:D{row}')
        percentage_label = ws.cell(row=row, column=1)
        percentage_label.value = "PERCENTAGE SCORE"
        percentage_label.fill = header_fill
        percentage_label.font = Font(bold=True, size=12, color="FFFFFF")
        percentage_label.border = thin_border
        percentage_label.alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=5).value = f"{percentage}%"
        ws.cell(row=row, column=5).fill = score_fill
        ws.cell(row=row, column=5).font = Font(bold=True, size=12, color="FFFFFF")
        ws.cell(row=row, column=5).border = thin_border
        ws.cell(row=row, column=5).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=6).value = ""
        ws.cell(row=row, column=6).border = thin_border
    
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
