#!/usr/bin/env python3
"""
Basic test script for CHAI Health Portal
Tests core functionality without requiring full server setup
"""

import sys
import os
import tempfile
import json
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all modules can be imported"""
    print("Testing imports...")
    
    try:
        from config import Config
        from validators import DataValidator, ValidationError
        from utils import ExcelGenerator, EmailService, FileManager
        from logger import setup_logger
        print("All modules imported successfully")
        return True
    except ImportError as e:
        print(f"Import error: {e}")
        return False

def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")
    
    try:
        from config import Config
        print(f"Config loaded - Debug: {Config.DEBUG}")
        print(f"Host: {Config.HOST}, Port: {Config.PORT}")
        return True
    except Exception as e:
        print(f"Config error: {e}")
        return False

def test_validators():
    """Test data validation"""
    print("\nTesting validators...")
    
    try:
        from validators import DataValidator
        
        # Test participant validation
        valid_participant = {
            'participantName': 'John Doe',
            'cadre': 'Nurse',
            'dutyStation': 'Gulu Hospital',
            'district': 'Gulu',
            'mobileNumber': '0701234567',
            'mobileMoneyName': 'John Doe'
        }
        
        is_valid, errors = DataValidator.validate_participant_data(valid_participant)
        if is_valid:
            print("✅ Participant validation works")
        else:
            print(f"❌ Participant validation failed: {errors}")
            return False
        
        # Test phone validation
        if DataValidator.validate_phone_number('0701234567'):
            print("✅ Phone validation works")
        else:
            print("❌ Phone validation failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Validator error: {e}")
        return False

def test_excel_generation():
    """Test Excel file generation"""
    print("\nTesting Excel generation...")
    
    try:
        from utils import ExcelGenerator
        
        # Test participant Excel
        participants = [{
            'participantName': 'Test User',
            'cadre': 'Nurse',
            'dutyStation': 'Test Hospital',
            'district': 'Test District',
            'mobileNumber': '0701234567',
            'mobileMoneyName': 'Test User'
        }]
        
        filepath, filename = ExcelGenerator.create_participant_excel(participants)
        
        if os.path.exists(filepath):
            print("✅ Participant Excel generation works")
            os.remove(filepath)  # Clean up
        else:
            print("❌ Participant Excel generation failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Excel generation error: {e}")
        return False

def test_logging():
    """Test logging functionality"""
    print("\nTesting logging...")
    
    try:
        from logger import setup_logger
        
        logger = setup_logger('test_logger')
        logger.info("Test log message")
        print("✅ Logging works")
        return True
    except Exception as e:
        print(f"❌ Logging error: {e}")
        return False

def test_file_manager():
    """Test file management"""
    print("\nTesting file management...")
    
    try:
        from utils import FileManager
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False) as f:
            temp_file = f.name
            f.write(b"test content")
        
        # Test cleanup
        if FileManager.cleanup_temp_file(temp_file):
            print("✅ File management works")
        else:
            print("❌ File cleanup failed")
            return False
        
        return True
    except Exception as e:
        print(f"❌ File management error: {e}")
        return False

def main():
    """Run all tests"""
    print("CHAI Health Portal - Test Suite")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_config,
        test_validators,
        test_excel_generation,
        test_logging,
        test_file_manager
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print(f"\nTest Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("All tests passed! The application is ready to use.")
        return True
    else:
        print("Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
