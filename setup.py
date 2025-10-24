#!/usr/bin/env python3
"""
Setup script for CHAI Health Portal
This script helps users set up the application with proper configuration
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_dependencies():
    """Install required dependencies"""
    print("\n📦 Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing dependencies: {e}")
        return False

def create_directories():
    """Create necessary directories"""
    print("\n📁 Creating directories...")
    directories = ['logs', 'temp_uploads', 'static/css', 'static/js', 'static/images']
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"✅ Created directory: {directory}")

def create_env_file():
    """Create .env file from template"""
    print("\n⚙️ Setting up configuration...")
    
    if os.path.exists('.env'):
        print("✅ .env file already exists")
        return True
    
    if os.path.exists('env.example'):
        shutil.copy('env.example', '.env')
        print("✅ Created .env file from template")
        print("⚠️  Please edit .env file with your email configuration")
        return True
    else:
        print("❌ env.example file not found")
        return False

def create_gitignore():
    """Create .gitignore file"""
    print("\n📝 Creating .gitignore...")
    
    gitignore_content = """# Environment variables
.env
.env.local
.env.production

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# Logs
logs/
*.log

# Temporary files
temp_uploads/
*.tmp
*.temp

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Flask
instance/
.webassets-cache

# Testing
.coverage
.pytest_cache/
htmlcov/

# Distribution / packaging
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    
    print("✅ Created .gitignore file")

def test_imports():
    """Test if all modules can be imported"""
    print("\n🧪 Testing imports...")
    
    try:
        import flask
        import openpyxl
        import dotenv
        print("✅ All required modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def main():
    """Main setup function"""
    print("🏥 CHAI Health Portal Setup")
    print("=" * 40)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Create directories
    create_directories()
    
    # Create .env file
    if not create_env_file():
        print("⚠️  Please create .env file manually")
    
    # Create .gitignore
    create_gitignore()
    
    # Test imports
    if not test_imports():
        print("❌ Setup incomplete due to import errors")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Edit .env file with your email configuration")
    print("2. Run: python app.py")
    print("3. Open http://127.0.0.1:5000 in your browser")
    print("\nFor production deployment, see README.md")

if __name__ == "__main__":
    main()
