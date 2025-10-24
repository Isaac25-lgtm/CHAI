import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration class"""
    
    # Flask configuration
    # CRITICAL: Changed SECRET_KEY to invalidate all existing sessions (Oct 24, 2025)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'chai-portal-secure-key-v2-20251024'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    HOST = os.environ.get('FLASK_HOST', '127.0.0.1')
    PORT = int(os.environ.get('FLASK_PORT', 5000))
    
    # Database configuration
    # For local development, use SQLite
    # For production (Render), use PostgreSQL from DATABASE_URL env variable
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///chai_portal.db')
    # Fix for Render's postgres:// URL (should be postgresql://)
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL debugging
    
    # Email configuration
    RECIPIENT_EMAIL = os.environ.get('RECIPIENT_EMAIL', 'omodingisaac111@gmail.com')
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USERNAME = os.environ.get('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    SMTP_USE_TLS = os.environ.get('SMTP_USE_TLS', 'True').lower() == 'true'
    
    # Application settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'temp_uploads')
    
    # Security settings
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour
    
    # Session security settings
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'  # True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME = 3600  # Session expires after 1 hour of inactivity
    SESSION_REFRESH_EACH_REQUEST = True  # Refresh session on each request
    SESSION_VERSION = '2.0'  # Increment this to invalidate all existing sessions
    
    @staticmethod
    def validate_config():
        """Validate that required configuration is present"""
        required_vars = ['SMTP_USERNAME', 'SMTP_PASSWORD']
        missing_vars = [var for var in required_vars if not os.environ.get(var)]
        
        if missing_vars:
            print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
            print("Email functionality will not work without proper SMTP configuration.")
            return False
        return True
