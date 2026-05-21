module.exports = {
  apps: [
    {
      name: 'medicano-api',
      script: 'npm',
      args: 'run start:dev',
      cwd: '/home/markin/Codes/medicano/apps/api',
      env: {
        NODE_ENV: 'development',
        AWS_REGION: 'sa-east-1',
      },
    },
    {
      name: 'medicano-web',
      script: 'npm',
      args: 'run dev',
      cwd: '/home/markin/Codes/medicano/apps/web',
      env: {
        NODE_ENV: 'development',
        AWS_REGION: 'sa-east-1',
      },
    },
  ],
};
