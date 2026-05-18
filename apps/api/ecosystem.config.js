module.exports = {
  apps: [
    {
      name: 'medicano-api',
      script: 'dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        AWS_REGION: 'us-east-2',
      },
    },
    {
      name: 'medicano-api-staging',
      script: 'dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'staging',
        AWS_REGION: 'us-east-2',
        PORT: 3001,
      },
    },
  ],
};
