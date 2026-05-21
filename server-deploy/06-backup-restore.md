# Backup & Restore

## Backup Schedule

Automated daily backups are recommended. Add this to the deployer's crontab:

```bash
# Edit crontab
crontab -e

# Add (runs daily at 03:00):
0 3 * * * /opt/karcoz/scripts/backup-db.sh >> /var/log/karcoz-backup.log 2>&1
```

## Manual Backup

```bash
# Create a timestamped backup
bash scripts/backup-db.sh

# Backup is stored at:
# infra/docker/backups/karcoz_db_YYYYMMDD_HHMMSS.sql.gz
```

## List Available Backups

```bash
ls -lh infra/docker/backups/
```

## Restore from Backup

```bash
# Restore (requires container running)
bash scripts/restore-db.sh infra/docker/backups/karcoz_db_YYYYMMDD_HHMMSS.sql.gz
```

The `restore-db.sh` script:
1. Reads the compressed `.sql.gz` file
2. Decompresses it with `gunzip`
3. Pipes to `psql` to restore

## Restore to a Different Server

```bash
# 1. Copy backup file to new server
scp karcoz_db_20260521_030000.sql.gz user@newserver:/opt/karcoz/infra/docker/backups/

# 2. Start fresh containers on new server
docker compose -f infra/docker/docker-compose.prod.yml up -d db redis
sleep 15

# 3. Restore
docker compose -f infra/docker/docker-compose.prod.yml exec -T db psql -U karcoz -d karcoz_db < /backups/karcoz_db_YYYYMMDD_HHMMSS.sql.gz
```

## Backup Retention

**Recommended:** Keep the last 7 daily backups.

```bash
# Remove backups older than 7 days
find infra/docker/backups/ -name "karcoz_db_*.sql.gz" -mtime +7 -delete
```

**Monthly retention:** Keep the last 3 monthly snapshots before pruning.

```bash
# Keep last 3 monthly backups (90 days), delete the rest
find infra/docker/backups/ -name "karcoz_db_*.sql.gz" -mtime +90 -delete
```

## Backup Encryption (Recommended)

Encrypt backups before storing them off-server (cloud storage, NAS, etc.):

```bash
# Encrypt with GPG
gpg -- symmetric --cipher-algo AES256 \
  --output karcoz_db_YYYYMMDD_HHMMSS.sql.gz.enc \
  karcoz_db_YYYYMMDD_HHMMSS.sql.gz

# Decrypt before restore
gpg --decrypt karcoz_db_YYYYMMDD_HHMMSS.sql.gz.enc | gunzip | psql ...
# or
gpg --decrypt karcoz_db_YYYYMMDD_HHMMSS.sql.gz.enc > /tmp/restore.sql
gunzip -c /tmp/restore.sql | psql ...
```

Store the GPG passphrase securely (password manager, secret store). The passphrase must be available when restoring, so do not lose it.

## Volume Backups (Full)

For full disaster recovery (including users, sessions, all data):

```bash
# Backup PostgreSQL volume
docker run --rm \
  -v karcoz_pgdata:/data \
  -v $(pwd)/infra/docker/backups:/out \
  alpine \
  tar -czf /out/pgdata_$(date +%Y%m%d).tar.gz -C /data .

# Backup Redis volume
docker run --rm \
  -v karcoz_redisdata:/data \
  -v $(pwd)/infra/docker/backups:/out \
  alpine \
  tar -czf /out/redis_$(date +%Y%m%d).tar.gz -C /data .
```

## Restore Full Volumes

```bash
# Stop services
docker compose -f infra/docker/docker-compose.prod.yml down

# Restore PostgreSQL volume
docker run --rm \
  -v karcoz_pgdata:/data \
  -v $(pwd)/infra/docker/backups:/in \
  alpine \
  tar -xzf /in/pgdata_YYYYMMDD.tar.gz -C /data

# Restart services
docker compose -f infra/docker/docker-compose.prod.yml up -d
```

## Restore Script

The `scripts/restore-db.sh` script handles decompression and restore:

```bash
#!/usr/bin/env bash
set -e
BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi
gunzip -c "$BACKUP_FILE" | docker exec -i karcoz_db psql -U karcoz -d karcoz_db
echo "Restore complete: $BACKUP_FILE"
```

## Testing Restore

Test your backup monthly:

```bash
# 1. Create a test restore on a separate instance
# 2. Verify data integrity
# 3. Verify application works with restored data
```

## Backup Verification

After each backup, verify the file is non-empty and valid:

```bash
# Check file size (should be > 1KB for a non-empty DB)
ls -lh infra/docker/backups/karcoz_db_latest.sql.gz

# Verify gzip integrity
gunzip -t infra/docker/backups/karcoz_db_latest.sql.gz

# Verify it restores cleanly (creates a test DB)
gunzip -c infra/docker/backups/karcoz_db_latest.sql.gz | head -5
```

## Off-site Backup

Copy backups to a remote location (S3, rsync, etc.) regularly:

```bash
# Example: rsync to a remote server
rsync -avz --progress infra/docker/backups/ user@backupserver:/backups/karcoz/
```

Ensure off-site backups are also encrypted.

## What Gets Backed Up

| Data | Backed Up | Notes |
|------|-----------|-------|
| Users, sessions, auth tokens | ✅ | Full SQL dump |
| Questions and history | ✅ | Full SQL dump |
| Practice sets | ✅ | Full SQL dump |
| Billing/subscription data | ✅ | Full SQL dump |
| Telegram link status | ✅ | Full SQL dump |
| Uploaded images | ❌ | Stored in `uploads` volume, back up separately |
| Redis cache | ❌ | Not critical — recreated on restart |
| SSL certificates | ❌ | Stored in `/etc/letsencrypt/`, managed by certbot |