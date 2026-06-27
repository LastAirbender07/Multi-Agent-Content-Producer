"""
re_auth.py — Run this whenever the Blogger token expires (every ~7 days in Testing mode).

Usage:
    cd backend
    python re_auth.py

Opens a browser tab → log in with your Google account → click Allow → done.
"""
import sys
sys.path.insert(0, ".")

from core.services.blogger_service import _get_credentials

print("Refreshing Blogger OAuth token...")
creds = _get_credentials()
print("Done. blogger_token.json updated.")
print(f"Token valid: {creds.valid}")
