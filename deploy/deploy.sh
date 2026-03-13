#!/bin/bash
# Deploy/update MenuForge on the GCE instance.
# Run as root: sudo bash deploy.sh

set -e

APP_DIR="/opt/menuforge/app"
DATA_DIR="/opt/menuforge/data"
USER="menuforge"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: $APP_DIR does not exist. Clone your repo there first."
  exit 1
fi

echo "=== Pulling latest code ==="
sudo -u $USER git -C $APP_DIR pull

echo "=== Installing dependencies ==="
sudo -u $USER bash -c "cd $APP_DIR && npm run install:all"

echo "=== Building client ==="
sudo -u $USER bash -c "cd $APP_DIR && npm run build"

echo "=== Ensuring data directory ==="
mkdir -p $DATA_DIR
chown $USER:$USER $DATA_DIR

echo "=== Starting/restarting with PM2 ==="
sudo -u $USER bash -c "
  export PORT=3001
  export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
  export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
  cd $APP_DIR
  pm2 delete menuforge 2>/dev/null || true
  DATA_DIR=$DATA_DIR PORT=3001 PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    pm2 start server/index.js --name menuforge
  pm2 save
"

# Set PM2 to start on boot
env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER 2>/dev/null || true

echo ""
echo "=== Deploy complete ==="
echo "App running on port 3001"
echo "Check status: sudo -u $USER pm2 status"
echo "View logs:    sudo -u $USER pm2 logs menuforge"
