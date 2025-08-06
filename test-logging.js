#!/usr/bin/env node

// Simple test script to verify logging consistency
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing logging consistency...');

// Start the app in development mode
const child = spawn('npm', ['run', 'dev'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, LOG_LEVEL: 'debug' }
});

let logLines = [];
let errorLines = [];

child.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      logLines.push(line);
      console.log(`[STDOUT] ${line}`);
    }
  });
});

child.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      errorLines.push(line);
      console.log(`[STDERR] ${line}`);
    }
  });
});

child.on('close', (code) => {
  console.log(`\n📊 Logging Test Results:`);
  console.log(`Exit code: ${code}`);
  console.log(`Total log lines: ${logLines.length}`);
  console.log(`Total error lines: ${errorLines.length}`);
  
  // Check for logging consistency issues
  const issues = [];
  
  // Check for missing logEntry handler errors
  const logEntryErrors = errorLines.filter(line => line.includes('No handler registered for \'logEntry\''));
  if (logEntryErrors.length > 0) {
    issues.push(`Found ${logEntryErrors.length} logEntry handler errors`);
  }
  
  // Check for inconsistent log formats
  const debugFormat = logLines.filter(line => line.includes('[DEBUG]'));
  const winstonFormat = logLines.filter(line => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \[/.test(line));
  
  if (debugFormat.length > 0) {
    issues.push(`Found ${debugFormat.length} inconsistent [DEBUG] format logs`);
  }
  
  console.log(`\n🔍 Issues found: ${issues.length}`);
  issues.forEach(issue => console.log(`  - ${issue}`));
  
  if (issues.length === 0) {
    console.log('✅ Logging appears to be consistent!');
  } else {
    console.log('❌ Logging consistency issues detected');
  }
  
  process.exit(code);
});

// Stop after 30 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, stopping...');
  child.kill();
}, 30000); 