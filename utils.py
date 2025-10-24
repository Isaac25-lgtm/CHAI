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
    def create_participant_excel(participants_data: List[Dict]) -> Tuple[str, str]:
        """Generate Excel file for participant registration"""
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
    def create_assessment_excel(assessment_data: Dict) -> Tuple[str, str]:
        """Generate comprehensive Excel assessment report"""
        try:
            wb = Workbook()
            
            # Create summary dashboard
            ExcelGenerator._create_summary_sheet(wb, assessment_data)
            
            # Create detailed scores sheet
            ExcelGenerator._create_details_sheet(wb, assessment_data)
            
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
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 30
        ws.column_dimensions['C'].width = 10
        ws.column_dimensions['D'].width = 30
        ws.column_dimensions['E'].width = 10
        ws.column_dimensions['F'].width = 15
        ws.column_dimensions['G'].width = 15
        ws.column_dimensions['O'].width = 15
        ws.column_dimensions['P'].width = 15
        ws.column_dimensions['Q'].width = 20
        ws.column_dimensions['R'].width = 20
        ws.column_dimensions['S'].width = 15
        ws.column_dimensions['T'].width = 20
        ws.column_dimensions['U'].width = 20
        ws.column_dimensions['V'].width = 25
        
        # Create headers
        headers = ['District', 'Health Facility', 'New', 'Health Facility', 'Level', 'Form Submitted', 
                   'Completed', '', '', '', '', '', '', '', 
                   'ANC Register', 'Maternity Register', 'HBV PMTCT services available',
                   'ANC1', 'No. PW HBV tested', 'PW HBV tested (%)', 'HBV Prophylaxis available',
                   'HBV+ Test', 'HBV+ <200,000', 'HBV+ >200,000']
        
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
                {"id": "sd1", "name": "ART service availability", "max_score": 5},
                {"id": "sd2", "name": "PMTCT integration", "max_score": 5},
                {"id": "sd3", "name": "Pediatric HIV services", "max_score": 5},
                {"id": "sd4", "name": "TB/HIV collaborative activities", "max_score": 5},
                {"id": "sd5", "name": "Laboratory services functionality", "max_score": 5}
            ],
            "Human Resources for Health": [
                {"id": "hr1", "name": "Staffing levels adequacy", "max_score": 5},
                {"id": "hr2", "name": "Staff trained on HIV guidelines", "max_score": 5},
                {"id": "hr3", "name": "Mentorship programs in place", "max_score": 5},
                {"id": "hr4", "name": "Performance management systems", "max_score": 5}
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
            "Data Management & Use": [
                {"id": "dm1", "name": "Data quality and completeness", "max_score": 5},
                {"id": "dm2", "name": "HMIS reporting timeliness", "max_score": 5},
                {"id": "dm3", "name": "Data use for decision making", "max_score": 5},
                {"id": "dm4", "name": "Patient tracking systems", "max_score": 5}
            ],
            "Quality Improvement": [
                {"id": "qi1", "name": "QI committees functionality", "max_score": 5},
                {"id": "qi2", "name": "Clinical audits conducted", "max_score": 5},
                {"id": "qi3", "name": "Client satisfaction mechanisms", "max_score": 5},
                {"id": "qi4", "name": "Continuous improvement plans", "max_score": 5}
            ],
            "Infrastructure & Equipment": [
                {"id": "if1", "name": "Facility physical condition", "max_score": 5},
                {"id": "if2", "name": "Essential equipment availability", "max_score": 5},
                {"id": "if3", "name": "Power supply reliability", "max_score": 5},
                {"id": "if4", "name": "Water and sanitation", "max_score": 5}
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
        
        ws.cell(row=row, column=4).value = total_possible
        ws.cell(row=row, column=4).fill = header_fill
        ws.cell(row=row, column=4).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=row, column=4).border = thin_border
        ws.cell(row=row, column=4).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=5).value = total_scored
        ws.cell(row=row, column=5).fill = header_fill
        ws.cell(row=row, column=5).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=row, column=5).border = thin_border
        ws.cell(row=row, column=5).alignment = Alignment(horizontal='center', vertical='center')
        
        ws.cell(row=row, column=6).value = f"{percentage}%"
        ws.cell(row=row, column=6).fill = header_fill
        ws.cell(row=row, column=6).font = Font(bold=True, color="FFFFFF")
        ws.cell(row=row, column=6).border = thin_border
        ws.cell(row=row, column=6).alignment = Alignment(horizontal='center', vertical='center')
    
    @staticmethod
    def _create_action_plan_sheet(wb: Workbook, assessment_data: Dict):
        """Create action plan sheet with recommendations"""
        ws = wb.create_sheet("Action Plan")
        
        # Define styling
        thin_border = Border(
            left=Side(style='thin'), right=Side(style='thin'),
            top=Side(style='thin'), bottom=Side(style='thin')
        )
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        priority_high = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
        priority_medium = PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid")
        
        # Set column widths
        ws.column_dimensions['A'].width = 30
        ws.column_dimensions['B'].width = 50
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 30
        
        # Add title
        ws.merge_cells('A1:D1')
        title_cell = ws['A1']
        title_cell.value = "IMPROVEMENT ACTION PLAN"
        title_cell.font = Font(size=16, bold=True, color="FFFFFF")
        title_cell.fill = header_fill
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        title_cell.border = thin_border
        
        # Add headers
        row = 3
        headers = ['Indicator Area', 'Recommended Action', 'Priority', 'Timeline']
        for col_num, header in enumerate(headers, 1):
            cell = ws.cell(row=row, column=col_num)
            cell.value = header
            cell.fill = header_fill
            cell.font = Font(bold=True, size=11, color="FFFFFF")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        
        # Get scores to identify low-scoring areas
        scores = assessment_data.get('scores', {})
        recommendations = assessment_data.get('recommendations', {})
        
        # Generate recommendations for low-scoring indicators
        row += 1
        for indicator_id, score in scores.items():
            if isinstance(score, (int, str)) and str(score).isdigit() and int(score) < 3:
                # This is a low-scoring indicator, add to action plan
                priority = "High" if int(score) <= 2 else "Medium"
                timeline = "Immediate (1-3 months)" if priority == "High" else "Short-term (3-6 months)"
                
                ws.cell(row=row, column=1).value = indicator_id.upper()
                ws.cell(row=row, column=2).value = recommendations.get(indicator_id, 
                    f"Develop improvement plan for {indicator_id}")
                ws.cell(row=row, column=3).value = priority
                ws.cell(row=row, column=4).value = timeline
                
                # Apply styling
                for col_num in range(1, 5):
                    cell = ws.cell(row=row, column=col_num)
                    cell.border = thin_border
                    cell.alignment = Alignment(vertical='center', wrap_text=True)
                    if col_num == 3:
                        if priority == "High":
                            cell.fill = priority_high
                        else:
                            cell.fill = priority_medium
                
                row += 1
    
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
