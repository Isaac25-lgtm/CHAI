from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """User model for authentication"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')  # 'user' or 'superuser'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class Participant(db.Model):
    """Participant registration model"""
    __tablename__ = 'participants'
    
    id = db.Column(db.Integer, primary_key=True)
    participant_name = db.Column(db.String(200), nullable=False)
    cadre = db.Column(db.String(100), nullable=False)
    duty_station = db.Column(db.String(200), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    mobile_number = db.Column(db.String(20), nullable=False)
    mobile_money_name = db.Column(db.String(200), nullable=False)
    registration_date = db.Column(db.Date, default=datetime.utcnow)
    campaign_day = db.Column(db.Integer)  # 1-14 for the campaign
    submitted_by = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'participantName': self.participant_name,
            'cadre': self.cadre,
            'dutyStation': self.duty_station,
            'district': self.district,
            'mobileNumber': self.mobile_number,
            'mobileMoneyName': self.mobile_money_name,
            'registrationDate': self.registration_date.strftime('%Y-%m-%d') if self.registration_date else None,
            'campaignDay': self.campaign_day,
            'submittedBy': self.submitted_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


class Assessment(db.Model):
    """Facility assessment model"""
    __tablename__ = 'assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    facility_name = db.Column(db.String(200), nullable=False)
    district = db.Column(db.String(100), nullable=False)
    facility_level = db.Column(db.String(50), nullable=False)
    ownership = db.Column(db.String(50), nullable=False)
    assessor_name = db.Column(db.String(200), nullable=False)
    assessment_date = db.Column(db.Date, nullable=False)
    scores_json = db.Column(db.Text)  # JSON string of all indicator scores
    overall_score = db.Column(db.Float)
    campaign_day = db.Column(db.Integer)  # 1-14 for the campaign
    submitted_by = db.Column(db.String(80))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Category scores (calculated from scores_json)
    service_delivery_score = db.Column(db.Float)
    human_resources_score = db.Column(db.Float)
    supply_chain_score = db.Column(db.Float)
    data_management_score = db.Column(db.Float)
    quality_improvement_score = db.Column(db.Float)
    triple_elimination_treatment_score = db.Column(db.Float)
    art_pmtct_score = db.Column(db.Float)
    quality_pmtct_score = db.Column(db.Float)
    patient_tracking_score = db.Column(db.Float)
    adherence_support_score = db.Column(db.Float)
    facility_linkage_score = db.Column(db.Float)
    sti_screening_score = db.Column(db.Float)
    early_infant_diagnosis_score = db.Column(db.Float)
    ctx_hei_score = db.Column(db.Float)
    tracking_hei_score = db.Column(db.Float)
    enrolment_eid_art_score = db.Column(db.Float)
    hei_eid_registers_score = db.Column(db.Float)
    supply_chain_eid_score = db.Column(db.Float)
    
    def to_dict(self):
        return {
            'id': self.id,
            'facilityName': self.facility_name,
            'district': self.district,
            'facilityLevel': self.facility_level,
            'ownership': self.ownership,
            'assessorName': self.assessor_name,
            'assessmentDate': self.assessment_date.strftime('%Y-%m-%d') if self.assessment_date else None,
            'scores': json.loads(self.scores_json) if self.scores_json else {},
            'overallScore': self.overall_score,
            'campaignDay': self.campaign_day,
            'submittedBy': self.submitted_by,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'categoryScores': {
                'serviceDelivery': self.service_delivery_score,
                'humanResources': self.human_resources_score,
                'supplyChain': self.supply_chain_score,
                'dataManagement': self.data_management_score,
                'qualityImprovement': self.quality_improvement_score,
                'tripleEliminationTreatment': self.triple_elimination_treatment_score,
                'artPmtct': self.art_pmtct_score,
                'qualityPmtct': self.quality_pmtct_score,
                'patientTracking': self.patient_tracking_score,
                'adherenceSupport': self.adherence_support_score,
                'facilityLinkage': self.facility_linkage_score,
                'stiScreening': self.sti_screening_score,
                'earlyInfantDiagnosis': self.early_infant_diagnosis_score,
                'ctxHei': self.ctx_hei_score,
                'trackingHei': self.tracking_hei_score,
                'enrolmentEidArt': self.enrolment_eid_art_score,
                'heiEidRegisters': self.hei_eid_registers_score,
                'supplyChainEid': self.supply_chain_eid_score
            }
        }
    
    def calculate_category_scores(self, scores_dict):
        """Calculate category scores from individual indicator scores"""
        # Define which indicators belong to which category
        # Note: registers section uses reg1-reg11 with max score of 3 per register
        # patient_records is a section-level score (stored as sectionKey)
        categories = {
            'service_delivery': ['reg1', 'reg2', 'reg3', 'reg4', 'reg5', 'reg6', 'reg7', 'reg8', 'reg9', 'reg10', 'reg11'],
            'human_resources': ['patient_records'],  # Section-level conditional questions
            'supply_chain': ['sc1', 'sc2', 'sc3', 'sc4', 'sc5', 'sc6', 'sc7', 'sc8', 'sc9'],
            'data_management': ['dm1', 'dm2', 'dm3', 'dm4'],
            'quality_improvement': ['qi1', 'qi2', 'qi3', 'qi4'],
            'triple_elimination_treatment': ['triple_elimination_treatment'],  # Section-level calculated score
            'art_pmtct': ['art_pmtct'],  # Section-level calculated score
            'quality_pmtct': ['quality_pmtct'],  # Section-level calculated score
            'patient_tracking': ['patient_tracking'],  # Section-level conditional questions
            'adherence_support': ['adherence_support'],  # Section-level conditional questions with percentage
            'facility_linkage': ['facility_linkage'],  # Section-level conditional questions
            'sti_screening': ['sti_screening'],  # Section-level conditional questions with percentage
            'early_infant_diagnosis': ['early_infant_diagnosis'],  # Section-level dual path questions
            'ctx_hei': ['ctx_hei'],  # Section-level numeric conditional questions
            'tracking_hei': ['tracking_hei'],  # Section-level conditional questions
            'enrolment_eid_art': ['enrolment_eid_art'],  # Section-level mixed conditional numeric
            'hei_eid_registers': ['hei_eid_registers'],  # Section-level register checklist
            'supply_chain_eid': ['supply_chain_eid']  # Section-level conditional questions with NA option
        }
        
        # Max scores per indicator type
        max_scores = {
            'service_delivery': 3,  # Registers are scored out of 3 (Red=1, Yellow=2, Green=3)
            'human_resources': 4,  # Conditional questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'supply_chain': 5,
            'data_management': 5,
            'quality_improvement': 5,
            'triple_elimination_treatment': 4,  # Calculated based on %: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'art_pmtct': 4,  # Section-level: Red=1, Dark Green=4
            'quality_pmtct': 4,  # Section-level matrix: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'patient_tracking': 4,  # Conditional questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'adherence_support': 4,  # Conditional questions with percentage: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'facility_linkage': 4,  # Conditional questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'sti_screening': 4,  # Conditional questions with percentage: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'early_infant_diagnosis': 4,  # Dual path questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'ctx_hei': 4,  # Numeric conditional questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'tracking_hei': 4,  # Conditional questions: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'enrolment_eid_art': 4,  # Mixed conditional numeric: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'hei_eid_registers': 4,  # Register checklist: Red=1, Yellow=2, Light Green=3, Dark Green=4
            'supply_chain_eid': 4  # Conditional questions with NA: Red=1, Yellow=2, Light Green=3, Dark Green=4
        }
        
        for category, indicators in categories.items():
            scores = [scores_dict.get(ind, 0) for ind in indicators if ind in scores_dict]
            if scores:
                avg_score = sum(scores) / len(scores)
                max_score = max_scores.get(category, 5)
                percentage = (avg_score / max_score) * 100
                setattr(self, f'{category}_score', percentage)


class ActivityLog(db.Model):
    """Activity log for audit trail"""
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_type = db.Column(db.String(50), nullable=False)  # 'registration', 'assessment', 'login', 'export'
    module = db.Column(db.String(50))  # 'registration', 'assessment', 'admin'
    user_id = db.Column(db.String(80))
    facility_name = db.Column(db.String(200))
    details = db.Column(db.Text)  # JSON string with additional details
    ip_address = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'activityType': self.activity_type,
            'module': self.module,
            'userId': self.user_id,
            'facilityName': self.facility_name,
            'details': self.details,
            'ipAddress': self.ip_address,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }


def init_database(app):
    """Initialize database and create default users"""
    db.init_app(app)
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create default users if they don't exist
        if not User.query.filter_by(username='admin').first():
            # Simple password hashing for demo (use proper hashing in production)
            admin_user = User(
                username='admin',
                password='admin',  # In production, hash this!
                role='user'
            )
            db.session.add(admin_user)
        
        if not User.query.filter_by(username='superuser').first():
            superuser = User(
                username='superuser',
                password='superuser',  # In production, hash this!
                role='superuser'
            )
            db.session.add(superuser)
        
        try:
            db.session.commit()
            print("[OK] Database initialized successfully")
            print("[INFO] Default users created:")
            print("   - admin/admin (regular user)")
            print("   - superuser/superuser (admin access)")
        except Exception as e:
            db.session.rollback()
            print(f"[WARNING] Database initialization error: {e}")


def get_dashboard_stats():
    """Get statistics for admin dashboard"""
    total_participants = Participant.query.count()
    total_assessments = Assessment.query.count()
    
    # Active facilities (submitted in last 30 days)
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_facilities = db.session.query(Participant.duty_station).filter(
        Participant.created_at >= thirty_days_ago
    ).distinct().count()
    
    # Pending reports (placeholder - would need email queue table)
    pending_reports = 0
    
    return {
        'totalParticipants': total_participants,
        'totalAssessments': total_assessments,
        'activeFacilities': active_facilities,
        'pendingReports': pending_reports
    }


def get_district_progress(campaign_day=None):
    """Get district progress data"""
    districts = ['Gulu', 'Kitgum', 'Lamwo', 'Pader', 'Agago', 'Amuru', 'Nwoya', 'Omoro']
    
    query_participants = Participant.query
    query_assessments = Assessment.query
    
    if campaign_day and campaign_day != 'total':
        day_num = int(campaign_day.replace('day', ''))
        query_participants = query_participants.filter_by(campaign_day=day_num)
        query_assessments = query_assessments.filter_by(campaign_day=day_num)
    
    registrations = []
    assessments = []
    
    for district in districts:
        # Use LIKE to match "Agago", "Agago District", "Agago City", etc.
        reg_count = query_participants.filter(Participant.district.like(f'%{district}%')).count()
        assess_count = query_assessments.filter(Assessment.district.like(f'%{district}%')).count()
        registrations.append(reg_count)
        assessments.append(assess_count)
    
    return {
        'labels': districts,
        'registrations': registrations,
        'assessments': assessments
    }


def get_indicator_performance():
    """Get average indicator performance across all assessments"""
    assessments = Assessment.query.all()
    
    if not assessments:
        return {
            'labels': ['Service Delivery', 'Human Resources', 'Supply Chain', 
                      'Data Management', 'Quality Improvement', 'Triple Elimination'],
            'currentPerformance': [0, 0, 0, 0, 0, 0],
            'target': [85, 85, 85, 85, 85, 85]
        }
    
    # Calculate averages
    sd_avg = sum(a.service_delivery_score or 0 for a in assessments) / len(assessments)
    hr_avg = sum(a.human_resources_score or 0 for a in assessments) / len(assessments)
    sc_avg = sum(a.supply_chain_score or 0 for a in assessments) / len(assessments)
    dm_avg = sum(a.data_management_score or 0 for a in assessments) / len(assessments)
    qi_avg = sum(a.quality_improvement_score or 0 for a in assessments) / len(assessments)
    tet_avg = sum(a.triple_elimination_treatment_score or 0 for a in assessments) / len(assessments)
    
    return {
        'labels': ['Service Delivery', 'Human Resources', 'Supply Chain', 
                  'Data Management', 'Quality Improvement', 'Triple Elimination'],
        'currentPerformance': [
            round(sd_avg, 1), round(hr_avg, 1), round(sc_avg, 1),
            round(dm_avg, 1), round(qi_avg, 1), round(tet_avg, 1)
        ],
        'target': [85, 85, 85, 85, 85, 85]
    }


def get_recent_activities(limit=10):
    """Get recent activities for dashboard feed"""
    activities = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [activity.to_dict() for activity in activities]


def get_facilities_overview(district_filter=None, status_filter=None, search_term=None):
    """Get facilities overview for table"""
    # Get all unique facilities from participants and assessments
    facilities_data = {}
    
    # From participants
    participants = Participant.query.all()
    for p in participants:
        if p.duty_station not in facilities_data:
            facilities_data[p.duty_station] = {
                'name': p.duty_station,
                'district': p.district,
                'registrations': 0,
                'assessments': 0,
                'lastActivity': p.created_at
            }
        facilities_data[p.duty_station]['registrations'] += 1
        if p.created_at > facilities_data[p.duty_station]['lastActivity']:
            facilities_data[p.duty_station]['lastActivity'] = p.created_at
    
    # From assessments
    assessments = Assessment.query.all()
    for a in assessments:
        if a.facility_name not in facilities_data:
            facilities_data[a.facility_name] = {
                'name': a.facility_name,
                'district': a.district,
                'registrations': 0,
                'assessments': 0,
                'lastActivity': a.created_at
            }
        facilities_data[a.facility_name]['assessments'] += 1
        if a.created_at > facilities_data[a.facility_name]['lastActivity']:
            facilities_data[a.facility_name]['lastActivity'] = a.created_at
    
    # Convert to list and add status
    facilities_list = []
    for facility in facilities_data.values():
        # Calculate status based on last activity
        days_since_activity = (datetime.utcnow() - facility['lastActivity']).days
        if days_since_activity <= 7:
            status = 'active'
        elif days_since_activity <= 30:
            status = 'pending'
        else:
            status = 'inactive'
        
        facility['status'] = status
        facility['lastActivity'] = facility['lastActivity'].strftime('%Y-%m-%d %H:%M')
        
        # Apply filters
        if district_filter and facility['district'] != district_filter:
            continue
        if status_filter and facility['status'] != status_filter:
            continue
        if search_term and search_term.lower() not in facility['name'].lower():
            continue
        
        facilities_list.append(facility)
    
    return facilities_list


def log_activity(activity_type, user_id, details_dict, module=None, facility_name=None, ip_address=None):
    """Log an activity"""
    activity = ActivityLog(
        activity_type=activity_type,
        module=module,
        user_id=user_id,
        facility_name=facility_name,
        details=json.dumps(details_dict),
        ip_address=ip_address
    )
    db.session.add(activity)
    try:
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error logging activity: {e}")
        return False

