import logging
import os
from datetime import datetime
from logging.handlers import RotatingFileHandler

def setup_logger(name: str = 'chai_app', log_level: str = 'INFO') -> logging.Logger:
    """Set up application logger with file and console handlers"""
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Create logs directory if it doesn't exist
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # File handler with rotation
    log_file = os.path.join(log_dir, f'{name}.log')
    file_handler = RotatingFileHandler(
        log_file, 
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
    )
    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

def log_function_call(func):
    """Decorator to log function calls"""
    def wrapper(*args, **kwargs):
        logger = logging.getLogger('chai_app')
        logger.debug(f"Calling {func.__name__} with args={args}, kwargs={kwargs}")
        try:
            result = func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed successfully")
            return result
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}", exc_info=True)
            raise
    return wrapper

def log_api_call(endpoint: str, method: str, status_code: int, response_time: float = None):
    """Log API endpoint calls"""
    logger = logging.getLogger('chai_app')
    message = f"API {method} {endpoint} - Status: {status_code}"
    if response_time:
        message += f" - Response time: {response_time:.3f}s"
    
    if 200 <= status_code < 300:
        logger.info(message)
    elif 400 <= status_code < 500:
        logger.warning(message)
    else:
        logger.error(message)

def log_security_event(event_type: str, details: str, user_ip: str = None):
    """Log security-related events"""
    logger = logging.getLogger('chai_app')
    message = f"SECURITY EVENT - {event_type}: {details}"
    if user_ip:
        message += f" - IP: {user_ip}"
    logger.warning(message)

def log_email_event(event_type: str, recipient: str, success: bool, details: str = None):
    """Log email-related events"""
    logger = logging.getLogger('chai_app')
    status = "SUCCESS" if success else "FAILED"
    message = f"EMAIL {status} - {event_type} to {recipient}"
    if details:
        message += f" - {details}"
    
    if success:
        logger.info(message)
    else:
        logger.error(message)
