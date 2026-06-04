module.exports = {
  apps: [
    {
      name: 'medicano-api',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/medicano/apps/api',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        AWS_REGION: 'sa-east-1',
        PORT: 3000,
      },
      error_file: '/home/ubuntu/.pm2/logs/medicano-api-error.log',
      out_file: '/home/ubuntu/.pm2/logs/medicano-api-out.log',
    },
    {
      name: 'medicano-api-staging',
      script: 'dist/main.js',
      cwd: '/home/ubuntu/medicano/apps/api',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'staging',
        AWS_REGION: 'sa-east-1',
        PORT: 3001,
      },
      error_file: '/home/ubuntu/.pm2/logs/medicano-api-staging-error.log',
      out_file: '/home/ubuntu/.pm2/logs/medicano-api-staging-out.log',
    },
  ],
};