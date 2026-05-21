# Troubleshooting

## Services Won't Start

```bash
# Validate docker compose config
docker compose -f infra/docker/docker-compose.prod.yml config

# View all container logs
docker compose -f infra/docker/docker-compose.prod.yml logs

# Check specific service
docker compose -f infra/docker/docker-compose.prod.yml logs api
```

## Database Connection Refused

```bash
# Is postgres running?
docker compose -f infra/docker/docker-compose.prod.yml ps db

# Check postgres logs
docker compose -f infra/docker/docker-compose.prod.yml logs db

# Restart db
docker compose -f infra/docker/docker-compose.prod.yml restart db

# Verify DB is accepting connections from the API container
docker compose -f infra/docker/docker-compose.prod.yml exec api \
  npx prisma migrate status
```

## Redis Connection Refused

```bash
# Check redis container
docker compose -f infra/docker/docker-compose.prod.yml ps redis

# Check redis logs
docker compose -f infra/docker/docker-compose.prod.yml logs redis

# Test redis connection
docker exec karcoz_redis redis-cli -a $REDIS_PASSWORD ping
# or without password:
docker exec karcoz_redis redis-cli ping
```

## API Returns 502 Bad Gateway

```bash
# Is the API container running?
docker compose -f infra/docker/docker-compose.prod.yml ps api

# Check health endpoint directly
curl http://localhost:8132/health

# Check if API is listening inside container
docker exec karcoz_api wget -qO- http://localhost:8000/health

# Check nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart API
docker compose -f infra/docker/docker-compose.prod.yml restart api
```

## Telegram Bot Not Responding

```bash
# Check bot container
docker compose -f infra/docker/docker-compose.prod.yml ps telegram-bot

# View bot logs
docker compose -f infra/docker/docker-compose.prod.yml logs telegram-bot

# Test bot token is set
docker exec karcoz_telegram env | grep TELEGRAM

# Verify bot token with Telegram API
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe"
```

## Disk Space Full

```bash
# Check disk usage
df -h

# Docker disk usage
docker system df

# Remove old backups
rm infra/docker/backups/*.sql.gz

# Prune unused Docker objects (keeps running containers)
docker system prune -f

# Full prune (WARNING: removes all stopped containers, unused networks, dangling images)
docker system prune -a
```

## Port Already in Use

```bash
# Find what's using port 8132
sudo lsof -i :8132

# Find what's using port 80
sudo lsof -i :80

# Kill the process
sudo kill <PID>
```

## Smoke Test Failures

```bash
# Run smoke test with verbose output
bash scripts/smoke-api.sh http://localhost:8132

# For production domain (after TLS)
bash scripts/smoke-api.sh https://yourdomain.com

# If rate limit tests fail, check Redis is working:
docker exec karcoz_redis redis-cli -a $REDIS_PASSWORD get rate-limit:global
```

## Reset Everything (Nuclear)

```bash
# Stop everything and remove volumes (LOSES ALL DATA)
docker compose -f infra/docker/docker-compose.prod.yml down -v

# Fresh start
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Run migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy
```

## Check Health of All Services

```bash
for svc in api web db redis telegram-bot; do
  echo "=== $svc ==="
  docker compose -f infra/docker/docker-compose.prod.yml ps $svc
done
```

## Check Resource Usage

```bash
# Container resource usage
docker stats --no-stream

# API container CPU/memory
docker compose -f infra/docker/docker-compose.prod.yml top api
```

## Certbot Renewal Failures

```bash
# Check certbot timer
sudo systemctl list-timers | grep certbot

# Test renewal manually
sudo certbot renew --dry-run

# Check renewal logs
sudo journalctl -u certbot --no-pager -n 50
```

## Nginx Config Test Failures

```bash
# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check nginx error logs
sudo tail -30 /var/log/nginx/error.log

# Check access logs
sudo tail -30 /var/log/nginx/access.log
```

## Reset Nginx

```bash
# Restore KARÇÖZ nginx config
sudo cp /opt/karcoz/infra/nginx/karcoz.conf /etc/nginx/sites-available/karcoz
sudo nginx -t
sudo systemctl reload nginx
```