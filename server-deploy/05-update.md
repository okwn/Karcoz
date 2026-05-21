# Update KARÇÖZ

## Quick update (git deploy)

```bash
cd /opt/karcoz
git pull origin main
docker compose -f infra/docker/docker-compose.prod.yml build --parallel
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Manual update

```bash
cd /opt/karcoz

# Pull latest code
git pull origin main

# Rebuild images (parallel is faster)
docker compose -f infra/docker/docker-compose.prod.yml build --parallel

# Restart services (keep old containers for rollback)
docker compose -f infra/docker/docker-compose.prod.yml up -d

# Prune old images to free disk space
docker image prune -f
```

## Update environment variables

```bash
nano .env
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Rollback to previous version

```bash
# List all karcoz images
docker images | grep karcoz

# Stop current containers
docker compose -f infra/docker/docker-compose.prod.yml down

# Use the previous image tag (replace <image-id> with actual ID)
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Database migrations during update

If a migration is needed (shown in `prisma migrate status`):

```bash
# Run migrations
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma migrate deploy

# Or for a fresh schema push (faster but less safe for existing data)
docker compose -f infra/docker/docker-compose.prod.yml exec api npx prisma db push
```

## Backup before update

```bash
bash scripts/backup-db.sh
```

Backups are stored in `infra/docker/backups/`.

## Update Docker itself

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl restart docker
```