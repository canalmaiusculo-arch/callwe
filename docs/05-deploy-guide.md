# Guia de Deploy — Rota A (VPS única)

Deploy em uma VPS Ubuntu 24.04 com Docker Compose + Nginx + Let's Encrypt. Ideal para MVP / até ~50 subcontas.

## Pré-requisitos

- **VPS** Hetzner CX22 (4 vCPU, 8GB) ou DigitalOcean equivalente.
- **DNS** apontando `app.callwe.app` e `api.callwe.app` para o IP da VPS (via Cloudflare proxy desativado para emitir SSL, depois pode ativar).
- **Repositório GitHub** com os secrets necessários (veja final).
- **Cloudflare R2** bucket criado.

## 1. Bootstrap da VPS (uma vez)

Como root:

```bash
curl -fsSL https://raw.githubusercontent.com/<org>/callwe/main/infra/scripts/bootstrap-vps.sh | bash
```

O script instala Docker, docker-compose, UFW, fail2ban, cria usuário `callwe`, configura firewall (22/80/443).

## 2. Clonar repo e configurar `.env`

```bash
su - callwe
git clone https://github.com/<org>/callwe.git /opt/callwe
cd /opt/callwe/infra
cp .env.example .env
# editar .env preenchendo todos os valores reais
```

Gerar segredos:
```bash
openssl rand -base64 64   # JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, NEXTAUTH_SECRET
openssl rand -hex 32      # ENCRYPTION_KEY
openssl rand -hex 32      # POSTGRES_PASSWORD, REDIS_PASSWORD
```

## 3. Emitir certificados SSL

Modo standalone (porta 80 livre):

```bash
cd /opt/callwe/infra
docker run --rm -p 80:80 \
  -v $(pwd)/nginx/ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  --agree-tos -m ops@callwe.app --non-interactive \
  -d app.callwe.app -d api.callwe.app
```

Depois, adicionar cron de renovação (`crontab -e`):

```
0 3 * * * cd /opt/callwe/infra && docker run --rm -v $(pwd)/nginx/ssl:/etc/letsencrypt certbot/certbot renew --quiet && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
```

## 4. Primeiro deploy

```bash
cd /opt/callwe
bash infra/scripts/deploy.sh latest
```

O script:
1. Puxa imagens do GHCR.
2. Roda migration (container efêmero).
3. Rolling restart de api, worker, web.
4. Reload do nginx.

Verificar:
```bash
curl https://api.callwe.app/health
docker compose -f infra/docker-compose.prod.yml ps
docker compose -f infra/docker-compose.prod.yml logs -f api
```

## 5. Backup automático

Adicionar ao cron do usuário `callwe`:

```
0 2 * * * cd /opt/callwe && source infra/.env && bash infra/scripts/backup.sh >> /var/log/callwe-backup.log 2>&1
```

Retenção: 30 dias (o script purga automaticamente).

## 6. Deploy contínuo (CI/CD)

Configurar **GitHub Secrets** no repositório:

| Secret | Valor |
|---|---|
| `VPS_HOST` | IP ou hostname da VPS |
| `VPS_USER` | `callwe` |
| `VPS_SSH_KEY` | Chave SSH privada (deploy key) |
| `NEXT_PUBLIC_API_URL` | `https://api.callwe.app` |
| `NEXT_PUBLIC_CLOUDTALK_PARTNER_ID` | valor do CloudTalk |

Ao fazer push para `main`, o workflow [deploy.yml](../.github/workflows/deploy.yml):
1. Builda 4 imagens Docker em paralelo (api, web, worker, migrate) com cache GHA.
2. Publica no GHCR (`ghcr.io/<org>/callwe-*`).
3. SSH na VPS → `git pull` + `docker login ghcr` + `deploy.sh <sha>`.

## 7. Observabilidade

Recomendação mínima:
- **Sentry** (free tier) — erros da api, web, worker.
- **UptimeRobot** — ping em `app.callwe.app` e `api.callwe.app/health` a cada 5min.
- **Cloudflare** na frente do DNS — DDoS mitigation + cache de assets estáticos (ativar proxy laranja DEPOIS do SSL emitido).

## 8. Escalar quando precisar

Sinais que indicam hora de escalar:
- CPU sustentada >70%.
- Postgres >80% de memória disponível.
- Filas BullMQ crescendo persistentemente.
- Latência p95 da API >500ms.

Caminhos de upgrade (em ordem de custo):
1. **Vertical** — subir a VPS (CX32 → CX42). Zero mudança no código.
2. **Separar banco** — Postgres gerenciado (Hetzner Cloud PG, Neon, RDS).
3. **Mover storage** — Cloudflare R2 já separado.
4. **Workers dedicados** — segunda VPS só rodando `worker`, apontando para o mesmo Redis.
5. **Kubernetes** (Rota B) — quando tiver >50 subcontas ativas ou precisar zero-downtime real.

## 9. Rollback

```bash
cd /opt/callwe
bash infra/scripts/deploy.sh <sha_anterior>   # usa tag do GHCR
```

Se o banco foi migrado e precisa voltar:
```bash
bash infra/scripts/restore.sh s3://callwe-prod/backups/callwe-<stamp>.sql.gz
```

## 10. Troubleshooting

| Sintoma | Checar |
|---|---|
| `api` não sobe | `docker compose logs api` — geralmente env var faltando |
| 502 no nginx | `api` unhealthy? `docker compose ps` |
| WebSocket não conecta | headers `Upgrade` no nginx, firewall, Cloudflare WebSocket enabled |
| Webhook CloudTalk 401 | Secret correto? Raw body preservado (nginx `proxy_request_buffering off`)? |
| Migration falha | `docker compose run --rm migrate` manual para ver erro |
