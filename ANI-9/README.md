# Ani — Agricultural Navigation and Yield Activity Tracker

Ani is a PHP/MySQL web application for tracking rice plots, plantings, watering and farm tasks,
harvest records, seed & farm supplies inventory, farm finances, calendar dates, and comprehensive **Administrator Management**.
It includes a built-in chat assistant ("Ask Ani") on every page.

## Project Structure

```text
aniADMIN/
├── index.html              smart redirect (Admin Portal, User Dashboard, or Landing Page)
├── landing.html            welcome and onboarding page
├── landing.css             landing page styling
├── config.php              session, database connection, global error handler, JSON helpers
├── config.local.example.php  copy to config.local.php for custom database password / API key
├── aniyatrack.sql          database schema, auto-migrations + starter sample data & admin
├── .gitignore              ignores local secrets and temp files
├── .htaccess               prevents direct browser access to sensitive files
│
├── Admin/                  ADMIN PORTAL (built according to the Admin Flowchart)
│   ├── index.html          admin dashboard UI & management modules
│   ├── admin.js            tab routing, CRUD, export reports, backup logic
│   ├── admin.css           admin layout & styling
│   ├── get_admin_data.php  admin dashboard analytics & summary metrics
│   ├── users.php           user accounts CRUD (add, edit, activate/deactivate, reset pass)
│   ├── reports.php         financial reports data & Excel (CSV) export engine
│   ├── backup.php          one-click .sql database backup generator & downloader
│   └── logs.php            system activity audit trail manager
│
├── assets/                 code shared across modules
│   ├── css/
│   │   ├── base.css        reset, colours, typography, page defaults
│   │   ├── layout.css      sidebar, main area, page header, responsive styles
│   │   └── components.css  cards, forms, buttons, tables, badges, toast
│   ├── js/
│   │   ├── core.js         api(), post(), toast(), templates, date helpers
│   │   └── layout.js       sidebar loader, active link highlighter, logout
│   └── images/             graphics and illustration assets
├── partials/
│   └── sidebar.html        the navigation menu markup (shared by all pages)
│
├── Auth/                   login.html, register.html, auth.js, auth.css + PHP backend
├── Dashboard/              index.html, dashboard.js, dashboard.css + PHP backend
├── Plots/                  plots.html, plots.js, plots.css + PHP backend
├── Tasks/                  watering.html, watering.js, watering.css + PHP backend
├── Inventory/              inventory.html, inventory.js (tabs), seeds.js, harvest.js + PHP
├── Finance/                finance.html, finance.js, finance.css + PHP backend
├── Calendar/               calendar.html, calendar.js, calendar.css + PHP backend
└── Chat/                   chat-widget.html, chat.js, chat.css, chat.php
```

---

## Default Accounts

When you import `aniyatrack.sql`, the following default accounts are available:

| Account Type | Username | Password | Default Redirect |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | **Admin Dashboard** (`Admin/index.html`) |
| **Regular User** | `farmer1` | `admin123` | **Farmer Dashboard** (`Dashboard/index.html`) |

> You can also register new accounts at `Auth/register.html`. Newly registered accounts default to the `user` (farmer) role and can be promoted to `admin` inside the **User Management** panel.

---

## Step-by-Step XAMPP Setup Guide

### 1. Place the Project in XAMPP
Make sure this project folder is located inside your XAMPP web directory:
```text
C:\xampp\htdocs\aniADMIN
```

### 2. Start Apache and MySQL
1. Open the **XAMPP Control Panel** (`C:\xampp\xampp-control.exe`).
2. Click **Start** next to **Apache** (status turns green).
3. Click **Start** next to **MySQL** (status turns green).

### 3. Import the Database in phpMyAdmin
1. Open your web browser and navigate to:
   [http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)
2. Click on the **Import** tab at the top.
3. Click **Choose File** (or "Browse...").
4. Select `C:\xampp\htdocs\aniADMIN\aniyatrack.sql`.
5. Scroll down and click **Import** (or **Go**).
6. phpMyAdmin will execute the script, setting up tables, role/status columns, activity audit logging, and starter sample records.

### 4. Database Password Configuration (If Applicable)
By default, XAMPP's MySQL `root` user has **no password**. If you have set a MySQL root password:
1. Copy `config.local.example.php` to a new file named `config.local.php`.
2. Open `config.local.php` in a text editor and set:
   ```php
   <?php
   $pass = 'your-mysql-password';
   ```

### 5. Open the Web Application
1. In your browser, open:
   [http://localhost/aniADMIN/](http://localhost/aniADMIN/)
2. Log in using the **Admin** credentials:
   - Username: `admin`
   - Password: `admin123`
3. The system will detect your `admin` role and redirect you directly to the **Administrator Dashboard**!

---

## Admin Portal Modules (Flowchart Compliance)

1. **Dashboard Overview**: System-wide KPI metrics (Total Users, Plots, Pending Tasks, Yields, Finances) and recent activity logs.
2. **Calendar**: Monthly schedule overview of tasks, plantings, and harvest dates with add/delete task actions.
3. **Plot Management**: View, add, plant, and delete rice plots across the farm.
4. **Task Management**: Schedule and track all task types (Water, Fertilize, Weed, Pest Control, Inspect, Other) with complete/reopen actions.
5. **Crop & Inventory Management**: Monitor seed reserves with low-stock warnings and log harvest yields.
6. **Income & Expense / Reports**:
   - Filter transactions by type, date range, or plot.
   - **Excel Export**: Click "Export to Excel" to download a clean `.csv` file formatted for Microsoft Excel.
   - **Print / PDF**: Click "Print / PDF" to print or save the report as PDF.
7. **User Management**:
   - View all registered accounts.
   - Add new user accounts directly.
   - Edit user profile details and change roles (`admin` or `user`).
   - Deactivate or activate accounts with one click.
   - Reset user passwords.
8. **System Maintenance**:
   - **Backup Database**: Click "Download Database Backup (.sql)" to generate an immediate `.sql` file backup of all tables and data.
   - **Audit Logs**: View real-time security logs of user logins, admin changes, backups, and data updates.
