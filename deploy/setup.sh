#!/bin/bash
# First-time server setup for MenuForge on a fresh Debian/Ubuntu GCE instance.
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
echo "=== Creating menuforge user ==="
id -u menuforge &>/dev/null || useradd -m -s /bin/bash menuforge

# Create app directory
mkdir -p /opt/menuforge/data
chown -R menuforge:menuforge /opt/menuforge

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. Clone your repo:  sudo -u menuforge git clone <your-repo-url> /opt/menuforge/app"
echo "  2. Run deploy.sh to build and start the app"
echo "  3. (Optional) Set up nginx + SSL with: certbot --nginx -d your-domain.com"
