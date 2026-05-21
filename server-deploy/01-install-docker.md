# Install Docker & Docker Compose (Ubuntu 24.04)

## 1. Update system

```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install prerequisites

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
```

## 3. Add Docker GPG key and repository

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

## 4. Install Docker

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 5. Add user to docker group (avoids sudo for docker commands)

```bash
sudo usermod -aG docker $USER
# Log out and back in for group to take effect
```

## 6. Verify installation

```bash
docker --version
docker compose version
```

## 7. Enable and start Docker

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

## 8. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 9. Install Certbot (for TLS)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 10. Verify nginx is running

```bash
sudo nginx -t
sudo systemctl status nginx
```

## Troubleshooting

**Docker daemon not running:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

**Permission denied after adding user to docker group:**
```bash
# Log out and back in, or run:
newgrp docker
```

**Nginx not starting:**
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

**Port 80 already in use:**
```bash
sudo lsof -i :80
sudo systemctl stop <service>
```