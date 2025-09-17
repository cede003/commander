"""
Playwright Definitions - Auto-registered basic actions (direct Playwright methods)
"""

PLAYWRIGHT_SPECS = {
    "browser": {
        # Navigation
        "goto": {
            "target": "page",
            "required_arguments": ["url"],
            "description": "Navigates to a URL"
        },
        "reload": {
            "target": "page",
            "required_arguments": [],
            "description": "Reloads the current page"
        },
        "go_back": {
            "target": "page",
            "required_arguments": [],
            "description": "Goes back in browser history"
        },
        "go_forward": {
            "target": "page",
            "required_arguments": [],
            "description": "Goes forward in browser history"
        },
        
        # Basic Interaction
        "click": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Clicks an element"
        },
        "dblclick": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Double clicks an element"
        },
        "fill": {
            "target": "locator",
            "required_arguments": ["selector", "value"],
            "description": "Fills a form field"
        },
        "type": {
            "target": "locator",
            "required_arguments": ["selector", "text"],
            "description": "Types text into an element"
        },
        "press": {
            "target": "locator",
            "required_arguments": ["selector", "key"],
            "description": "Presses a key"
        },
        "hover": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Hovers over an element"
        },
        "focus": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Focuses an element"
        },
        "blur": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Removes focus from an element"
        },
        "tap": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Taps an element (mobile)"
        },
        "drag_to": {
            "target": "locator",
            "required_arguments": ["source", "target"],
            "description": "Drags and drops an element"
        },
        
        # Basic Selection
        "select_option": {
            "target": "locator",
            "required_arguments": ["selector", "value"],
            "description": "Selects an option from a dropdown"
        },
        "check": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks a checkbox"
        },
        "uncheck": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Unchecks a checkbox"
        },
        
        # Information extraction
        "text_content": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Extracts text from an element"
        },
        "get_attribute": {
            "target": "locator",
            "required_arguments": ["selector", "attribute"],
            "description": "Gets an attribute from an element"
        },
        "query_selector": {
            "target": "page",
            "required_arguments": ["selector"],
            "description": "Gets a single element"
        },
        "query_selector_all": {
            "target": "page",
            "required_arguments": ["selector"],
            "description": "Gets multiple elements matching a selector"
        },
        "title": {
            "target": "page",
            "required_arguments": [],
            "description": "Gets the page title"
        },
        "url": {
            "target": "page",
            "required_arguments": [],
            "description": "Gets the current URL"
        },
        
        # Element properties
        "is_visible": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks if element is visible"
        },
        "is_hidden": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks if element is hidden"
        },
        "is_enabled": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks if element is enabled"
        },
        "is_disabled": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks if element is disabled"
        },
        "is_checked": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Checks if element is checked"
        },
        
        # Page information
        "content": {
            "target": "page",
            "required_arguments": [],
            "description": "Gets page content"
        },
        "inner_html": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Gets inner HTML of element"
        },
        "outer_html": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Gets outer HTML of element"
        },
        "bounding_box": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Gets element bounding box"
        },
        "scroll_into_view_if_needed": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Scrolls to an element (Locator method)"
        },
        "scroll_to": {
            "target": "locator",
            "required_arguments": ["selector"],
            "description": "Scrolls to an element (alias for scroll_into_view_if_needed)"
        },
        
        # Basic Utilities
        "screenshot": {
            "target": "page",
            "required_arguments": ["path"],
            "description": "Takes a screenshot of the page"
        },
        
        # Waiting for elements
        "wait_for_selector": {
            "target": "page",
            "required_arguments": ["selector"],
            "description": "Waits for an element to appear"
        },
        "wait_for_load_state": {
            "target": "page",
            "required_arguments": [],
            "description": "Waits for a specific load state (default 'load')"
        },
        "wait_for_function": {
            "target": "page",
            "required_arguments": ["function"],
            "description": "Waits for a JavaScript function to return true"
        },
        
        # Waiting for events
        "wait_for_event": {
            "target": "page",
            "required_arguments": ["event"],
            "description": "Waits for a specific event"
        },
        "expect_response": {
            "target": "page",
            "required_arguments": ["url_or_predicate"],
            "description": "Waits for a response"
        },
        "expect_request": {
            "target": "page",
            "required_arguments": ["url_or_predicate"],
            "description": "Waits for a request"
        },
        
        # Waiting for navigation
        "wait_for_url": {
            "target": "page",
            "required_arguments": ["url"],
            "description": "Waits for URL to match"
        },
        "wait_for_timeout": {
            "target": "page",
            "required_arguments": ["timeout"],
            "description": "Waits for a timeout"
        },
        
        # Advanced waiting
        "expect_download": {
            "target": "page",
            "required_arguments": [],
            "description": "Waits for a download"
        },
        "expect_file_chooser": {
            "target": "page",
            "required_arguments": [],
            "description": "Waits for file chooser"
        },
        "expect_popup": {
            "target": "page",
            "required_arguments": [],
            "description": "Waits for a popup"
        }
    }
} 