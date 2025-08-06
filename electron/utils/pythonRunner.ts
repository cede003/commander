import { spawn } from 'child_process';
import path from 'path';
import { CONFIG } from '../constants/config';
import logger from './logger';

// Function to strip ANSI color codes
function stripAnsiColors(text: string): string {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

export interface PythonRunnerOptions {
  workflowData: string;
  timeout?: number;
}

export interface PythonRunnerResult {
  success: boolean;
  output: string;
  errorOutput?: string;
}

export async function runPythonWorkflow(options: PythonRunnerOptions): Promise<PythonRunnerResult> {
  const { workflowData, timeout = CONFIG.workflowTimeout } = options;
  
  logger.info('Starting workflow execution');
  logger.debug('Engine path:', { path: CONFIG.enginePath });
  logger.debug('Workflow data length:', { length: workflowData.length });
  logger.debug('Executing workflow with data:', { 
    preview: workflowData.substring(0, 100) + '...' 
  });
  
  return new Promise((resolve, reject) => {
    // Try different Python commands in order of preference
    const pythonCommands = [
      '/Users/cede/.pyenv/shims/python3',  // pyenv path
      '/usr/bin/python3',                  // system python3
      '/usr/local/bin/python3',            // homebrew python3
      '/opt/homebrew/bin/python3',         // Apple Silicon homebrew
      'python3',                           // fallback to PATH
      'python'                             // last resort
    ];
    
    let pythonProcess: any = null;
    let lastError: any = null;
    
    // Try each Python command until one works
    for (const pythonCmd of pythonCommands) {
      try {
        logger.debug('Trying Python command:', { command: pythonCmd });
        
        // Enhanced environment with proper PATH
        const env = {
          ...process.env,
          PATH: [
            '/Users/cede/.pyenv/shims',
            '/usr/local/bin',
            '/usr/bin',
            '/bin',
            '/opt/homebrew/bin',
            process.env.PATH
          ].filter(Boolean).join(':'),
          PYTHONPATH: CONFIG.enginePath,
          LOG_NO_COLORS: '1'  // Disable colors in Python output
        };
        
        logger.debug('Using PATH:', { path: env.PATH });
        
        pythonProcess = spawn(
          pythonCmd,
          ['runner.py', workflowData],
          {
            cwd: CONFIG.enginePath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env
          }
        );
        
        // If we get here, the process started successfully
        logger.info('Successfully started Python process:', { command: pythonCmd });
        logger.debug('Process PID:', { pid: pythonProcess.pid });
        logger.debug('Working directory:', { cwd: CONFIG.enginePath });
        
        // Check if runner.py exists in the working directory
        const fs = require('fs');
        const runnerPath = path.join(CONFIG.enginePath, 'runner.py');
        logger.debug('Runner path:', { path: runnerPath });
        logger.debug('Runner exists:', { exists: fs.existsSync(runnerPath) });
        
        break;
      } catch (error) {
        logger.warn('Failed to start with command:', { command: pythonCmd, error: String(error) });
        lastError = error;
        continue;
      }
    }
    
    if (!pythonProcess) {
      const error = new Error(`Failed to start Python process. Tried: ${pythonCommands.join(', ')}. Last error: ${lastError}`);
      logger.error('Failed to start Python process:', { 
        triedCommands: pythonCommands, 
        lastError: String(lastError) 
      });
      reject(error);
      return;
    }
    
    // Workflow data is passed as command line argument, no need to write to stdin
    
    // Collect output
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data: Buffer) => {
      const outputData = data.toString();
      output += outputData;
      // Log Python output with proper formatting (strip color codes)
      const cleanOutput = stripAnsiColors(outputData.trim());
      logger.info('Python Output:', { output: cleanOutput });
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      const errorData = data.toString();
      errorOutput += errorData;
      // Log Python errors with proper formatting (strip color codes)
      const cleanError = stripAnsiColors(errorData.trim());
      logger.error('Python Error:', { error: cleanError });
    });
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      pythonProcess.kill();
      reject(new Error(`Workflow execution timed out after ${timeout}ms`));
    }, timeout);
    
    // Handle process completion
    pythonProcess.on('close', (code: number) => {
      clearTimeout(timeoutId);
      
      if (code === 0) {
        logger.info('Workflow executed successfully');
        resolve({
          success: true,
          output: stripAnsiColors(output.trim()),
          errorOutput: stripAnsiColors(errorOutput.trim())
        });
      } else {
        logger.error('Workflow execution failed:', { exitCode: code });
        reject(new Error(`Workflow execution failed with exit code ${code}. Error output: ${stripAnsiColors(errorOutput)}`));
      }
    });
    
    pythonProcess.on('error', (error: any) => {
      logger.error('Failed to start Python process:', { error: String(error) });
      reject(error);
    });
  });
} 