# Environment Setup

## 1. Clone the repository

```bash
cd /opt
sudo git clone https://github.com/your-org/karcoz.git karcoz
sudo chown -R $USER:$USER karcoz
cd karcoz
```

## 2. Create environment file

```bash
cp infra/docker/.env.example .env
nano .env  # fill in all values
```

**Required `.env` values (production):**

```bash
# Database
DB_PASSWORD=your_strong_db_password_here

# Session (minimum 32 characters)
SESSION_SECRET=$(openssl rand -base64 32)

# Application (use your actual domain)
MAGIC_LINK_BASE_URL=https://yourdomain.com
APP_BASE_URL=https://yourdomain.com

# Redis
REDIS_PASSWORD=your_strong_redis_password_here
# REDIS_URL will be: redis://:${REDIS_PASSWORD}@redis:6379/0

# Telegram (get from @BotFather — leave blank to disable bot)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# AI (set to mock for testing, openai/openrouter for real AI)
AI_PROVIDER=mock
```

**Generate strong passwords:**
```bash
openssl rand -base64 32   # for SESSION_SECRET
openssl rand -base64 24   # for DB_PASSWORD and REDIS_PASSWORD
```

## 3. Validate docker compose configuration

```bash
docker compose -f infra/docker/docker-compose.prod.yml config --quiet
```

No errors = configuration is valid.

## 4. Update nginx config

```bash
# Copy nginx config
sudo cp infra/nginx/karcoz.conf /etc/nginx/sites-available/karcoz

# Replace 'yourdomain.com' in the config with your actual domain
sudo sed -i 's/yourdomain.com/yourdomain.com/g' /etc/nginx/sites-available/karcoz

# Enable site
sudo ln -s /etc/nginx/sites-available/karcoz /etc/nginx/sites-enabled/karcoz

# Remove default site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Configure firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 6. Verify services start

```bash
docker compose -f infra/docker/docker-compose.prod.yml up -d db redis

# Wait for db to be ready
sleep 15

# Check health
docker compose -f infra/docker/docker-compose.prod.yml ps
```

## Environment Variable Reference

See [docs/env-vars.md](../docs/env-vars.md) for the complete variable reference, including which variables are required, optional, and how Redis fallback behaves.

## No localhost in Production

The following **must not** contain `localhost` or `127.0.0.1`:
- `DATABASE_URL` — use `db:5432` (Docker service name)
- `REDIS_URL` — use `redis:6379`
- `MAGIC_LINK_BASE_URL` — must be public HTTPS URL
- `APP_BASE_URL` — must be public HTTPS URL