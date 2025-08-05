"""
Central Function Specifications - Drives dynamic registration
"""

from .definitions import FUNCTION_SPECS


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
    for domain, types in FUNCTION_SPECS.items():
        result[domain] = {}
        for type_name, subtypes in types.items():
            result[domain][type_name] = list(subtypes.keys())
    return result 