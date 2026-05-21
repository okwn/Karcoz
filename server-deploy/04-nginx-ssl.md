# Nginx SSL/TLS Setup

## Prerequisites

- Domain A record pointing to server IP
- Port 80 and 443 open in firewall
- Nginx installed and running: `sudo systemctl status nginx`
- Nginx config deployed: `sudo nginx -t`

## Get TLS certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
1. Prove ownership via ACME HTTP challenge (port 80)
2. Issue a certificate for your domain
3. **Automatically modify** `/etc/nginx/sites-available/karcoz` to add the HTTPS server block and configure TLS

Follow the interactive prompts:
- Email: `admin@yourdomain.com`
- Agree to Terms of Service: `yes`
- Redirect HTTP to HTTPS: `yes`

## After Certbot completes

Certbot writes certificates to:
```
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

It also updates the nginx config to include the HTTPS block with TLS settings.

**Update nginx config with your domain:**

```bash
# Edit the server block in the deployed config
sudo nano /etc/nginx/sites-available/karcoz

# Find "server_name yourdomain.com;" and replace with your actual domain
sudo sed -i 's/yourdomain.com/yourdomain.com/g' /etc/nginx/sites-available/karcoz

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Verify HTTPS is working

```bash
curl -I https://yourdomain.com/health
```

Expected: `HTTP/2 200` with security headers present.

## Check security headers

```bash
curl -sI https://yourdomain.com | grep -E "X-Frame|X-Content|Strict-Transport"
```

Expected output:
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=... (if HSTS is enabled)
```

## Auto-renewal

Let's Encrypt certificates expire after 90 days. Certbot sets up a systemd timer to renew automatically.

**Verify the renewal timer is active:**
```bash
sudo systemctl list-timers | grep certbot
```

Expected: A timer showing `certbot.timer` with a next run time.

**Test renewal (dry run):**
```bash
sudo certbot renew --dry-run
```

Expected: `The dry run was successful`

**For HSTS:** After confirming HTTPS works correctly for several days, you can enable HSTS by uncommenting the `add_header Strict-Transport-Security` line in the nginx config. HSTS tells browsers to only connect via HTTPS for the specified duration.

## Manual SSL config (if certbot didn't auto-configure)

If certbot fails, edit `/etc/nginx/sites-available/karcoz` and ensure the HTTPS server block is uncommented with your domain:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ...
}
```

Then:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## TLS Configuration in karcoz.conf

The deployed nginx config uses these TLS settings:

```
ssl_protocols TLSv1.2 TLSv1.3
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384
ssl_prefer_server_ciphers off
ssl_session_cache shared:SSL:10m
ssl_session_timeout 1d
```

These settings are compatible with modern browsers (Chrome, Firefox, Safari) and exclude known-weak ciphers.

## Renewal Cron Job

Certbot renews automatically via systemd timer (not cron). To check:

```bash
# View timer status
sudo systemctl status certbot.timer

# View next scheduled run
sudo systemctl list-timers certbot.service

# Manual renewal
sudo certbot renew
```

If certificates are due for renewal, `certbot renew` will update them and `sudo systemctl reload nginx` will pick up the new cert automatically.