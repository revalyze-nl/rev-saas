# Revalyze Production Deployment Guide

## Overview

Production deployments are managed by the `deploy-revalyze` script located at `/usr/local/bin/deploy-revalyze` on the server.

**Server**: Ubuntu
**Repo path**: `/opt/revalyze/app`
**User**: `ubuntu`

---

## Quick Start

### Deploy all services

```bash
ssh ubuntu@your-server
deploy-revalyze
```

### Deploy specific services

```bash
deploy-revalyze api dashboard
deploy-revalyze api
deploy-revalyze landing console
```

### Dry run (validate without deploying)

```bash
DRY_RUN=1 deploy-revalyze
DRY_RUN=1 deploy-revalyze api dashboard
```

---

## Installation

### 1. Copy the script to the server

```bash
# From your local machine
scp scripts/deploy-revalyze ubuntu@your-server:/tmp/

# On the server
sudo mv /tmp/deploy-revalyze /usr/local/bin/
sudo chmod +x /usr/local/bin/deploy-revalyze
sudo chown root:root /usr/local/bin/deploy-revalyze
```

### 2. Ensure .env exists

The script requires `/opt/revalyze/app/.env` to exist with all required variables.

```bash
# On the server, create/edit .env
nano /opt/revalyze/app/.env
```

---

## Required Environment Variables

The deploy script validates these variables before proceeding:

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `MONGO_DB_NAME` | MongoDB database name |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | Data encryption key |
| `STRIPE_SECRET_KEY` | Stripe API secret |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Email "from" address |

If any are missing or empty, deployment will fail with a clear error message.

---

## What the Script Does

### 1. Validation Phase
- Checks app directory exists (`/opt/revalyze/app`)
- Verifies `.env` file exists
- Confirms `.env` is NOT tracked by git
- Validates all required environment variables
- Validates `docker-compose config`

### 2. Backup Phase
- Creates timestamped backup: `.env.backup-YYYYMMDD-HHMMSS`

### 3. Deploy Phase
- `git fetch --all`
- `git reset --hard origin/main`
- `docker-compose build --pull [services]`
- `docker-compose up -d --remove-orphans [services]`

### 4. Status Phase
- Shows `docker-compose ps` output

---

## Safety Features

### .env Protection
- Script **never** overwrites `.env`
- Backup created before every deploy
- Validates `.env` is not tracked by git

### Fail-Fast
- Uses `set -euo pipefail`
- Any error stops deployment immediately
- Clear error messages indicate what to fix

### Dry Run Mode
- Set `DRY_RUN=1` to validate without executing
- Useful to verify config before deploying

---

## Troubleshooting

### "Missing environment variables"

```
[ERROR] Missing environment variables:
  ✗ SMTP_HOST
  ✗ SMTP_PASSWORD
```

**Fix**: Edit `/opt/revalyze/app/.env` and add the missing variables.

### ".env is tracked by git"

```
[ERROR] .env is tracked by git! This is dangerous.
```

**Fix**:
```bash
cd /opt/revalyze/app
git rm --cached .env
git commit -m "Stop tracking .env"
git push
```

### "docker-compose config validation failed"

**Fix**: Check for syntax errors in `.env` or `docker-compose.prod.yml`:
```bash
cd /opt/revalyze/app
docker-compose -f docker-compose.prod.yml --env-file .env config
```

---

## Backup Management

Backups are stored in `/opt/revalyze/app/`:

```bash
ls -la /opt/revalyze/app/.env.backup-*
```

To restore from backup:

```bash
cp /opt/revalyze/app/.env.backup-YYYYMMDD-HHMMSS /opt/revalyze/app/.env
```

Clean up old backups (keep last 10):

```bash
cd /opt/revalyze/app
ls -t .env.backup-* | tail -n +11 | xargs -r rm
```

---

## Manual Deployment (if script unavailable)

```bash
cd /opt/revalyze/app

# Backup .env
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)

# Pull latest code
git fetch --all
git reset --hard origin/main

# Build and deploy
docker-compose -f docker-compose.prod.yml --env-file .env build --pull
docker-compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| `api` | 8080 | Go backend API |
| `dashboard` | 3001 | React dashboard app |
| `landing` | 3002 | Landing page |
| `console` | 3003 | Admin console |
