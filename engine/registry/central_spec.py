"""
Central Function Specifications - Drives dynamic registration
"""

from .definitions.playwright_definitions import PLAYWRIGHT_SPECS

# Try to import custom specs, but provide fallback if not available
try:
    from .definitions.custom_definitions import CUSTOM_SPECS
    CUSTOM_AVAILABLE = True
except ImportError:
    CUSTOM_SPECS = {"browser": {"action": {}, "observation": {}, "event": {}, "notification": {}}}
    CUSTOM_AVAILABLE = False

# Combine both specs
FUNCTION_SPECS = {
    "browser": {
        "action": {
            **PLAYWRIGHT_SPECS["browser"]["action"],
            **(CUSTOM_SPECS["browser"]["action"] if CUSTOM_AVAILABLE else {})
        },
        "observation": {
            **PLAYWRIGHT_SPECS["browser"]["observation"],
            **(CUSTOM_SPECS["browser"]["observation"] if CUSTOM_AVAILABLE else {})
        },
        "event": {
            **PLAYWRIGHT_SPECS["browser"]["event"],
            **(CUSTOM_SPECS["browser"]["event"] if CUSTOM_AVAILABLE else {})
        },
        "notification": {
            **PLAYWRIGHT_SPECS["browser"]["notification"],
            **(CUSTOM_SPECS["browser"]["notification"] if CUSTOM_AVAILABLE else {})
        }
    }
}


def get_function_spec(domain: str, type_name: str, subtype: str) -> dict:
    """Get function specification from central spec"""
    return FUNCTION_SPECS.get(domain, {}).get(type_name, {}).get(subtype, {})


def get_required_inputs(domain: str, type_name: str, subtype: str) -> list:
    """Get required inputs for a function"""
    spec = get_function_spec(domain, type_name, subtype)
    return spec.get("required_inputs", [])


def get_playwright_method(domain: str, type_name: str, subtype: str) -> str:
    """Get Playwright method name for a function"""
    spec = get_function_spec(domain, type_name, subtype)
    return spec.get("playwright_method", subtype)


def get_description(domain: str, type_name: str, subtype: str) -> str:
    """Get description for a function"""
    spec = get_function_spec(domain, type_name, subtype)
    return spec.get("description", f"{domain}.{type_name}.{subtype}")


def list_all_functions() -> dict:
    """List all available functions from spec"""
    result = {}
    for domain, types in get_function_spec().items():
        result[domain] = {}
        for type_name, subtypes in types.items():
            result[domain][type_name] = list(subtypes.keys())
    return result 