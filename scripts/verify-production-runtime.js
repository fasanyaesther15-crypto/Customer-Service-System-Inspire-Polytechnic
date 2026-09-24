#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const required = ['DATABASE_URL', 'SESSION_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const server = spawn(process.execPath, ['src/app.js'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3456' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let ready = false;
let output = '';

server.stdout.on('data', (chunk) => {
  output += chunk.toString();
  if (output.includes('Customer service system listening on port 3456')) {
    ready = true;
  }
});

server.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

const timeout = setTimeout(() => {
  server.kill('SIGTERM');
  console.error('Timed out waiting for production server startup.');
  process.exit(1);
}, 20000);

const check = () => {
  if (!ready) {
    setTimeout(check, 250);
    return;
  }

  const req = http.get('http://127.0.0.1:3456/health', (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      clearTimeout(timeout);
      server.kill('SIGTERM');
      if (res.statusCode !== 200 || !body.includes('status') || !body.includes('ok')) {
        console.error(`Health check failed: ${res.statusCode} ${body}`);
        process.exit(1);
      }
      console.log('Production runtime startup and health check passed.');
    });
  });

  req.on('error', (error) => {
    clearTimeout(timeout);
    server.kill('SIGTERM');
    console.error(error.message);
    process.exit(1);
  });
};

check();
