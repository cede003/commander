"""
Playwright Definitions - Auto-registered basic actions (direct Playwright methods)
"""

PLAYWRIGHT_SPECS = {
    "browser": {
        # Navigation
        "goto": {
            "type": "playwright",
            "required_properties": ["url"],
            "description": "Navigates to a URL"
        },
        "reload": {
            "type": "playwright",
            "required_properties": [],
            "description": "Reloads the current page"
        },
        "go_back": {
            "type": "playwright",
            "required_properties": [],
            "description": "Goes back in browser history"
        },
        "go_forward": {
            "type": "playwright",
            "required_properties": [],
            "description": "Goes forward in browser history"
        },
        
        # Basic Interaction
        "click": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Clicks an element"
        },
        "dblclick": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Double clicks an element"
        },
        "fill": {
            "type": "playwright",
            "required_properties": ["selector", "value"],
            "description": "Fills a form field"
        },
        "type": {
            "type": "playwright",
            "required_properties": ["selector", "text"],
            "description": "Types text into an element"
        },
        "press": {
            "type": "playwright",
            "required_properties": ["selector", "key"],
            "description": "Presses a key"
        },
        "hover": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Hovers over an element"
        },
        "focus": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Focuses an element"
        },
        "blur": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Removes focus from an element"
        },
        "tap": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Taps an element (mobile)"
        },
        "drag_to": {
            "type": "playwright",
            "required_properties": ["source", "target"],
            "description": "Drags and drops an element"
        },
        
        # Basic Selection
        "select_option": {
            "type": "playwright",
            "required_properties": ["selector", "value"],
            "description": "Selects an option from a dropdown"
        },
        "check": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks a checkbox"
        },
        "uncheck": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Unchecks a checkbox"
        },
        
        # Information extraction
        "text_content": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Extracts text from an element"
        },
        "get_attribute": {
            "type": "playwright",
            "required_properties": ["selector", "attribute"],
            "description": "Gets an attribute from an element"
        },
        "query_selector": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Gets a single element"
        },
        "query_selector_all": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Gets multiple elements matching a selector"
        },
        "title": {
            "type": "playwright",
            "required_properties": [],
            "description": "Gets the page title"
        },
        "url": {
            "type": "playwright",
            "required_properties": [],
            "description": "Gets the current URL"
        },
        
        # Element properties
        "is_visible": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks if element is visible"
        },
        "is_hidden": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks if element is hidden"
        },
        "is_enabled": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks if element is enabled"
        },
        "is_disabled": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks if element is disabled"
        },
        "is_checked": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Checks if element is checked"
        },
        
        # Page information
        "content": {
            "type": "playwright",
            "required_properties": [],
            "description": "Gets page content"
        },
        "inner_html": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Gets inner HTML of element"
        },
        "outer_html": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Gets outer HTML of element"
        },
        "bounding_box": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Gets element bounding box"
        },
        "scroll_into_view_if_needed": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Scrolls to an element (Locator method)"
        },
        "scroll_to": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Scrolls to an element (alias for scroll_into_view_if_needed)"
        },
        
        # Basic Utilities
        "screenshot": {
            "type": "playwright",
            "required_properties": ["path"],
            "description": "Takes a screenshot of the page"
        },
        
        # Waiting for elements
        "wait_for_selector": {
            "type": "playwright",
            "required_properties": ["selector"],
            "description": "Waits for an element to appear"
        },
        "wait_for_load_state": {
            "type": "playwright",
            "required_properties": [],
            "description": "Waits for a specific load state (default 'load')"
        },
        "wait_for_function": {
            "type": "playwright",
            "required_properties": ["function"],
            "description": "Waits for a JavaScript function to return true"
        },
        
        # Waiting for events
        "wait_for_event": {
            "type": "playwright",
            "required_properties": ["event"],
            "description": "Waits for a specific event"
        },
        "expect_response": {
            "type": "playwright",
            "required_properties": ["url_or_predicate"],
            "description": "Waits for a response"
        },
        "expect_request": {
            "type": "playwright",
            "required_properties": ["url_or_predicate"],
            "description": "Waits for a request"
        },
        
        # Waiting for navigation
        "wait_for_url": {
            "type": "playwright",
            "required_properties": ["url"],
            "description": "Waits for URL to match"
        },
        "wait_for_timeout": {
            "type": "playwright",
            "required_properties": ["timeout"],
            "description": "Waits for a timeout"
        },
        
        # Advanced waiting
        "expect_download": {
            "type": "playwright",
            "required_properties": [],
            "description": "Waits for a download"
        },
        "expect_file_chooser": {
            "type": "playwright",
            "required_properties": [],
            "description": "Waits for file chooser"
        },
        "expect_popup": {
            "type": "playwright",
            "required_properties": [],
            "description": "Waits for a popup"
        }
    }
} 