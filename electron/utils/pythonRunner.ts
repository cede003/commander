import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import which from 'which';
import { CONFIG } from '../constants/config';
import logger from './logger';
import { BrowserWindow } from 'electron';
import { getMainWindow } from '../windows/mainWindow';

// Cache for Python command to avoid repeated discovery
let cachedPythonCommand: string | null = null;
let cachedPythonValid: boolean = false;

// Persistent Python process
let persistentPythonProcess: ChildProcess | null = null;
let isProcessReady = false;
let pendingRequests: Array<{
  id: string;
  resolve: (result: PythonRunnerResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}> = [];

export interface PythonRunnerOptions {
  workflowData: string;
  timeout?: number;
}

export interface PythonRunnerResult {
  success: boolean;
  output: string;
  errorOutput?: string;
}

// Remove ANSI color codes from logs
function stripAnsiColors(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}


// Parse version string from `python --version` output
function parsePythonVersion(output: string): number[] {
  const match = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1, 4).map(Number) : [0, 0, 0];
}

function isVersionCompatible(version: number[]): boolean {
  const [major, minor] = version;
  return major > 3 || (major === 3 && minor >= 7);
}

// Check if a Python command is valid and meets version requirements
async function checkPythonCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const test = spawn(command, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 3000,
    });

    let versionData = '';

    test.stdout.on('data', (data) => (versionData += data.toString()));
    test.stderr.on('data', (data) => (versionData += data.toString()));

    test.on('close', () => {
      const version = parsePythonVersion(versionData);
      const valid = isVersionCompatible(version);
      resolve(valid);
    });

    test.on('error', () => resolve(false));
    test.on('timeout', () => {
      test.kill();
      resolve(false);
    });
  });
}

// Try to find Python using `which`
async function findPythonPaths(): Promise<string[]> {
  const candidates = ['python3', 'python', 'py'];
  const found: string[] = [];

  for (const cmd of candidates) {
    try {
      const resolved = which.sync(cmd);
      if (await checkPythonCommand(resolved)) {
        logger.debug('Found compatible Python:', { command: cmd, path: resolved });
        found.push(resolved);
      }
    } catch {
      continue;
    }
  }

  return [...new Set(found)];
}

// Find the best Python path, prioritize python3 ≥ 3.7
async function getBestPythonCommand(): Promise<string> {
  // Return cached result if available and validated
  if (cachedPythonCommand && cachedPythonValid) {
    logger.debug('Using cached Python command:', { command: cachedPythonCommand });
    return cachedPythonCommand;
  }

  const fromEnv = process.env.PYTHON_PATH || process.env.PYTHON;
  if (fromEnv && await checkPythonCommand(fromEnv)) {
    logger.info('Using Python from environment variable:', { path: fromEnv });
    cachedPythonCommand = fromEnv;
    cachedPythonValid = true;
    return fromEnv;
  }

  const found = await findPythonPaths();
  if (found.length === 0) {
    throw new Error('No compatible Python (>= 3.7) found. Set PYTHON_PATH or install Python 3.7+.'); 
  }

  const bestCommand = found.find(cmd => cmd.includes('python3')) || found[0];
  cachedPythonCommand = bestCommand;
  cachedPythonValid = true;
  logger.info('Cached Python command:', { command: bestCommand });
  return bestCommand;
}

// Initialize persistent Python process
export async function initializePythonProcess(): Promise<void> {
  if (persistentPythonProcess) {
    logger.debug('Python process already initialized');
    return;
  }

  logger.info('Initializing persistent Python process');

  const runnerPath = path.join(CONFIG.enginePath, 'runner.py');
  if (!fs.existsSync(runnerPath)) {
    throw new Error(`runner.py not found at ${runnerPath}`);
  }

  const pythonCmd = await getBestPythonCommand();
  
  const env = {
    ...process.env,
    PYTHONPATH: CONFIG.enginePath,
    LOG_NO_COLORS: '1',
    // Ensure Python gets LOG_LEVEL if set
    LOG_LEVEL: process.env.LOG_LEVEL || '',
    // Ensure Python writes to the same logs directory as Electron
    LOG_DIR: path.join(process.cwd(), 'logs'),
  };

  // Enable Playwright verbose API logs only when debug/verbose
  const lvl = (process.env.LOG_LEVEL || '').toLowerCase();
  if (lvl === 'debug' || lvl === 'verbose') {
    (env as any).DEBUG = 'pw:api';
  } else {
    delete (env as any).DEBUG;
  }

  persistentPythonProcess = spawn(
    pythonCmd,
    ['runner.py', '--persistent'],
    {
      cwd: CONFIG.enginePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    }
  );

  logger.debug('Persistent Python process started:', { pid: persistentPythonProcess.pid });

  // Handle process output
  let outputBuffer = '';
  persistentPythonProcess.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    outputBuffer += text;

    const lines = outputBuffer.split('\n');
    outputBuffer = lines.pop() || '';

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      // Detect readiness message
      if (line.includes('READY') || line.includes('Persistent runner ready')) {
        isProcessReady = true;
        continue;
      }

      // Try JSON first
      try {
        const parsed = JSON.parse(line);
        // Progress event forwarded to renderer
        if (parsed && parsed.type === 'progress') {
          const mainWindow: BrowserWindow | undefined = getMainWindow();
          mainWindow?.webContents.send('workflow-progress', parsed);
          continue;
        }
        // Response to a previously sent request
        if (parsed && parsed.id && (parsed.success !== undefined || parsed.error)) {
          const requestIndex = pendingRequests.findIndex(req => req.id === parsed.id);
          if (requestIndex !== -1) {
            const request = pendingRequests.splice(requestIndex, 1)[0];
            clearTimeout(request.timeout);
            if (parsed.success) {
              request.resolve({
                success: true,
                output: JSON.stringify(parsed.result?.results || {}),
                errorOutput: parsed.result?.errorOutput || ''
              });
            } else {
              request.reject(new Error(parsed.error || 'Unknown error'));
            }
          }
          continue;
        }
        // Unknown JSON: fall through to console
      } catch {
        // Not JSON; fall through to console
      }

      // Classify Playwright auto-wait verbosity as debug-only
      const clean = stripAnsiColors(line);
      const isPlaywrightVerbose = /^(?:-\s|waiting\s|element\s|attempt\s|retrying\s)/i.test(clean);
      if (isPlaywrightVerbose) {
        logger.debug(clean);
      } else {
        logger.info(clean);
      }
    }
  });

  persistentPythonProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    const cleanText = stripAnsiColors(text.trim());
    logger.error(cleanText);
  });

  persistentPythonProcess.on('close', (code) => {
    logger.warn('Persistent Python process closed:', { code });
    persistentPythonProcess = null;
    isProcessReady = false;
    
    // Reject all pending requests
    pendingRequests.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Python process terminated'));
    });
    pendingRequests = [];
  });

  persistentPythonProcess.on('error', (error) => {
    logger.error('Persistent Python process error:', { error: String(error) });
    persistentPythonProcess = null;
    isProcessReady = false;
  });

  // Wait for process to be ready
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logger.error('Python process initialization timeout');
      reject(new Error('Python process failed to initialize within 15 seconds'));
    }, 15000); // Increased from 10000 to 15000

    const checkReady = () => {
      logger.debug('Checking if Python process is ready:', { isProcessReady });
      if (isProcessReady) {
        clearTimeout(timeout);
        logger.info('Python process is ready');
        resolve();
      } else {
        setTimeout(checkReady, 100);
      }
    };
    checkReady();
  });
}

// Send workflow to persistent process
async function sendToPersistentProcess(workflowData: string, timeout: number): Promise<PythonRunnerResult> {
  if (!persistentPythonProcess || !isProcessReady) {
    throw new Error('Python process not ready. Call initializePythonProcess() first.');
  }

  return new Promise((resolve, reject) => {
    const requestId = Date.now().toString();
    const timeoutId = setTimeout(() => {
      // Remove from pending requests
      const index = pendingRequests.findIndex(req => req.id === requestId);
      if (index !== -1) {
        pendingRequests.splice(index, 1);
      }
      reject(new Error(`Workflow execution timed out after ${timeout}ms`));
    }, timeout);

    pendingRequests.push({
      id: requestId,
      resolve,
      reject,
      timeout: timeoutId
    });

    // Send workflow data to Python process
    persistentPythonProcess!.stdin?.write(JSON.stringify({
      id: requestId,
      workflow: workflowData
    }) + '\n');
  });
}

// Run the actual workflow
export async function runPythonWorkflow(options: PythonRunnerOptions): Promise<PythonRunnerResult> {
  const { workflowData, timeout = CONFIG.workflowTimeout } = options;

  logger.info('Starting Python workflow execution');
  logger.debug('Engine path:', { path: CONFIG.enginePath });
  logger.debug('Workflow data length:', { length: workflowData.length });

  // Wait for Python process to be ready (don't initialize if already in progress)
  if (!persistentPythonProcess || !isProcessReady) {
    // Wait for the process to be ready instead of initializing again
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait
    
    while (!persistentPythonProcess || !isProcessReady) {
      if (attempts >= maxAttempts) {
        throw new Error('Python process not ready after waiting 10 seconds');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  }

  return sendToPersistentProcess(workflowData, timeout);
}

// Cleanup function for app shutdown
export function cleanupPythonProcess(): void {
  if (persistentPythonProcess) {
    logger.info('Shutting down persistent Python process');
    persistentPythonProcess.kill();
    persistentPythonProcess = null;
    isProcessReady = false;
  }
}