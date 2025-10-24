# 🚀 Deployment Guide

This guide covers different deployment options for the CHAI Health Portal.

## 📋 Prerequisites

- Python 3.8 or higher
- Git (for version control)
- Email account with SMTP access (Gmail recommended)

## 🛠️ Local Development Setup

### 1. Quick Setup (Automated)
```bash
# Clone the repository
git clone <repository-url>
cd participant_registration

# Run the setup script
python setup.py

# Edit configuration
# Edit .env file with your email settings

# Start the application
python app.py
```

### 2. Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir logs temp_uploads

# Copy environment template
cp env.example .env

# Edit .env file with your settings
# Start the application
python app.py
```

## 🌐 Production Deployment

### Option 1: Render.com (Recommended - Free)

1. **Fork this repository** to your GitHub account

2. **Sign up at [render.com](https://render.com)**

3. **Create New Web Service:**
   - Connect your GitHub repository
   - Choose "Web Service"
   - Select your forked repository

4. **Configure Settings:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Python Version:** 3.11

5. **Set Environment Variables:**
   - Go to Environment tab
   - Add the following variables:
     ```
     SECRET_KEY=your-secret-key-here
     RECIPIENT_EMAIL=your-email@domain.com
     SMTP_USERNAME=your-email@gmail.com
     SMTP_PASSWORD=your-app-password
     SMTP_SERVER=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USE_TLS=True
     ```

6. **Deploy!**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be available at `https://your-app-name.onrender.com`

### Option 2: Heroku

1. **Install Heroku CLI**

2. **Create Heroku app:**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set SECRET_KEY=your-secret-key
   heroku config:set RECIPIENT_EMAIL=your-email@domain.com
   heroku config:set SMTP_USERNAME=your-email@gmail.com
   heroku config:set SMTP_PASSWORD=your-app-password
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

### Option 3: PythonAnywhere

1. **Upload files** to PythonAnywhere
2. **Set up web app** with WSGI configuration
3. **Configure virtual environment**
4. **Set environment variables** in the web app settings
5. **Reload** the web app

### Option 4: VPS/Cloud Server

1. **Set up Ubuntu/CentOS server**

2. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip nginx
   ```

3. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd participant_registration
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure Nginx:**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

5. **Set up systemd service:**
   ```ini
   [Unit]
   Description=CHAI Health Portal
   After=network.target
   
   [Service]
   User=www-data
   WorkingDirectory=/path/to/participant_registration
   Environment="PATH=/path/to/participant_registration/venv/bin"
   ExecStart=/path/to/participant_registration/venv/bin/gunicorn app:app
   
   [Install]
   WantedBy=multi-user.target
   ```

## 📧 Email Configuration

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password:**
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password
   - Use this password in `SMTP_PASSWORD`

3. **Update .env file:**
   ```
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USE_TLS=True
   ```

### Other Email Providers

- **Outlook/Hotmail:** `smtp-mail.outlook.com:587`
- **Yahoo:** `smtp.mail.yahoo.com:587`
- **Custom SMTP:** Use your organization's SMTP settings

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default `SECRET_KEY`
- [ ] Use strong, unique passwords
- [ ] Enable HTTPS (SSL/TLS)
- [ ] Set up proper firewall rules
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup data regularly

### Environment Variables Security

- Never commit `.env` files to version control
- Use strong, random `SECRET_KEY`
- Rotate passwords regularly
- Use environment-specific configurations

## 📊 Monitoring & Maintenance

### Health Checks

The application includes a health check endpoint:
```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00",
  "version": "2.0.0"
}
```

### Logging

- Application logs are stored in `logs/` directory
- Logs are automatically rotated (10MB max, 5 backups)
- Monitor logs for errors and security events

### Performance Monitoring

- Monitor response times
- Set up alerts for high error rates
- Monitor disk space for log files
- Track email delivery success rates

## 🐛 Troubleshooting

### Common Issues

1. **Email not sending:**
   - Check SMTP credentials
   - Verify firewall settings
   - Check email provider settings

2. **Application won't start:**
   - Check Python version (3.8+)
   - Verify all dependencies installed
   - Check port availability

3. **Excel files not generating:**
   - Check file permissions
   - Verify openpyxl installation
   - Check disk space

4. **CSRF errors:**
   - Ensure CSRF tokens are included in forms
   - Check session configuration

### Debug Mode

For development, enable debug mode:
```bash
export FLASK_DEBUG=True
python app.py
```

### Log Analysis

Check application logs:
```bash
tail -f logs/chai_app.log
```

## 📞 Support

For deployment issues:
- Check the logs first
- Review this documentation
- Create an issue on GitHub
- Contact: omodingisaac111@gmail.com

## 🔄 Updates

To update the application:

1. **Backup current version**
2. **Pull latest changes:**
   ```bash
   git pull origin main
   ```
3. **Update dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Restart application**
5. **Test functionality**

---

**Built with ❤️ for improving health systems in Uganda**
