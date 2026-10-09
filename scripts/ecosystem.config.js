module.exports = {
  apps: [
    {
      name: "9router",
      script: "/home/bakaryuu/.npm-global/lib/node_modules/9router/app/server.js",
      cwd: "/home/bakaryuu/BrSE",
      env: {
        PORT: "20128",
        HOSTNAME: "0.0.0.0",
        DATA_DIR: "/home/bakaryuu/BrSE/.run/9router-data",
        NODE_PATH: "/home/bakaryuu/BrSE/.run/9router-data/runtime/node_modules:/home/bakaryuu/.npm-global/lib/node_modules/9router/app/node_modules",
        NODE_ENV: "production"
      },
      node_args: "--max-old-space-size=6144",
      autorestart: true,
      watch: false,
      max_memory_restart: "6G",
      error_file: "/home/bakaryuu/BrSE/.run/pm2-9router-error.log",
      out_file: "/home/bakaryuu/BrSE/.run/pm2-9router-out.log"
    }
  ]
};
