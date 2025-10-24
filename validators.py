import re
from typing import Dict, List, Tuple, Optional
from datetime import datetime

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

class DataValidator:
    """Comprehensive data validation class"""
    
    # Phone number patterns for different countries
    PHONE_PATTERNS = {
        'uganda': r'^(\+256|0)7\d{8}$',
        'generic': r'^\+?[1-9]\d{1,14}$'
    }
    
    # Email pattern
    EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    @staticmethod
    def validate_phone_number(phone: str, country: str = 'uganda') -> bool:
        """Validate phone number format"""
        if not phone:
            return False
        
        # Clean the phone number
        clean_phone = re.sub(r'\s+', '', phone.strip())
        
        pattern = DataValidator.PHONE_PATTERNS.get(country, DataValidator.PHONE_PATTERNS['generic'])
        return bool(re.match(pattern, clean_phone))
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email:
            return False
        return bool(re.match(DataValidator.EMAIL_PATTERN, email.strip()))
    
    @staticmethod
    def validate_required_fields(data: Dict, required_fields: List[str]) -> Tuple[bool, List[str]]:
        """Validate that all required fields are present and not empty"""
        missing_fields = []
        
        for field in required_fields:
            if field not in data or not data[field] or str(data[field]).strip() == '':
                missing_fields.append(field)
        
        return len(missing_fields) == 0, missing_fields
    
    @staticmethod
    def validate_text_length(text: str, min_length: int = 1, max_length: int = 255) -> bool:
        """Validate text length"""
        if not text:
            return min_length == 0
        
        text = str(text).strip()
        return min_length <= len(text) <= max_length
    
    @staticmethod
    def validate_participant_data(participant: Dict) -> Tuple[bool, List[str]]:
        """Validate participant registration data"""
        errors = []
        
        # Required fields
        required_fields = ['participantName', 'cadre', 'dutyStation', 'district', 'mobileNumber', 'mobileMoneyName']
        is_valid, missing_fields = DataValidator.validate_required_fields(participant, required_fields)
        
        if not is_valid:
            errors.extend([f"{field} is required" for field in missing_fields])
        
        # Validate text lengths
        text_validations = [
            ('participantName', 2, 100),
            ('cadre', 2, 50),
            ('dutyStation', 2, 100),
            ('district', 2, 50),
            ('mobileMoneyName', 2, 100)
        ]
        
        for field, min_len, max_len in text_validations:
            if field in participant and participant[field]:
                if not DataValidator.validate_text_length(participant[field], min_len, max_len):
                    errors.append(f"{field} must be between {min_len} and {max_len} characters")
        
        # Validate phone number
        if 'mobileNumber' in participant and participant['mobileNumber']:
            if not DataValidator.validate_phone_number(participant['mobileNumber']):
                errors.append("Invalid phone number format. Use 07XXXXXXXX or +2567XXXXXXXX")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_assessment_data(assessment: Dict) -> Tuple[bool, List[str]]:
        """Validate assessment data"""
        errors = []
        
        # Required facility information
        required_fields = ['facilityName', 'district', 'facilityLevel', 'ownership', 'assessorName', 'assessmentDate']
        is_valid, missing_fields = DataValidator.validate_required_fields(assessment, required_fields)
        
        if not is_valid:
            errors.extend([f"{field} is required" for field in missing_fields])
        
        # Validate facility name length
        if 'facilityName' in assessment and assessment['facilityName']:
            if not DataValidator.validate_text_length(assessment['facilityName'], 2, 100):
                errors.append("Facility name must be between 2 and 100 characters")
        
        # Validate assessor name
        if 'assessorName' in assessment and assessment['assessorName']:
            if not DataValidator.validate_text_length(assessment['assessorName'], 2, 100):
                errors.append("Assessor name must be between 2 and 100 characters")
        
        # Validate assessment date
        if 'assessmentDate' in assessment and assessment['assessmentDate']:
            try:
                datetime.strptime(assessment['assessmentDate'], '%Y-%m-%d')
            except ValueError:
                errors.append("Invalid assessment date format. Use YYYY-MM-DD")
        
        # Validate scores
        if 'scores' in assessment and assessment['scores']:
            for indicator_id, score in assessment['scores'].items():
                if not isinstance(score, int) or score < 0 or score > 5:
                    errors.append(f"Invalid score for {indicator_id}. Must be between 0 and 5")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Enhanced input sanitization to prevent various injection attacks"""
        if not text:
            return text
        
        text = str(text).strip()
        
        # Remove or escape potentially dangerous characters
        dangerous_chars = ['=', '+', '-', '@', '\t', '\r', '\0']
        
        # For Excel formula injection prevention
        if text and text[0] in dangerous_chars:
            text = "'" + text
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Limit length to prevent buffer overflow attacks
        if len(text) > 1000:
            text = text[:1000]
        
        return text
    
    @staticmethod
    def validate_file_upload(filename: str, allowed_extensions: List[str] = None) -> Tuple[bool, str]:
        """Validate file upload"""
        if not filename:
            return False, "No filename provided"
        
        if allowed_extensions is None:
            allowed_extensions = ['.xlsx', '.xls', '.csv']
        
        # Check file extension
        if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
            return False, f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        
        # Check filename length
        if len(filename) > 255:
            return False, "Filename too long"
        
        # Check for dangerous characters in filename
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|']
        if any(char in filename for char in dangerous_chars):
            return False, "Filename contains invalid characters"
        
        return True, "Valid file"
