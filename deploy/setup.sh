#!/bin/bash
# First-time server setup for Prixie on a fresh Debian/Ubuntu GCE instance.
# Run as root: sudo bash setup.sh

set -e

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Node.js 20
echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Chromium for Puppeteer PDF export
echo "=== Installing Chromium ==="
apt-get install -y chromium fonts-liberation fonts-noto-color-emoji

# PM2 for process management
echo "=== Installing PM2 ==="
npm install -g pm2

# Create app user
echo "=== Creating prixie user ==="
id -u prixie &>/dev/null || useradd -m -s /bin/bash prixie

# Create app directory
mkdir -p /opt/prixie/data
chown -R prixie:prixie /opt/prixie

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Clone your repo:  sudo -u prixie git clone <your-repo-url> /opt/prixie/app"
echo "  2. Run deploy.sh to build and start the app"
echo "  3. (Optional) Set up nginx + SSL with: certbot --nginx -d your-domain.com"
