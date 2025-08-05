"""
Browser Observations - Extracts DOM, input fields, and metadata
"""

from typing import Dict, Any, List, Optional
from playwright.async_api import Page


class BrowserObservations:
    """Extracts information from the browser page"""
    
    def __init__(self, page: Page):
        self.page = page
    
    async def get_dom_snapshot(self) -> Dict[str, Any]:
        """Get a snapshot of the current DOM"""
        try:
            # Get page title and URL
            title = await self.page.title()
            url = self.page.url
            
            # Get page content
            content = await self.page.content()
            
            return {
                'title': title,
                'url': url,
                'content_length': len(content),
                'timestamp': self.page.evaluate('() => new Date().toISOString()')
            }
        except Exception as e:
            print(f"❌ Error getting DOM snapshot: {e}")
            return {}
    
    async def extract_visible_inputs(self) -> List[Dict[str, Any]]:
        """Extract all visible input fields from the page"""
        try:
            inputs = await self.page.evaluate("""
                () => {
                    const inputs = document.querySelectorAll('input, textarea, select');
                    return Array.from(inputs).map(input => ({
                        selector: input.tagName.toLowerCase() + (input.name ? `[name="${input.name}"]` : '') + (input.id ? `#${input.id}` : ''),
                        type: input.type || input.tagName.toLowerCase(),
                        name: input.name || '',
                        id: input.id || '',
                        value: input.value || '',
                        placeholder: input.placeholder || '',
                        required: input.required || false,
                        visible: input.offsetParent !== null
                    })).filter(input => input.visible);
                }
            """)
            
            print(f"🔍 Found {len(inputs)} visible input fields")
            return inputs
            
        except Exception as e:
            print(f"❌ Error extracting input fields: {e}")
            return []
    
    async def get_page_metadata(self) -> Dict[str, Any]:
        """Get metadata about the current page"""
        try:
            metadata = await self.page.evaluate("""
                () => {
                    return {
                        title: document.title,
                        url: window.location.href,
                        domain: window.location.hostname,
                        path: window.location.pathname,
                        forms: document.forms.length,
                        inputs: document.querySelectorAll('input, textarea, select').length,
                        links: document.links.length,
                        images: document.images.length
                    }
                }
            """)
            
            return metadata
            
        except Exception as e:
            print(f"❌ Error getting page metadata: {e}")
            return {}
    
    async def find_elements_by_text(self, text: str) -> List[str]:
        """Find elements containing specific text"""
        try:
            elements = await self.page.evaluate(f"""
                (searchText) => {{
                    const elements = Array.from(document.querySelectorAll('*'));
                    return elements
                        .filter(el => el.textContent && el.textContent.includes(searchText))
                        .map(el => {{
                            tag: el.tagName.toLowerCase(),
                            text: el.textContent.trim(),
                            selector: el.tagName.toLowerCase() + (el.id ? `#${{el.id}}` : '') + (el.className ? `.${{el.className.split(' ').join('.')}}` : '')
                        }});
                }}
            """, text)
            
            print(f"🔍 Found {len(elements)} elements containing '{text}'")
            return elements
            
        except Exception as e:
            print(f"❌ Error finding elements by text: {e}")
            return []
    
    async def get_form_data(self) -> Dict[str, Any]:
        """Extract data from all forms on the page"""
        try:
            form_data = await self.page.evaluate("""
                () => {
                    const forms = document.querySelectorAll('form');
                    return Array.from(forms).map((form, index) => ({
                        index: index,
                        action: form.action,
                        method: form.method,
                        id: form.id || '',
                        class: form.className || '',
                        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
                            name: input.name || '',
                            type: input.type || input.tagName.toLowerCase(),
                            value: input.value || '',
                            required: input.required || false
                        }))
                    }));
                }
            """)
            
            print(f"📋 Found {len(form_data)} forms")
            return form_data
            
        except Exception as e:
            print(f"❌ Error getting form data: {e}")
            return [] 