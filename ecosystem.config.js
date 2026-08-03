module.exports = {
  apps: [
    {
      name: 'planet-pos-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 5050,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      merge_logs: true,
    },
    {
      name: 'planet-pos-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start -- --port 5051',
      env: {
        NODE_ENV: 'production',
        PORT: 5051,
        HOST: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      merge_logs: true,
    },
  ],
};
