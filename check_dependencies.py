import importlib.util

def check_package(package_name, required=True):
    spec = importlib.util.find_spec(package_name)
    status = "Installed" if spec else "Not Found"
    tag = "" if required else " (no longer required)"
    print(f"{package_name}: {status}{tag}")

print("Checking dependencies...")
check_package("requests")       # Required: used by all three fetchers
check_package("playwright", required=False)  # No longer needed - Mississauga now uses REST API
check_package("selenium", required=False)    # Not used
