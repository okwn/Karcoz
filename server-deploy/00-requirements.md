# Server Requirements

**OS:** Ubuntu 24.04 LTS (amd64)
**RAM:** 4 GB minimum, 8 GB recommended
**Disk:** 40 GB minimum, SSD preferred

## Dependencies

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Git | any recent | Source deployment |
| Certbot | latest | TLS certificates (Let's Encrypt) |
| Nginx | 1.24+ | Reverse proxy and TLS termination |

## Ports Required

| Port | Service | External? |
|------|---------|-----------|
| 80 | Nginx (HTTP) | Yes — for certbot ACME challenge |
| 443 | Nginx (HTTPS) | Yes — for TLS |
| 22 | SSH | Yes — server management |
| 8132 | API (internal) | No — Nginx only |
| 3100 | Web (internal) | No — Nginx only |
| 5433 | PostgreSQL | No — Docker internal |
| 6380 | Redis | No — Docker internal |

## Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## DNS

Point `A` record for your domain (e.g. `karcoz.yourdomain.com`) to your server's public IP before starting deployment. Allow up to 24 hours for DNS propagation before running certbot.

## Domain Validation

Before running certbot, verify your domain resolves correctly:

```bash
# Should return your server IP
dig +short yourdomain.com

# Or
host yourdomain.com
```

## UID/GID for Docker Volumes

Docker volumes are owned by the `postgres:postgres` user (UID 999) inside containers and by `root` on the host. This is normal — the container writes as UID 999, which appears as UID `root` on the host for bind-mounted directories. Data is safe either way.