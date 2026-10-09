module.exports = {
  apps: [
    {
      name: "brse-backend",
      script: "/home/bakaryuu/Desktop/MyApp/brse/backend/venv/bin/uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      cwd: "/home/bakaryuu/Desktop/MyApp/brse/backend",
      interpreter: "none",
      env: {
        PYTHONPATH: "/home/bakaryuu/Desktop/MyApp/brse/backend"
      }
    },
    {
      name: "brse-frontend",
      script: "npm",
      args: "run dev",
      cwd: "/home/bakaryuu/Desktop/MyApp/brse/frontend",
      env: {
        PORT: 3010,
        HOSTNAME: "0.0.0.0"
      }
    },
    {
      name: "9router",
      script: "node",
      args: "ninerouter/9router-pkg/cli.js -p 20128 -H 0.0.0.0 -n --tray --skip-update",
      cwd: "/home/bakaryuu/Desktop/MyApp/brse",
      interpreter: "none"
    }
  ]
};
