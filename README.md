# 🚀 Sparklyn Infotech - Official Web Platform & Admin Portal

> **"From First Spark to Future Tech"**

A modern, high-performance corporate profile website and dynamic content management portal built for **Sparklyn Infotech**. 

---

## 🌟 Highlights & Features

### 1. 🎨 Public Corporate Profile (`/`)
- **Signature Brand Aesthetics**: Fiery neon amber & orange gradients matching the official **Sparklyn Infotech** flame logo.
- **Interactive Spark Particle Canvas**: Realistic floating embers and neon lighting effects in the hero section.
- **Company Showcase**:
  - Hero section with live statistics counters (Projects Delivered, Expert Engineers, Happy Clients, Satisfaction rate).
  - About Us with ISO Certification badge, Vision, and Mission.
  - Full-lifecycle Services showcase (Web Apps, Mobile Engineering, AI/ML, Cloud/DevOps, UI/UX, Cybersecurity).
- **Dynamic Portfolio Showcase**:
  - Filterable by category (Web Applications, Mobile Apps, AI & Cloud).
  - Case study modal with technology stack, client name, problem/solution breakdown, and live product demo links.
- **Dynamic Team & Users Showcase**:
  - Displays leadership and engineering specialists with department badges, bios, skills, and social links.
- **Client Inquiry & Proposal Form**:
  - Interactive contact form directly connected to the backend. Messages are saved in real-time to the Admin Inbox.

---

### 2. 🔐 Admin Control Portal (`/admin`)
- **Secure Authentication**:
  - Default Admin Email: `admin@sparklyn.com`
  - Default Admin Password: `sparklyn@2026` *(or `admin123`)*
  - One-click auto-fill demo credentials button for quick testing.
- **Dashboard Overview**:
  - Real-time KPIs (Total Projects, Total Team Members, Inbound Inquiries, Featured Portfolios).
  - Quick action shortcuts.
- **Project Management (Full CRUD)**:
  - Add New Projects with title, category, client, summary, full description, tech stack tags, status, and live URL.
  - **Direct File Upload**: Upload screenshots from computer or paste image URLs.
  - Edit existing projects.
  - Delete projects.
  - Toggle featured status to spotlight on the homepage.
- **Company Team & Users Management (Full CRUD)**:
  - Add company employees, engineers, and executives.
  - Upload avatar photos or specify image URLs.
  - Manage roles, departments, contact info, bios, and LinkedIn/GitHub links.
  - Edit or remove staff profiles.
- **Inquiries / Leads Inbox**:
  - Real-time list of client inquiries submitted via the website.
  - Update status (`New`, `In Review`, `Contacted`, `Closed`).
  - Delete inquiries.
- **Company Profile Settings**:
  - Edit Company Name, Tagline, Phone, Email, Office Address, Vision, Mission, and Stat counters.
  - Changes instantly update across the public website!

---

## 📁 Project Structure

```
sparklyn-infotech/
├── package.json               # Dependencies and scripts
├── server.js                  # Express backend & REST APIs
├── start-server.bat           # Double-click Windows launcher
├── data/
│   └── db.json                # Persistent JSON database (Projects, Users, Profile, Inquiries)
├── uploads/                   # Uploaded images (projects & avatar photos)
└── public/
    ├── assets/
    │   └── logo.png           # Sparklyn Infotech brand logo
    ├── css/
    │   ├── style.css          # Main corporate design stylesheet
    │   └── admin.css          # Admin portal stylesheet
    ├── js/
    │   ├── main.js            # Public site interactivity & particle engine
    │   └── admin.js           # Admin portal logic & API calls
    ├── index.html             # Public corporate profile website
    └── admin.html             # Admin management console
```

---

## ⚡ How to Run

### Method 1: Double Click (Local Development)
Double-click `start-server.bat`.

### Method 2: Command Line (Local Development)
```powershell
npm install
npm start
```

### URLs
- **Public Profile Website**: [http://localhost:3000](http://localhost:3000)
- **Admin Management Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Official PDF Company Profile**: [http://localhost:3000/company-profile.html](http://localhost:3000/company-profile.html)

---

## 🌐 Deploy to Netlify

This project is pre-configured for seamless 1-click deployment on Netlify (`netlify.toml` and `public/_redirects` included).

1. Push this repository to GitHub.
2. In Netlify, click **"Add new site"** > **"Import an existing project"** > Choose **GitHub**.
3. Select `Sparklyn-Infotech`.
4. Netlify will auto-detect settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `public`
5. Click **"Deploy Site"** — Your website is live in seconds!

---

## 🔑 Default Admin Login
| Field | Value |
|---|---|
| **URL** | `/admin` |
| **Email** | `admin@sparklyn.com` |
| **Password** | `sparklyn@2026` *(or `admin123`)* |

