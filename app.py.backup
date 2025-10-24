from flask import Flask, render_template, request, jsonify, send_file
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
import os
import sys
from datetime import datetime
import tempfile
import webbrowser
import threading
import time

# For Windows executable compatibility
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    template_folder = os.path.join(sys._MEIPASS, 'templates')
    static_folder = os.path.join(sys._MEIPASS, 'static')
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
else:
    # Running as normal Python script
    app = Flask(__name__)

# Email configuration
RECIPIENT_EMAIL = "omodingisaac111@gmail.com"

# SMTP Configuration - Update these for email functionality
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USERNAME = "your-email@gmail.com"  # UPDATE THIS
SMTP_PASSWORD = "your-app-password"  # UPDATE THIS - Use app password for Gmail

def create_excel_file(participants_data):
    """Generate Excel file matching the exact format"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Participant Registration"
    
    # Define headers
    headers = [
        "No.",
        "Participant's Name",
        "Cadre",
        "Duty Station (Facility)",
        "District",
        "Mobile Number Registered",
        "Names Registered on Mobile Money (First & Last Names)"
    ]
    
    # Style for headers
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True, size=11)
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Write headers
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = border
    
    # Set column widths
    ws.column_dimensions['A'].width = 6
    ws.column_dimensions['B'].width = 25
    ws.column_dimensions['C'].width = 20
    ws.column_dimensions['D'].width = 30
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 25
    ws.column_dimensions['G'].width = 35
    
    # Row fill for data rows
    data_fill = PatternFill(start_color="D9D9D9", end_color="D9D9D9", fill_type="solid")
    
    # Write participant data
    for idx, participant in enumerate(participants_data, 1):
        row_num = idx + 1
        
        ws.cell(row=row_num, column=1).value = idx
        ws.cell(row=row_num, column=2).value = participant.get('participantName', '')
        ws.cell(row=row_num, column=3).value = participant.get('cadre', '')
        ws.cell(row=row_num, column=4).value = participant.get('dutyStation', '')
        ws.cell(row=row_num, column=5).value = participant.get('district', '')
        ws.cell(row=row_num, column=6).value = participant.get('mobileNumber', '')
        ws.cell(row=row_num, column=7).value = participant.get('mobileMoneyName', '')
        
        # Apply styling and borders to all cells in the row
        for col_num in range(1, 8):
            cell = ws.cell(row=row_num, column=col_num)
            cell.border = border
            cell.fill = data_fill
            cell.alignment = Alignment(vertical='center')
    
    # Add empty rows (up to row 24 as shown in your template)
    for row_num in range(len(participants_data) + 2, 25):
        for col_num in range(1, 8):
            cell = ws.cell(row=row_num, column=col_num)
            cell.border = border
            cell.fill = data_fill
    
    # Save file - Use temp directory that works on Windows
    filename = f'participant_registration_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    temp_dir = tempfile.gettempdir()
    filepath = os.path.join(temp_dir, filename)
    wb.save(filepath)
    
    return filepath, filename

def send_email_smtp(filepath, filename):
    """Send email using SMTP (Gmail, etc.)"""
    msg = MIMEMultipart()
    msg['Subject'] = f'Participant Registration - {datetime.now().strftime("%Y-%m-%d %H:%M")}'
    msg['From'] = SMTP_USERNAME
    msg['To'] = RECIPIENT_EMAIL
    
    body = f"""
    Dear Team,
    
    Please find attached the participant registration data.
    
    Registration Date: {datetime.now().strftime("%Y-%m-%d at %H:%M")}
    
    Best regards,
    Registration System
    """
    
    msg.attach(MIMEText(body, 'plain'))
    
    # Attach Excel
    with open(filepath, 'rb') as f:
        part = MIMEBase('application', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename={filename}')
        msg.attach(part)
    
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        return True, "Email sent successfully"
    except Exception as e:
        return False, str(e)

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit_data():
    """Handle form submission"""
    try:
        data = request.get_json()
        participants = data.get('participants', [])
        
        if not participants:
            return jsonify({'success': False, 'message': 'No participants data received'}), 400
        
        # Generate Excel file
        filepath, filename = create_excel_file(participants)
        
        # Send email using SMTP (simplified for executable)
        success, message = send_email_smtp(filepath, filename)
        
        # Clean up temp file
        if os.path.exists(filepath):
            os.remove(filepath)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully sent {len(participants)} participant(s) data to {RECIPIENT_EMAIL}'
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Failed to send email: {message}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/download', methods=['POST'])
def download_excel():
    """Download Excel file without sending email"""
    try:
        data = request.get_json()
        participants = data.get('participants', [])
        
        if not participants:
            return jsonify({'success': False, 'message': 'No participants data'}), 400
        
        filepath, filename = create_excel_file(participants)
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def open_browser():
    """Open browser after server starts"""
    time.sleep(1.5)
    webbrowser.open('http://127.0.0.1:5000')

if __name__ == '__main__':
    # Open browser automatically when running as executable
    if getattr(sys, 'frozen', False):
        threading.Thread(target=open_browser, daemon=True).start()
    
    # Run Flask app
    app.run(debug=False, host='127.0.0.1', port=5000, use_reloader=False)
