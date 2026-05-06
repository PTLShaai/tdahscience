// ecosystem.config.js — PM2 config pour TDAH Science
// PM2 charge automatiquement ce fichier avec : pm2 start ecosystem.config.js

require('dotenv').config({ path: __dirname + '/.env' })

module.exports = {
  apps: [
    {
      name: 'tdahscience-api',
      script: './server/dist/index.js',
      cwd: '/var/www/tdahscience',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
        ...process.env,
      },
      error_file: '/var/log/pm2/tdahscience-error.log',
      out_file:   '/var/log/pm2/tdahscience-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
