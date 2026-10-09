const path = require("path");
const fs = require("fs");

const rootDir = __dirname;
const winPython = path.join(rootDir, "backend", "venv", "Scripts", "python.exe");
const linuxPython = path.join(rootDir, "backend", "venv", "bin", "python");

let pythonInterpreter = "python";
if (fs.existsSync(winPython)) {
  pythonInterpreter = winPython;
} else if (fs.existsSync(linuxPython)) {
  pythonInterpreter = linuxPython;
}

module.exports = {
  apps: [
    {
      name: "brse-backend",
      cwd: path.join(rootDir, "backend"),
      script: "run_server.py",
      interpreter: pythonInterpreter,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        HOST: "0.0.0.0",
        PORT: 8000,
        PYTHONUNBUFFERED: "1"
      }
    },
    {
      name: "brse-frontend",
      cwd: path.join(rootDir, "frontend"),
      script: process.platform === "win32" ? "npm.cmd" : "npm",
      args: "run dev -- -p 3010",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        PORT: 3010,
        NODE_ENV: "development"
      }
    }
  ]
};
