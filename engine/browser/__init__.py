"""
Browser package - Core browser automation components
"""

from .session import BrowserSession

# Import modules only once to prevent duplicate registrations
if not hasattr(globals(), '_modules_registered'):
    from . import actions  # Import to ensure registration happens
    from . import observations  # Import to ensure registration happens
    from . import events  # Import to ensure registration happens
    from . import notification  # Import to ensure registration happens
    
    # Mark as registered to prevent duplicates
    globals()['_modules_registered'] = True

__all__ = ['BrowserSession'] 