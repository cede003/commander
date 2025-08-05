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
  
  console.log(`[PythonRunner] Executing workflow with data:`, workflowData.substring(0, 100) + '...');
  
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      'python',
      ['runner.py', workflowData],
      {
        cwd: CONFIG.enginePath,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    
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