# Campaign Attendance Registration System

A streamlined Flask application for campaign attendance registration with powerful admin filtering and download capabilities.

## 🎯 Features

### Participant Side
- ✅ Simple registration form (no login required)
- ✅ **24-hour submission tracking** - See your recent submissions on the device you used
- ✅ Prevents accidental duplicate registrations
- ✅ Mobile-responsive design
- ✅ Success confirmation page

### Admin Side
- ✅ Secure login system
- ✅ **Filter by Date Ranges** - View data from specific periods
- ✅ **Filter by District** - Focus on specific regions
- ✅ **Download filtered CSV** - Export only what you need
- ✅ Search by name or phone number
- ✅ Real-time statistics (total, today's, filtered count)
- ✅ Delete individual submissions
- ✅ Clear all data option

## 🗂️ Project Structure

```
campaign-registration/
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── runtime.txt                     # Python version
├── render.yaml                     # Render deployment config
├── .gitignore                      # Git ignore file
├── README.md                       # Documentation
├── campaign_data.db               # SQLite database (auto-created)
└── templates/
    ├── registration.html          # Participant registration form
    ├── success.html               # Success confirmation page
    ├── admin_login.html           # Admin login page
    └── admin_dashboard.html       # Admin dashboard with filters
```

## 🚀 Setup & Run Locally

1. **Install dependencies:**

```bash
pip install -r requirements.txt
```

2. **Run the application:**

```bash
python app.py
```

3. **Access the application:**

- Registration form: http://localhost:5000/
- Admin login: http://localhost:5000/admin/login

## 🔐 Default Admin Credentials

**⚠️ IMPORTANT: Change these in production!**

- Username: `admin`
- Password: `admin123`

To change credentials, edit these lines in `app.py`:

```python
ADMIN_USERNAME = 'your_new_username'
ADMIN_PASSWORD = 'your_new_password'
```

## ☁️ Deploy to Render (via GitHub)

### Step 1: Create templates folder

Create a `templates/` folder and add the 4 HTML files:

- `registration.html`
- `success.html`
- `admin_login.html`
- `admin_dashboard.html`

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Campaign attendance registration system"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

### Step 3: Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Render will auto-detect `render.yaml`
5. Click **Create Web Service**

### Step 4: Environment Variables (Optional)

For better security, set admin credentials as environment variables in Render:

1. Go to your service settings
2. Add environment variables:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SECRET_KEY`

Then update `app.py` to read from environment:

```python
import os

ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
```

## 📱 Usage Guide

### For Participants

1. Visit the homepage
2. Check "Your Recent Submissions" (if you submitted within 24 hours on this device)
3. Fill out the registration form
4. Click "Submit Registration"
5. See success confirmation

**Note:** Your submissions are visible only on the device you used for 24 hours, helping prevent duplicate entries.

### For Admins

#### Viewing Data
1. Visit `/admin/login`
2. Enter credentials
3. View all registrations in dashboard

#### Filtering Data
Use the filter section to narrow down results:

- **By District** - Select specific district
- **By Date Range** - Set start and end dates
- **By Search** - Find specific participants by name/phone

#### Downloading Data
1. Apply filters (optional)
2. Click **"Download Filtered CSV"**
3. File is named with filters applied (e.g., `campaign_registrations_Gulu_2024-01-01_to_2024-01-31.csv`)

#### Managing Data
- **Delete Individual Entry** - Click "Delete" button on any row
- **Clear All Data** - Use with caution, deletes everything permanently

## 📊 Data Fields Collected

- Full Name
- Phone Number
- District (Acholi sub-region districts)
- Gender
- Age
- Campaign Type
- Additional Notes (optional)
- Submission Timestamp (auto-generated)

## 🏥 Pre-configured Campaign Types

- PMTCT Mentorship
- Mobile Money Enrollment
- Health Education
- Immunization
- Malaria Prevention
- Other

*Edit the dropdown in `registration.html` to customize campaign types.*

## 🗺️ Pre-configured Districts (Acholi Sub-region)

- Gulu
- Kitgum
- Pader
- Lamwo
- Agago
- Amuru
- Nwoya
- Omoro
- Other

*Edit the dropdown in `registration.html` to add more districts.*

## 🔍 Admin Filter Examples

**Example 1: Download all January 2024 registrations**

- Date From: `2024-01-01`
- Date To: `2024-01-31`
- Click "Download Filtered CSV"

**Example 2: View Gulu district only**

- District: `Gulu`
- Click "Apply Filters"

**Example 3: PMTCT campaign in Kitgum for Q1 2024**

- District: `Kitgum`
- Date From: `2024-01-01`
- Date To: `2024-03-31`
- Click "Apply Filters"
- Download if needed

## 💾 Database

- Uses SQLite (file-based database)
- Automatically created on first run
- Stores all registration data
- Database file: `campaign_data.db`

## 🔒 Security Notes

**Before deploying to production:**

1. ✅ Change admin credentials
2. ✅ Update `SECRET_KEY` in app.py
3. ✅ Use environment variables for sensitive data
4. ✅ Enable HTTPS (Render does this automatically)
5. ✅ Regularly backup the database

## 🛠️ Customization Ideas

**Easy changes:**

- Add more form fields
- Change color schemes in CSS
- Add email notifications
- Add more districts/campaign types
- Export to Excel format
- Create data visualizations
- Add multiple admin user roles

## 🐛 Troubleshooting

**Issue: Database not found**

- Database is auto-created on first run. Just start the app once.

**Issue: Templates not found**

- Ensure all HTML files are in `templates/` folder

**Issue: Can't login to admin**

- Check credentials in `app.py`
- Clear browser cookies and try again

**Issue: 24-hour tracking not working**

- Ensure browser allows storage
- Check browser console for errors

**Issue: Downloads show all data instead of filtered**

- Ensure you clicked "Download Filtered CSV" button
- Check that filters are applied before downloading

## 🔄 Health Check

- Endpoint: `/healthz`
- Response: `{"status": "ok"}`
- Used by Render for uptime monitoring

## 📞 Support

For issues or questions:

- Check Render deployment logs
- Verify all files are in correct folders
- Ensure requirements.txt is up to date

---

**Repository:** [github.com/Isaac25-lgtm/CHAI](https://github.com/Isaac25-lgtm/CHAI)

**Built with:** Flask, SQLAlchemy, SQLite, Persistent Storage API
