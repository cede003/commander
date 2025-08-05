"""
Function Definitions - Central specifications for all available functions
"""

FUNCTION_SPECS = {
    "browser": {
        "action": {
            # Navigation
            "goto": {
                "required_inputs": ["url"],
                "description": "Navigates to a URL",
                "playwright_method": "goto"
            },
            "reload": {
                "required_inputs": [],
                "description": "Reloads the current page",
                "playwright_method": "reload"
            },
            "go_back": {
                "required_inputs": [],
                "description": "Goes back in browser history",
                "playwright_method": "go_back"
            },
            "go_forward": {
                "required_inputs": [],
                "description": "Goes forward in browser history",
                "playwright_method": "go_forward"
            },
            
            # Interaction
            "click": {
                "required_inputs": ["selector"],
                "description": "Clicks an element",
                "playwright_method": "click"
            },
            "dblclick": {
                "required_inputs": ["selector"],
                "description": "Double clicks an element",
                "playwright_method": "dblclick"
            },
            "fill": {
                "required_inputs": ["selector", "value"],
                "description": "Fills a form field",
                "playwright_method": "fill"
            },
            "type": {
                "required_inputs": ["selector", "text"],
                "description": "Types text into an element",
                "playwright_method": "type"
            },
            "press": {
                "required_inputs": ["key"],
                "description": "Presses a key",
                "playwright_method": "press"
            },
            "hover": {
                "required_inputs": ["selector"],
                "description": "Hovers over an element",
                "playwright_method": "hover"
            },
            "focus": {
                "required_inputs": ["selector"],
                "description": "Focuses an element",
                "playwright_method": "focus"
            },
            "blur": {
                "required_inputs": ["selector"],
                "description": "Removes focus from an element",
                "playwright_method": "blur"
            },
            "tap": {
                "required_inputs": ["selector"],
                "description": "Taps an element (mobile)",
                "playwright_method": "tap"
            },
            "drag_and_drop": {
                "required_inputs": ["source", "target"],
                "description": "Drags and drops an element",
                "playwright_method": "drag_and_drop"
            },
            
            # Selection
            "select_option": {
                "required_inputs": ["selector", "value"],
                "description": "Selects an option from a dropdown",
                "playwright_method": "select_option"
            },
            "check": {
                "required_inputs": ["selector"],
                "description": "Checks a checkbox",
                "playwright_method": "check"
            },
            "uncheck": {
                "required_inputs": ["selector"],
                "description": "Unchecks a checkbox",
                "playwright_method": "uncheck"
            }
        },
        
        "observation": {
            # Information extraction
            "text_content": {
                "required_inputs": ["selector"],
                "description": "Extracts text from an element",
                "playwright_method": "text_content"
            },
            "get_attribute": {
                "required_inputs": ["selector", "attribute"],
                "description": "Gets an attribute from an element",
                "playwright_method": "get_attribute"
            },
            "query_selector": {
                "required_inputs": ["selector"],
                "description": "Gets a single element",
                "playwright_method": "query_selector"
            },
            "query_selector_all": {
                "required_inputs": ["selector"],
                "description": "Gets multiple elements matching a selector",
                "playwright_method": "query_selector_all"
            },
            "title": {
                "required_inputs": [],
                "description": "Gets the page title",
                "playwright_method": "title"
            },
            "get_title": {
                "required_inputs": [],
                "description": "Gets the page title (alias for title)",
                "playwright_method": "title"
            },
            "url": {
                "required_inputs": [],
                "description": "Gets the current URL",
                "playwright_method": "url"
            },
            
            # Element properties
            "is_visible": {
                "required_inputs": ["selector"],
                "description": "Checks if element is visible",
                "playwright_method": "is_visible"
            },
            "is_hidden": {
                "required_inputs": ["selector"],
                "description": "Checks if element is hidden",
                "playwright_method": "is_hidden"
            },
            "is_enabled": {
                "required_inputs": ["selector"],
                "description": "Checks if element is enabled",
                "playwright_method": "is_enabled"
            },
            "is_disabled": {
                "required_inputs": ["selector"],
                "description": "Checks if element is disabled",
                "playwright_method": "is_disabled"
            },
            "is_checked": {
                "required_inputs": ["selector"],
                "description": "Checks if element is checked",
                "playwright_method": "is_checked"
            },
            
            # Page information
            "content": {
                "required_inputs": [],
                "description": "Gets page content",
                "playwright_method": "content"
            },
            "inner_html": {
                "required_inputs": ["selector"],
                "description": "Gets inner HTML of element",
                "playwright_method": "inner_html"
            },
            "outer_html": {
                "required_inputs": ["selector"],
                "description": "Gets outer HTML of element",
                "playwright_method": "outer_html"
            },
            "bounding_box": {
                "required_inputs": ["selector"],
                "description": "Gets element bounding box",
                "playwright_method": "bounding_box"
            }
        },
        
        "event": {
            # Waiting for elements
            "wait_for_selector": {
                "required_inputs": ["selector"],
                "description": "Waits for an element to appear",
                "playwright_method": "wait_for_selector"
            },
            "wait_for_load_state": {
                "required_inputs": ["state"],
                "description": "Waits for a specific load state",
                "playwright_method": "wait_for_load_state"
            },
            "wait_for_function": {
                "required_inputs": ["function"],
                "description": "Waits for a JavaScript function to return true",
                "playwright_method": "wait_for_function"
            },
            
            # Waiting for events
            "wait_for_event": {
                "required_inputs": ["event"],
                "description": "Waits for a specific event",
                "playwright_method": "wait_for_event"
            },
            "wait_for_response": {
                "required_inputs": ["url_or_predicate"],
                "description": "Waits for a response",
                "playwright_method": "wait_for_response"
            },
            "wait_for_request": {
                "required_inputs": ["url_or_predicate"],
                "description": "Waits for a request",
                "playwright_method": "wait_for_request"
            },
            
            # Waiting for navigation
            "wait_for_url": {
                "required_inputs": ["url"],
                "description": "Waits for URL to match",
                "playwright_method": "wait_for_url"
            },
            "wait_for_load_state": {
                "required_inputs": [],
                "description": "Waits for load to complete",
                "playwright_method": "wait_for_load_state"
            },
            "wait_for_timeout": {
                "required_inputs": ["timeout"],
                "description": "Waits for a timeout",
                "playwright_method": "wait_for_timeout"
            },
            
            # Advanced waiting
            "wait_for_download": {
                "required_inputs": [],
                "description": "Waits for a download",
                "playwright_method": "wait_for_download"
            },
            "wait_for_file_chooser": {
                "required_inputs": [],
                "description": "Waits for file chooser",
                "playwright_method": "wait_for_file_chooser"
            },
            "wait_for_popup": {
                "required_inputs": [],
                "description": "Waits for a popup",
                "playwright_method": "wait_for_popup"
            }
        },
        
        "notification": {
            # Console logging
            "console_log": {
                "required_inputs": ["message"],
                "description": "Logs a message to console",
                "playwright_method": None
            },
            "print_result": {
                "required_inputs": ["message"],
                "description": "Prints a result from previous node",
                "playwright_method": None
            }
        }
    }
} 