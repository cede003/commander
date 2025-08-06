import { spawn } from 'child_process';
import path from 'path';
import { CONFIG } from '../constants/config';

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
  
  console.log(`[PythonRunner] Starting workflow execution`);
  console.log(`[PythonRunner] Engine path:`, CONFIG.enginePath);
  console.log(`[PythonRunner] Workflow data length:`, workflowData.length);
  console.log(`[PythonRunner] Executing workflow with data:`, workflowData.substring(0, 100) + '...');
  
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
        console.log(`[PythonRunner] Trying Python command: ${pythonCmd}`);
        
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
          PYTHONPATH: CONFIG.enginePath
        };
        
        console.log(`[PythonRunner] Using PATH: ${env.PATH}`);
        
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
        console.log(`[PythonRunner] Successfully started Python process with: ${pythonCmd}`);
        console.log(`[PythonRunner] Process PID: ${pythonProcess.pid}`);
        console.log(`[PythonRunner] Working directory: ${CONFIG.enginePath}`);
        
        // Check if runner.py exists in the working directory
        const fs = require('fs');
        const runnerPath = path.join(CONFIG.enginePath, 'runner.py');
        console.log(`[PythonRunner] Runner path: ${runnerPath}`);
        console.log(`[PythonRunner] Runner exists: ${fs.existsSync(runnerPath)}`);
        
        break;
      } catch (error) {
        console.log(`[PythonRunner] Failed to start with ${pythonCmd}:`, error);
        lastError = error;
        continue;
      }
    }
    
    if (!pythonProcess) {
      const error = new Error(`Failed to start Python process. Tried: ${pythonCommands.join(', ')}. Last error: ${lastError}`);
      console.error(`[PythonRunner] ${error.message}`);
      reject(error);
      return;
    }
    
    // Workflow data is passed as command line argument, no need to write to stdin
    
    // Collect output
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data: Buffer) => {
      output += data.toString();
      console.log(`[Python] ${data.toString()}`);
    });
    
    pythonProcess.stderr.on('data', (data: Buffer) => {
      errorOutput += data.toString();
      console.error(`[Python Error] ${data.toString()}`);
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
        console.log(`[PythonRunner] Workflow executed successfully`);
        resolve({ success: true, output });
      } else {
        console.error(`[PythonRunner] Workflow execution failed with code ${code}`);
        reject(new Error(`Workflow execution failed: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error: Error) => {
      clearTimeout(timeoutId);
      console.error(`[PythonRunner] Failed to start Python process:`, error);
      reject(error);
    });
  });
} 