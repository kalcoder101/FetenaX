# FetenaX Deployment Guide

Step-by-step instructions for deploying FetenaX to production.

## Prerequisites

- PHP 8.0+ with PDO MySQL extension
- MySQL 5.7+ or MariaDB 10.4+
- Web server (Apache or Nginx)
- SSL certificate (Let's Encrypt — free)

## Option A: InfinityFree (Free Shared Hosting)

1. **Sign up** at infinityfree.com
2. **Create account** — note your FTP credentials and MySQL details
3. **Create MySQL database** in cPanel → MySQL Databases
4. **Upload files**:
   - Use File Manager or FTP (FileZilla)
   - Upload all files to `htdocs/` directory
   - Make sure `.htaccess` is uploaded (enable "show hidden files" in File Manager)
5. **Configure database** — `db.php` already has InfinityFree defaults. If different, edit:
   ```php
   $host = 'sqlXXX.infinityfree.com';
   $user = 'if0_XXXXXX';
   $pass = 'your-password';
   $dbname = 'if0_XXXXXX_fetenax_db';
   ```
6. **Visit your site** — tables auto-create on first visit
7. **Log in** — `teacher@private.local` / `123456`
8. **Change passwords** immediately
9. **Enable SSL** — cPanel → SSL/TLS → Let's Encrypt

## Option B: VPS with Apache (Ubuntu 22.04+)

```bash
# 1. Install prerequisites
sudo apt update
sudo apt install apache2 php8.2 php8.2-mysql mysql-server certbot python3-certbot-apache

# 2. Clone/upload files
sudo mkdir -p /var/www/fetenax
sudo chown -R $USER:$USER /var/www/fetenax
# Copy all files to /var/www/fetenax/

# 3. Create MySQL database and user
sudo mysql
> CREATE DATABASE fetenax_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> CREATE USER 'fetenax'@'localhost' IDENTIFIED BY 'strong-password';
> GRANT ALL PRIVILEGES ON fetenax_db.* TO 'fetenax'@'localhost';
> FLUSH PRIVILEGES;
> EXIT;

# 4. Configure db.php
# Edit /var/www/fetenax/db.php with the MySQL credentials above

# 5. Set permissions
sudo chown -R www-data:www-data /var/www/fetenax
sudo chmod -R 755 /var/www/fetenax
sudo chmod 644 /var/www/fetenax/*.php

# 6. Configure Apache
sudo cp /var/www/fetenax/deploy/apache-fetenax.conf /etc/apache2/sites-available/fetenax.conf
sudo a2ensite fetenax
sudo a2enmod rewrite headers deflate expires
sudo systemctl reload apache2

# 7. Install SSL
sudo certbot --apache -d your-domain.com

# 8. Visit your site and verify
```

## Option C: VPS with Nginx (Ubuntu 22.04+)

```bash
# 1. Install prerequisites
sudo apt update
sudo apt install nginx php8.2-fpm php8.2-mysql mysql-server certbot python3-certbot-nginx

# 2. Clone/upload files (same as Apache step 2-5)

# 3. Configure Nginx
sudo cp /var/www/fetenax/deploy/nginx-fetenax.conf /etc/nginx/sites-available/fetenax
sudo ln -s /etc/nginx/sites-available/fetenax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Install SSL
sudo certbot --nginx -d your-domain.com
```

## Post-Deployment Checklist

- [ ] Site loads without errors
- [ ] Can log in as teacher and student
- [ ] Can create an exam with questions
- [ ] Can take an exam as a student
- [ ] Results page shows correctly
- [ ] Calendar tab shows events
- [ ] Notifications bell works
- [ ] Question Bank shows demo questions
- [ ] Class Groups can be created
- [ ] Access Codes tab shows codes
- [ ] CSV export downloads file
- [ ] PDF print works (Ctrl+P on results page)
- [ ] HTTPS is active (padlock icon)
- [ ] Demo passwords changed
- [ ] `ALLOW_SIGNUP` set to `false` (if needed)
- [ ] `DB_AUTO_MIGRATE` set to `false` (after initial setup)
- [ ] File permissions correct (644 files, 755 dirs)
- [ ] Daily database backups configured

## Security Hardening

To maintain high security when hosting FetenaX in a production environment:

1. **CSRF Protection:**
   The API validates custom session-bound tokens for all POST/authenticated actions. Ensure your theme and UI scripts properly initiate checking state (via `status` action) to obtain this token.
2. **Login Rate Limiting:**
   FetenaX automatically tracks failed login attempts by IP in the `login_attempts` table. If an IP exceeds 5 failed attempts, they will be blocked for 15 minutes. Ensure the `login_attempts` table is present (it auto-creates, or import `fetenax_schema.sql`).
3. **Secure Cookies:**
   Session cookies are configured with `HttpOnly`, `SameSite=Lax`, and `Secure` attributes. Because of the `Secure` attribute, **sessions will not function over unencrypted HTTP**. Make sure HTTP is redirected to HTTPS (which is default in the provided Apache/Nginx configs).

## Maintenance Mode

```bash
# Enable maintenance (returns 503 to all visitors)
php maintenance.php on

# Deploy new code...

# Disable maintenance
php maintenance.php off
```

## Troubleshooting

### 403 Forbidden
- Check file permissions (644 for files, 755 for directories)
- Ensure `.htaccess` is uploaded
- Check Apache error logs: `sudo tail -f /var/log/apache2/error.log`

### 500 Internal Server Error
- Check PHP error logs
- Ensure PHP PDO MySQL extension is installed
- Verify database credentials in `db.php`

### Database Connection Failed
- Verify MySQL host, port, username, password, database name
- For InfinityFree: use `sqlXXX.infinityfree.com` (not `localhost`)
- Test connection: `mysql -h HOST -u USER -p DATABASE`

### Blank White Page
- Enable error display temporarily: edit `index.php`, add `ini_set('display_errors', 1);`
- Check for PHP syntax errors: `php -l index.php`
- Check Apache/Nginx error logs
