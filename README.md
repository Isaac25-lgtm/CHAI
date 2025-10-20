# 📋 Participant Registration System

A web-based application for registering participants and exporting data to Excel with email functionality.

## 🌟 Features

- ✅ Add multiple participants with detailed information
- ✅ Export to professionally formatted Excel files
- ✅ Email Excel reports automatically
- ✅ Clean, responsive web interface
- ✅ Table view of registered participants
- ✅ Delete/edit functionality
- ✅ Works on desktop and mobile browsers

## 📊 Data Fields

- Participant's Name
- Cadre (e.g., Nurse, Doctor, CHW)
- Duty Station (Facility)
- District
- Mobile Number Registered
- Names Registered on Mobile Money

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Isaac25-lgtm/CHAI.git
   cd CHAI
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows: `.\venv\Scripts\Activate.ps1`
   - Linux/Mac: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the application:**
   ```bash
   python app.py
   ```

6. **Open browser:**
   Navigate to `http://127.0.0.1:5000`

## 📦 Deployment

### Deploy to Render.com (Free)

1. Fork this repository
2. Sign up at [render.com](https://render.com)
3. New Web Service → Connect your GitHub repo
4. Settings:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. Deploy!

### Deploy to Heroku

```bash
heroku create your-app-name
git push heroku main
```

### Deploy to PythonAnywhere

1. Upload files to PythonAnywhere
2. Set up web app with WSGI configuration
3. Configure virtual environment

## 📧 Email Configuration

To enable email functionality:

1. Edit `app.py` lines 29-32:
   ```python
   SMTP_USERNAME = "your-email@gmail.com"
   SMTP_PASSWORD = "your-app-password"
   ```

2. For Gmail, create an App Password:
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password
   - Use that password in `SMTP_PASSWORD`

## 🔗 ODK Integration

This app can be integrated with ODK Collect:

1. Deploy the app online (see deployment options above)
2. In your ODK form, add a web link question:
   ```
   https://your-app.onrender.com
   ```
3. Data collectors can click the link from ODK to register participants

## 🖥️ Windows Executable

A standalone Windows executable is available:

1. Download from releases
2. No installation required
3. Double-click to run
4. Browser opens automatically

## 📱 Progressive Web App (PWA)

The app can be installed as a mobile app:

1. Open in Chrome/Safari
2. Click "Install" or "Add to Home Screen"
3. Works offline with cached data

## 🛠️ Technology Stack

- **Backend:** Flask (Python)
- **Frontend:** HTML, CSS, JavaScript
- **Excel Generation:** openpyxl
- **Email:** SMTP (Gmail compatible)
- **Deployment:** Gunicorn, compatible with major cloud platforms

## 📄 Requirements

- Python 3.11+
- Flask 3.0.0
- openpyxl 3.1.2
- gunicorn 21.2.0

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions:
- Email: omodingisaac111@gmail.com
- GitHub Issues: [Create an issue](https://github.com/Isaac25-lgtm/CHAI/issues)

## 📝 License

MIT License - feel free to use and modify

## 🎯 Use Cases

- Health worker registration
- Training participant tracking
- Mobile money enrollment
- Field data collection
- Event registration
- Survey data capture

---

**Built with ❤️ for data collection and participant management**
