# FetenaX — Your Exam, Your Vibe

A modern, secure, mobile-first exam platform for students and teachers. Built with PHP 8, MySQL, and vanilla JavaScript.

## Features

- **Exam Taking**: Timed exams, autosave, question flagging, anti-cheat protection
- **Question Bank**: Reusable questions with subject/difficulty filters
- **Analytics**: Per-exam and per-question stats, score distributions, pass rates
- **Class Groups**: Organize students, restrict exam access by group
- **Access Codes**: Per-exam password protection with auto-generate
- **Badges**: Achievement system (first pass, perfect score, streaks)
- **Calendar**: Visual month view with exam schedules and attempt history
- **Notifications**: In-app bell with unread badge
- **Bulk Import**: CSV import for students and exam questions
- **Practice Mode**: Retake exams with instant feedback (no timer)
- **Leaderboard**: Per-exam and overall rankings
- **PDF Export**: Print-friendly score reports
- **Dark/Light Theme**: Auto-detects OS preference + manual toggle

## Quick Start

### Requirements
- PHP 8.0+ with PDO MySQL extension
- MySQL 5.7+ or MariaDB 10.4+
- HTTPS certificate (Let's Encrypt recommended)

### Installation

1. **Clone or download** the project files
2. **Configure database** — edit `db.php` or create a `.env` file:
   ```
   DB_HOST=your-mysql-host
   DB_PORT=3306
   DB_USER=your-username
   DB_PASS=your-password
   DB_NAME=your-database
   ```
3. **Upload** all files to your web server's document root
4. **Visit** your site URL — `db.php` auto-creates tables and seeds demo data
5. **Log in** with demo credentials:
   - Teacher: `teacher@private.local` / `123456`
   - Student: `student@demo.com` / `password123`
6. **Change demo passwords** immediately after testing

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `production` to enable production mode |
| `ALLOW_SIGNUP` | `true` | `false` to disable public student signup |
| `DB_AUTO_MIGRATE` | `true` | `false` to skip schema/seed on every request |
| `DB_HOST` | `sql208.infinityfree.com` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `if0_42279707` | MySQL username |
| `DB_PASS` | — | MySQL password |
| `DB_NAME` | `if0_42279707_fetenax_db` | MySQL database name |

## Production Deployment

### Option A: Shared Hosting (InfinityFree, Hostinger)
1. Upload files via cPanel File Manager or FTP
2. Create MySQL database via cPanel
3. Update `db.php` with your database credentials
4. Enable SSL in cPanel (Let's Encrypt)
5. Set `ALLOW_SIGNUP=false` and `DB_AUTO_MIGRATE=false` in `.env` or via cPanel

### Option B: VPS with Apache
See `deploy/apache-fetenax.conf` for virtual host configuration.

### Option C: VPS with Nginx
See `deploy/nginx-fetenax.conf` for server block configuration.

### Maintenance Mode
```bash
php maintenance.php on    # Enable (returns 503)
php maintenance.php off   # Disable
php maintenance.php status # Check status
```

## Security Checklist

- [ ] Change all demo passwords
- [ ] Set `ALLOW_SIGNUP=false` in production
- [ ] Set `DB_AUTO_MIGRATE=false` after initial setup
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Set file permissions: 644 for files, 755 for directories
- [ ] Create dedicated MySQL user with limited privileges
- [ ] Set up automated daily database backups

## Developer

Developed by [kalcoder101](https://github.com/kalcoder101). All rights reserved © 2025.
