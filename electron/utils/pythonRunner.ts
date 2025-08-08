import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import which from 'which';
import { CONFIG } from '../constants/config';
import logger from './logger';

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

// Format Python log output to be cleaner
function formatPythonLog(line: string): string | null {
  // Skip empty lines
  if (!line.trim()) return null;
  
  // Try to parse JSON log format
  try {
    const logData = JSON.parse(line);
    if (logData.service === 'commander' && logData.output) {
      // Extract just the message from the output
      const output = logData.output;
      const messageMatch = output.match(/^.*?\[(INFO|DEBUG|WARNING|ERROR)\]: (.+)$/);
      
      if (messageMatch) {
        const [, level, message] = messageMatch;
        return `[PYTHON] ${message}`;
      } else {
        // Fallback - just show the output
        return `[PYTHON] ${output}`;
      }
    }
  } catch (e) {
    // Not JSON, try to extract message from plain log
    const messageMatch = line.match(/^.*?\[(INFO|DEBUG|WARNING|ERROR)\]: (.+)$/);
    if (messageMatch) {
      const [, level, message] = messageMatch;
      return `[PYTHON] ${message}`;
    }
  }
  
  // Fallback for unrecognized formats
  return `[PYTHON] ${line}`;
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
  };

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
    logger.debug('Received Python output:', { text: text.trim() });
    outputBuffer += text;
    
    // Check for ready signal
    if (text.includes('READY') || text.includes('Persistent runner ready')) {
      isProcessReady = true;
      return;
    }
    
    // Try to parse JSON responses
    const lines = outputBuffer.split('\n');
    outputBuffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Log all stdout during initialization for debugging
      if (!isProcessReady) {
        logger.debug('Python stdout during initialization:', { output: line.trim() });
      }
      
      try {
        const response = JSON.parse(line);
        if (response.id && (response.success !== undefined || response.error)) {
          // This is a response to a request
          const requestIndex = pendingRequests.findIndex(req => req.id === response.id);
          if (requestIndex !== -1) {
            const request = pendingRequests.splice(requestIndex, 1)[0];
            clearTimeout(request.timeout);
            
            if (response.success) {
              request.resolve({
                success: true,
                output: JSON.stringify(response.result?.results || {}),
                errorOutput: response.result?.errorOutput || ''
              });
            } else {
              request.reject(new Error(response.error || 'Unknown error'));
            }
          }
        } else {
          // Regular log output - parse and format
          const cleanLine = stripAnsiColors(line.trim());
          const formattedLine = formatPythonLog(cleanLine);
          if (formattedLine) {
            // Skip duplicate messages that are already logged by Python
            if (!formattedLine.includes('Python process is ready') && 
                !formattedLine.includes('Python process initialized successfully')) {
              // Use the proper logger instead of console.log for consistent formatting
              logger.info(formattedLine);
            }
          }
        }
      } catch (e) {
        // Not JSON, treat as regular output - parse and format
        const cleanLine = stripAnsiColors(line.trim());
        const formattedLine = formatPythonLog(cleanLine);
        if (formattedLine) {
          // Skip duplicate messages that are already logged by Python
          if (!formattedLine.includes('Python process is ready') && 
              !formattedLine.includes('Python process initialized successfully')) {
            // Use the proper logger instead of console.log for consistent formatting
            logger.info(formattedLine);
          }
        }
      }
    }
  });

  persistentPythonProcess.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    const cleanText = stripAnsiColors(text.trim());
    
    // Log all stderr output during initialization for debugging
    if (!isProcessReady) {
      logger.debug('Python stderr during initialization:', { error: cleanText });
    }
    
    logger.error('Python Error:', { error: cleanText });
    logger.debug('Raw Python stderr:', { text: text.trim() });
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