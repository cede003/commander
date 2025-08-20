"""
Custom Definitions - Manually registered custom actions with business logic
"""

CUSTOM_SPECS = {
    "browser": {
        "action": {
            # Composite Actions (combinations of basic actions)
            "wait_and_click": {
                "required_inputs": ["selector"],
                "description": "Wait for element to be visible and click it",
                "custom_function": "wait_and_click"
            },
            "fill_form": {
                "required_inputs": ["fields"],
                "description": "Fill multiple form fields at once",
                "custom_function": "fill_form"
            },
            "smart_click": {
                "required_inputs": ["selector"],
                "description": "Smart click with wait and retry logic",
                "custom_function": "smart_click"
            },
            "multi_click": {
                "required_inputs": ["selectors"],
                "description": "Click multiple elements",
                "custom_function": "multi_click"
            },
            
            # Advanced Actions (domain-specific automation)
            "linkedin_easy_apply": {
                "required_inputs": [],
                "description": "LinkedIn Easy Apply automation",
                "custom_function": "linkedin_easy_apply"
            },
            "check_form_completeness": {
                "required_inputs": [],
                "description": "Check if a form is complete by looking for empty required fields",
                "custom_function": "check_form_completeness"
            },
            "smart_navigation": {
                "required_inputs": ["url"],
                "description": "Smart navigation with retry logic and error handling",
                "custom_function": "smart_navigation"
            }
        },
        
        "observation": {
            # Custom Observations
            "get_form_data": {
                "required_inputs": [],
                "description": "Extract all form data from the current page",
                "custom_function": "get_form_data"
            }
        },
        
        "event": {
            # Custom Events
            "wait_for_form_submission": {
                "required_inputs": [],
                "description": "Wait for a form to be submitted and handle the response",
                "custom_function": "wait_for_form_submission"
            }
        },
        
        "notification": {
            # Custom Notifications
            "notify_form_completion": {
                "required_inputs": ["form_name", "completion_status"],
                "description": "Notify about form completion status",
                "custom_function": "notify_form_completion"
            }
        }
    }
} 