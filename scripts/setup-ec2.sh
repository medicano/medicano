#!/bin/bash
# Roda uma vez na EC2 recém-criada para preparar o ambiente.
# Pré-requisito: instância com IAM Role que tem leitura no Secrets Manager.
set -e

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx

# Certbot (SSL via Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx

# Clonar o repositório
git clone https://github.com/SEU_USUARIO/medicano.git ~/medicano
cd ~/medicano
npm ci

# Build inicial da API
npm run build --workspace=apps/api

# Iniciar processos com PM2
cd apps/api
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # seguir as instruções impressas no terminal

echo ""
echo "Próximos passos:"
echo "  1. Configure o Nginx: sudo cp scripts/nginx.conf /etc/nginx/sites-available/medicano"
echo "  2. Ative: sudo ln -s /etc/nginx/sites-available/medicano /etc/nginx/sites-enabled/"
echo "  3. Emita o certificado SSL: sudo certbot --nginx -d api.medicano.app"
