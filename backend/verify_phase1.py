#!/usr/bin/env python3
"""
Phase 1 verification script.
Checks that all required backend modules import correctly.
"""
import sys

print("=" * 60)
print("eRTMAC-NWIS Phase 1 — Backend Verification")
print("=" * 60)

checks = []

# Core modules
try:
    from app.config import settings
    checks.append(("✓", "Config", f"SECRET_KEY set: {bool(settings.SECRET_KEY)}"))
except Exception as e:
    checks.append(("✗", "Config", str(e)))

try:
    from app.database.base import Base, engine
    checks.append(("✓", "Database Base", "SQLAlchemy async engine created"))
except Exception as e:
    checks.append(("✗", "Database Base", str(e)))

try:
    from app.models.identity import User, Role
    checks.append(("✓", "Models", "User, Role models loaded"))
except Exception as e:
    checks.append(("✗", "Models", str(e)))

try:
    from app.schemas.auth import LoginRequest, TokenResponse
    checks.append(("✓", "Schemas", "Auth schemas loaded"))
except Exception as e:
    checks.append(("✗", "Schemas", str(e)))

try:
    from app.utils.auth import hash_password, verify_password, create_access_token
    test_hash = hash_password("test123")
    assert verify_password("test123", test_hash), "Password verify failed"
    token = create_access_token({"sub": "test-user"})
    assert len(token) > 10, "Token too short"
    checks.append(("✓", "Auth Utils", "Password hashing and JWT working"))
except Exception as e:
    checks.append(("✗", "Auth Utils", str(e)))

try:
    from app.api import api_router
    checks.append(("✓", "API Router", f"Routes: {len(api_router.routes)}"))
except Exception as e:
    checks.append(("✗", "API Router", str(e)))

try:
    from app.main import app
    checks.append(("✓", "FastAPI App", f"App: {app.title} v{app.version}"))
except Exception as e:
    checks.append(("✗", "FastAPI App", str(e)))

# Print results
print()
failed = 0
for status, name, detail in checks:
    print(f"  {status} {name}: {detail}")
    if status == "✗":
        failed += 1

print()
if failed == 0:
    print("✓ All checks passed — Phase 1 backend is ready!")
    sys.exit(0)
else:
    print(f"✗ {failed} check(s) failed")
    sys.exit(1)
