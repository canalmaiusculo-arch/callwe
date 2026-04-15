#!/usr/bin/env bash
# =========================================================
# Bootstrap de uma VPS Ubuntu 24.04 limpa para rodar CallWe.
# Rodar UMA VEZ como root:
#   curl -fsSL https://raw.githubusercontent.com/<owner>/callwe/main/infra/scripts/bootstrap-vps.sh | bash
# =========================================================
set -euo pipefail

APP_DIR="/opt/callwe"
APP_USER="callwe"

echo "→ Atualizando sistema..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl gnupg ufw fail2ban unattended-upgrades \
  postgresql-client awscli git

echo "→ Instalando Docker + compose plugin..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "→ Criando usuário ${APP_USER}..."
id -u "${APP_USER}" &>/dev/null || useradd -m -s /bin/bash "${APP_USER}"
usermod -aG docker "${APP_USER}"

echo "→ Criando ${APP_DIR}..."
mkdir -p "${APP_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

echo "→ Firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "→ Fail2ban..."
systemctl enable --now fail2ban

echo "→ Unattended-upgrades..."
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "→ Certbot (via docker)..."
docker pull certbot/certbot:latest

echo "✅ VPS pronta. Próximos passos:"
echo "   1. su - ${APP_USER}"
echo "   2. git clone <repo> ${APP_DIR}"
echo "   3. Configurar ${APP_DIR}/infra/.env"
echo "   4. Emitir SSL:"
echo "      docker run --rm -v ${APP_DIR}/infra/nginx/ssl:/etc/letsencrypt \\"
echo "        -p 80:80 certbot/certbot certonly --standalone \\"
echo "        -d app.callwe.app -d api.callwe.app"
echo "   5. bash ${APP_DIR}/infra/scripts/deploy.sh"
