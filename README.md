# 🏥 CHAI Health Systems Management Portal

A comprehensive, secure web-based platform for health program management in Uganda, featuring participant registration and facility assessment tools with automated Excel reporting and email notifications.



## 🌟 Features## 🌟 Features



### Two Integrated Modules:- ✅ Add multiple participants with detailed information

- ✅ Export to professionally formatted Excel files

### 📋 **1. Participant Registration System**- ✅ Email Excel reports automatically

- ✅ Batch participant registration for trainings and programs- ✅ Clean, responsive web interface

- ✅ Mobile Money account tracking for disbursements  - ✅ Table view of registered participants

- ✅ District and facility-based organization- ✅ Delete/edit functionality

- ✅ Real-time data validation- ✅ Works on desktop and mobile browsers

- ✅ Automated Excel report generation

- ✅ Email notifications with attachments## 📊 Data Fields



### 📊 **2. Facility Assessment Tools**- Participant's Name

- ✅ Multi-section comprehensive assessments- Cadre (e.g., Nurse, Doctor, CHW)

- ✅ Indicator-based scoring system (0-5 scale)- Duty Station (Facility)

- ✅ Six assessment categories:- District

  - Service Delivery- Mobile Number Registered

  - Human Resources for Health- Names Registered on Mobile Money

  - Supply Chain Management

  - Data Management & Use## 🚀 Quick Start

  - Quality Improvement

  - Infrastructure & Equipment### Local Development

- ✅ Automatic performance calculations

- ✅ Gap analysis and action plan generation1. **Clone the repository:**

- ✅ Three-sheet Excel reports (Summary, Details, Action Plan)   ```bash

- ✅ Color-coded performance visualization   git clone https://github.com/Isaac25-lgtm/CHAI.git

   cd CHAI

## 🎯 Use Cases   ```



- **PMTCT mentorship registration**2. **Create virtual environment:**

- **Health facility performance assessments**   ```bash

- **Training participant management**   python -m venv venv

- **Quality improvement tracking**   ```

- **Health system strengthening monitoring**

- **Mobile money disbursement tracking**3. **Activate virtual environment:**

- **Facility readiness assessments**   - Windows: `.\venv\Scripts\Activate.ps1`

   - Linux/Mac: `source venv/bin/activate`

## 📊 Assessment Scoring Criteria

4. **Install dependencies:**

| Score | Performance Level | Description |   ```bash

|-------|------------------|-------------|   pip install -r requirements.txt

| 5 | Excellent | Fully meets standards, best practices observed |   ```

| 4 | Good | Meets most standards with minor gaps |

| 3 | Satisfactory | Meets basic standards with some gaps |5. **Run the application:**

| 2 | Needs Improvement | Significant gaps identified |   ```bash

| 1 | Poor | Major deficiencies requiring urgent attention |   python app.py

| 0 | N/A | Not Applicable/Not Assessed |   ```



## 🚀 Quick Start6. **Open browser:**

   Navigate to `http://127.0.0.1:5000`

### Local Development

## 📦 Deployment

1. **Clone the repository:**

   ```bash### Deploy to Render.com (Free)

   git clone https://github.com/Isaac25-lgtm/CHAI.git

   cd CHAI1. Fork this repository

   ```2. Sign up at [render.com](https://render.com)

3. New Web Service → Connect your GitHub repo

2. **Create virtual environment:**4. Settings:

   ```bash   - **Build Command:** `pip install -r requirements.txt`

   python -m venv venv   - **Start Command:** `gunicorn app:app`

   ```5. Deploy!



3. **Activate virtual environment:**### Deploy to Heroku

   - Windows: `.\venv\Scripts\Activate.ps1`

   - Linux/Mac: `source venv/bin/activate````bash

heroku create your-app-name

4. **Install dependencies:**git push heroku main

   ```bash```

   pip install -r requirements.txt

   ```### Deploy to PythonAnywhere



5. **Run the application:**1. Upload files to PythonAnywhere

   ```bash2. Set up web app with WSGI configuration

   python app.py3. Configure virtual environment

   ```

## 📧 Email Configuration

6. **Access the portal:**

   Navigate to `http://127.0.0.1:5000`To enable email functionality:



## 📦 Deployment Options1. Edit `app.py` lines 29-32:

   ```python

### Deploy to Render.com (Recommended - Free)   SMTP_USERNAME = "your-email@gmail.com"

   SMTP_PASSWORD = "your-app-password"

1. Fork this repository   ```

2. Sign up at [render.com](https://render.com)

3. New Web Service → Connect your GitHub repo2. For Gmail, create an App Password:

4. Configuration:   - Go to Google Account → Security

   - **Build Command:** `pip install -r requirements.txt`   - Enable 2-Step Verification

   - **Start Command:** `gunicorn app:app`   - Generate App Password

5. Deploy!   - Use that password in `SMTP_PASSWORD`



### Deploy to Heroku## 🔗 ODK Integration



```bashThis app can be integrated with ODK Collect:

heroku create chai-health-portal

git push heroku main1. Deploy the app online (see deployment options above)

```2. In your ODK form, add a web link question:

   ```

### Deploy to PythonAnywhere   https://your-app.onrender.com

   ```

1. Upload files to PythonAnywhere3. Data collectors can click the link from ODK to register participants

2. Set up web app with WSGI configuration

3. Configure virtual environment## 🖥️ Windows Executable

4. Set environment variables

A standalone Windows executable is available:

## 📧 Email Configuration

1. Download from releases

To enable automated email reporting:2. No installation required

3. Double-click to run

1. Edit `app.py` lines 29-32:4. Browser opens automatically

   ```python

   RECIPIENT_EMAIL = "your-team@organization.org"## 📱 Progressive Web App (PWA)

   SMTP_USERNAME = "your-email@gmail.com"

   SMTP_PASSWORD = "your-app-password"The app can be installed as a mobile app:

   ```

1. Open in Chrome/Safari

2. For Gmail:2. Click "Install" or "Add to Home Screen"

   - Enable 2-Step Verification3. Works offline with cached data

   - Generate App Password

   - Use App Password in configuration## 🛠️ Technology Stack



## 📱 Mobile Access- **Backend:** Flask (Python)

- **Frontend:** HTML, CSS, JavaScript

The portal is fully responsive and works on:- **Excel Generation:** openpyxl

- Tablets for field data collection- **Email:** SMTP (Gmail compatible)

- Smartphones for quick registrations- **Deployment:** Gunicorn, compatible with major cloud platforms

- Laptops/Desktops for comprehensive assessments

## 📄 Requirements

Can be installed as a Progressive Web App (PWA):

1. Open in Chrome/Safari- Python 3.11+

2. Click "Install" or "Add to Home Screen"- Flask 3.0.0

3. Works offline with cached data- openpyxl 3.1.2

- gunicorn 21.2.0

## 📈 Generated Reports

## 🤝 Contributing

### Participant Registration Excel:

- Formatted participant listContributions are welcome! Please:

- All required columns for finance processing

- Mobile Money details for disbursements1. Fork the repository

2. Create a feature branch

### Assessment Report Excel (3 sheets):3. Commit your changes

1. **Summary Dashboard**4. Push to the branch

   - Facility information5. Open a Pull Request

   - Section-wise performance

   - Overall scores and percentages## 📞 Support

   - Key gaps identified

For issues or questions:

2. **Detailed Indicator Scores**- Email: omodingisaac111@gmail.com

   - Individual indicator assessments- GitHub Issues: [Create an issue](https://github.com/Isaac25-lgtm/CHAI/issues)

   - Comments and observations

   - Performance percentages## 📝 License

   - Color-coded results

MIT License - feel free to use and modify

3. **Action Plan Template**

   - Priority-ranked improvements## 🎯 Use Cases

   - Gap-based recommendations

   - Space for responsible persons and timelines- Health worker registration

   - Resource requirements- Training participant tracking

- Mobile money enrollment

## 🏗️ Project Structure- Field data collection

- Event registration

```- Survey data capture

CHAI/

├── app.py                 # Flask application with both modules---

├── templates/

│   ├── index.html        # Main portal landing page**Built with ❤️ for data collection and participant management**

│   ├── registration.html # Participant registration interface
│   └── tools.html        # Assessment tools interface
├── static/               # CSS, JS, images (if any)
├── requirements.txt      # Python dependencies
├── README.md            # This file
└── runtime.txt          # Python version specification
```

## 🛠️ Technology Stack

- **Backend:** Flask 3.0.0 (Python)
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Excel Generation:** openpyxl 3.1.2
- **Email:** SMTP with attachment support
- **Deployment:** Gunicorn WSGI server
- **Database:** In-memory (stateless)

## 📊 Indicators Assessed

### Service Delivery
- ART service availability
- PMTCT integration
- Pediatric HIV services
- TB/HIV collaborative activities
- Laboratory services functionality

### Human Resources
- Staffing levels adequacy
- Staff trained on HIV guidelines
- Mentorship programs
- Performance management

### Supply Chain
- ARV stock availability
- Test kit availability
- Stock management practices
- Cold chain functionality
- Ordering and reporting timeliness

### Data Management
- Data quality and completeness
- HMIS reporting timeliness
- Data use for decision making
- Patient tracking systems

### Quality Improvement
- QI committees functionality
- Clinical audits conducted
- Client satisfaction mechanisms
- Continuous improvement plans

### Infrastructure
- Facility physical condition
- Essential equipment availability
- Power supply reliability
- Water and sanitation

## 📁 Implementation Steps

### 1. **Create Templates Folder**
```bash
mkdir templates
```

### 2. **Save HTML Files**
- Save `index.html` in the `templates/` folder
- Save `registration.html` in the `templates/` folder  
- Save `tools.html` in the `templates/` folder

### 3. **Replace app.py**
- Backup your current `app.py`: `cp app.py app_backup.py`
- Replace with the enhanced version provided

### 4. **Test Locally**
```bash
python app.py
```
- Navigate to `http://127.0.0.1:5000`
- You should see the main portal with two module options

### 5. **Deploy to Render**
```bash
git add .
git commit -m "Add Assessment Tools module"
git push origin main
```

## 🔍 Quick Verification Checklist

- [ ] `templates/` folder created
- [ ] All 3 HTML files in templates folder
- [ ] app.py updated with new routes and functions
- [ ] Application runs locally without errors
- [ ] Both Registration and Tools modules accessible
- [ ] Excel reports generate correctly

## 🚀 Available Routes

| Route | Purpose | Method |
|-------|---------|--------|
| `/` | Main portal landing page | GET |
| `/registration` | Participant registration page | GET |
| `/tools` | Assessment tools page | GET |
| `/submit` | Submit participant data | POST |
| `/submit-assessment` | Submit assessment data | POST |
| `/download` | Download participant Excel | POST |
| `/download-assessment` | Download assessment Excel | POST |

## 🎨 Customization Options

### To modify assessment indicators:
Edit the `TOOL_SECTIONS` dictionary in `app.py` (lines 35-94)

### To change scoring criteria:
Edit the `SCORING_CRITERIA` dictionary in `app.py` (lines 97-104)

### To modify districts:
Update the district options in both HTML files

### To change email recipient:
Update `RECIPIENT_EMAIL` in `app.py` (line 27)

## 🐛 Troubleshooting

**Template not found error:**
- Ensure templates folder exists
- Check HTML files are in templates/ folder
- Verify file names match exactly

**Import errors:**
- Run `pip install -r requirements.txt`
- Ensure virtual environment is activated

**Email not sending:**
- Update SMTP credentials in app.py
- Check firewall/network settings
- Verify app password for Gmail

## 🔄 Updates & Version History

- **v2.0.0** - Added comprehensive Assessment Tools module
- **v1.5.0** - Enhanced Excel formatting and email functionality
- **v1.0.0** - Initial participant registration system

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

## 📞 Support

For issues, questions, or suggestions:
- **Email:** omodingisaac111@gmail.com
- **GitHub Issues:** [Create an issue](https://github.com/Isaac25-lgtm/CHAI/issues)

## 🏥 Partner Organizations

- CHAI (Clinton Health Access Initiative)
- Ministry of Health Uganda
- District Health Offices - Acholi Sub Region

## 📄 License

MIT License - free to use and modify for health system strengthening initiatives

---

**Built with ❤️ for improving health systems in Uganda**

*Supporting PMTCT, HIV/AIDS programs, and health facility quality improvement across the Acholi Sub Region*
