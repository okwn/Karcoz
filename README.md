# KARÇÖZ — AI Destekli Eğitim Asistanı

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-karcoz-181717?style=for-the-badge&logo=github)](https://github.com/okwn/Karcoz)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/Lisans-MIT-green?style=for-the-badge)]()

**Soru çöz, anla, öğren.**

KARÇÖZ, yapay zeka destekli bir eğitim platformudur. Fotoğraf çek, soru sor, anında çözüm al.

[Özellikler](#-özellikler) •
[Kurulum](#-kurulum) •
[Mimari](#-mimari) •
[Proje Yapısı](#-proje-yapısı) •
[Katkı](#-katkı)

</div>

---

## Ekran Görüntüleri

| | | |
|:--:|:--:|:--:|
| **Browser Extension** | **Web Dashboard** | **Telegram Bot** |
| ↗️ Anında soru yakalama | 📊 Detaylı analiz panosu | 💬 Telegram üzerinden erişim |
| ![extension](https://via.placeholder.com/400x280/1a1d2e/FFFFFF?text=Browser+Extension) | ![dashboard](https://via.placeholder.com/400x280/1a1d2e/FFFFFF?text=Web+Dashboard) | ![telegram](https://via.placeholder.com/400x280/1a1d2e/FFFFFF?text=Telegram+Bot) |

---

## 🎯 Özellikler

### Core AI Pipeline
```
📸 Fotoğraf Çek → 🔍 OCR ile metin çıkar → 🤖 AI ile analiz et → ✅ Adım adım çözüm
```

### Platformlar
| Platform | Durum | Açıklama |
|----------|:-----:|----------|
| 🌐 Web Dashboard | ✅ | React tabanlı, gerçek zamanlı analitik |
| 🔧 Browser Extension | ✅ | Chrome/Edge'de anında soru yakalama |
| 💬 Telegram Bot | ✅ | `/start` ile hemen başla |
| 📱 API | ✅ | REST + Swagger dokümantasyonu |

### AI Modülleri
- **OCR Core** — Görüntüden metin çıkarma
- **AI Core** — Soruları anlama ve yanıtlama
- **Solver Core** — Adım adım çözüm üretme
- **Capture Core** — Ekran içeriği yakalama

---

## 🚀 Kurulum

### Gereksinimler

| Gereksinim | Minimum | Önerilen |
|------------|:-------:|:--------:|
| Node.js | 20.x | 22.x |
| pnpm | 8.x | 9.x |
| Docker | 24.x | 25.x |
| PostgreSQL | 15.x | 16.x |
| Redis | 7.x | 7.x |

### Hızlı Başlangıç

```bash
# 1. Repoyu klonla
git clone https://github.com/okwn/Karcoz.git
cd Karcoz

# 2. Bağımlılıkları yükle
pnpm install

# 3. .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle (özellikle DATABASE_URL ve REDIS_PASSWORD)

# 4. Geliştirme sunucusunu başlat
docker compose -f infra/docker/docker-compose.yml up -d
pnpm dev
```

> 🌐 Uygulama: `http://localhost:3100` | API: `http://localhost:8132` | Swagger: `http://localhost:8132/docs`

### Docker ile Üretim Dağıtımı

```bash
# Üretim ortamı için
cp infra/docker/.env.example infra/docker/.env
# infra/docker/.env dosyasını düzenle

docker compose -f infra/docker/docker-compose.prod.yml up -d
```

---

## 🏗️ Mimari

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KARÇÖZ Platform                         │
├─────────────┬──────────────┬───────────────┬────────────────────┤
│   Browser   │    Web       │   Telegram    │      Worker        │
│  Extension  │  Dashboard   │      Bot       │    (Background)    │
│   (apps/)   │   (apps/)    │    (apps/)    │     (apps/)        │
└──────┬──────┴──────┬───────┴──────┬───────┴─────────┬──────────┘
       │             │              │                 │
       └─────────────┴──────────────┴─────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Gateway     │
                    │   (apps/api)      │
                    │   Port: 8132      │
                    └─────────┬─────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
   │  Database  │      │    Redis    │     │  AI Provider  │
   │ PostgreSQL │      │   Cache/    │     │  (OpenAI/     │
   │ Port: 5433 │      │   Queue     │     │   Claude)     │
   └────────────┘      │ Port: 6380  │     └───────────────┘
                       └─────────────┘
```

### AI Pipeline Flow

```
User Input          Processing              Output
    │                   │                    │
    ▼                   ▼                    ▼
┌───────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│Capture│─▶│  OCR   │─▶│AI Core │─▶│Solver  │─▶│Response│
│ Core  │  │ Core   │  │        │  │ Core   │  │        │
└───────┘  └────────┘  └────────┘  └────────┘  └────────┘
```

---

## 📁 Proje Yapısı

```
karcoz/
├── apps/
│   ├── api/              # Express REST API (TypeScript)
│   ├── web-dashboard/    # React admin panel
│   ├── extension/         # Browser extension (Chrome/Edge)
│   ├── worker/            # Background job processor
│   └── telegram-bot/     # Telegram bot (Nodegram)
│
├── packages/
│   ├── ai-core/          # AI reasoning & prompting
│   ├── ocr-core/         # Görüntü → metin çıkarma
│   ├── solver-core/      # Adım adım çözüm motoru
│   ├── capture-core/     # Ekran yakalama modülleri
│   ├── shared/           # Paylaşılan tipler & utilities
│   ├── database/         # Prisma schema & migrations
│   ├── notification-core/# Bildirim sistemi
│   ├── plugin-system/    # Plugin mimarisi
│   ├── security/         # Auth & güvenlik
│   └── ui/               # Paylaşılan React bileşenleri
│
├── infra/
│   ├── docker/           # Docker Compose dosyaları
│   ├── nginx/            # Nginx konfigürasyonu
│   ├── postgres/         # DB init scripts
│   ├── redis/            # Redis config
│   └── scripts/          # Deployment scriptleri
│
├── docs/                 # Teknik dokümantasyon
├── eval/                 # Test & değerlendirme
├── e2e/                  # Playwright E2E testleri
└── scripts/              # Yardımcı scriptler
```

### Paketler

| Paket | Açıklama |
|-------|----------|
| `@karcoz/ai-core` | LLM entegrasyonu, prompt yönetimi |
| `@karcoz/ocr-core` | Tesseract tabanlı OCR |
| `@karcoz/solver-core` | Çözüm stratejileri, adım üretimi |
| `@karcoz/capture-core` | Screenshot, clipboard, selection |
| `@karcoz/shared` | Tip tanımları, validation schemaları |
| `@karcoz/database` | Prisma ORM, migrationlar |
| `@karcoz/notification-core` | Email, push, webhook bildirimleri |
| `@karcoz/security` | JWT auth, rate limiting, CORS |

---

## 🧪 Test

```bash
# Unit testler
pnpm test

# Test coverage
pnpm test:coverage

# API testleri
pnpm test:api

# E2E testler (Playwright)
pnpm test:e2e

# Tip kontrolü
pnpm typecheck

# Lint
pnpm lint
```

---

## 📖 Dokümantasyon

| Belge | Açıklama |
|-------|----------|
| [Deployment Guide](./server-deploy/) | Sunucu kurulum & dağıtım |
| [Architecture](./docs/architecture/) | Sistem mimarisi detayları |
| [API Reference](http://localhost:8132/docs) | Swagger API dokümantasyonu |
| [Environment Variables](./docs/env-vars.md) | Tüm env değişkenleri |

---

## 🔐 Güvenlik

- **JWT tabanlı kimlik doğrulama**
- **Rate limiting** — API endpoints korumalı
- **Input validation** — Zod schemas ile
- **SQL injection** — Parameterized queries
- **XSS koruması** — Content sanitization
- **CORS** — Whitelist bazlı

---

## 📄 Lisans

MIT License — detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<div align="center">

**KARÇÖZ** — Yapay zeka ile eğitimde yeni bir dönem.

Built with ❤️ using TypeScript, React, Node.js, PostgreSQL & Docker.

</div>