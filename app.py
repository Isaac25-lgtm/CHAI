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
from utils import ExcelGenerator, EmailService, FileManager
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
    "infrastructure": {
        "name": "Infrastructure & Equipment",
        "indicators": [
            {"id": "if1", "name": "Facility physical condition", "max_score": 5},
            {"id": "if2", "name": "Essential equipment availability", "max_score": 5},
            {"id": "if3", "name": "Power supply reliability", "max_score": 5},
            {"id": "if4", "name": "Water and sanitation", "max_score": 5}
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