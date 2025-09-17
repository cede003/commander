from typing import Dict, Any, Optional
import json
import sys
def ipc_output(results: Dict[str, Any], request_id: str = None):
    if request_id:
        electron_response = {
            "id": request_id,
            "success": results.get("status") == "completed",
            "result": results
        }
        # logger.info(f"Sending Electron response: {json.dumps(electron_response, indent=2)}")
        # Send without indentation to avoid line splitting issues
        emit_json(electron_response)
    else:
        # Fallback format for direct output
        print(json.dumps(results), file=sys.stdout, flush=True)
    sys.stdout.flush()


# -----------------------------------------------------------------------------
# Protocol emitters (stdout-only, no log envelope) for IPC with Electron.
# These are NOT logs; they are part of the Python<->Electron protocol.
# -----------------------------------------------------------------------------

def emit_line(text: str) -> None:
    sys.stdout.write(f"{text}\n")
    sys.stdout.flush()



def emit_json(data: dict) -> None:
    sys.stdout.write(json.dumps(data) + "\n")
    sys.stdout.flush()
