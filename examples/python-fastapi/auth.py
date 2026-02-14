"""
@codegraph
type: module
description: Authentication and authorization module handling JWT tokens and user verification
owner: auth-team
status: stable
tags: [auth, security, jwt]
links:
  - type: notion
    url: https://notion.so/auth-design
    title: Authentication Design Document
  - type: github
    url: https://github.com/example/api-docs/blob/main/auth.md
    title: Auth API Documentation
context:
  business_goal: Secure user authentication and session management
  funnel_stage: activation
  revenue_impact: critical
dependencies:
  services: [user-service]
  databases: [redis-cache]
compliance:
  regulations: [GDPR, SOC2]
  data_sensitivity: confidential
  audit_requirements: [auth-audit-trail, failed-login-tracking]
operational:
  sla: "99.99%"
  on_call_team: auth-team
"""

from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials


security = HTTPBearer()


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated user context extracted from JWT token."""
    id: str
    email: str
    roles: tuple[str, ...]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """
    @codegraph
    type: function
    description: Extracts and validates JWT token from request headers, returning the authenticated user
    owner: auth-team
    status: stable
    tags: [auth, jwt, middleware]
    context:
      funnel_stage: activation
      revenue_impact: critical
    compliance:
      regulations: [SOC2]
      data_sensitivity: confidential
    """
    token = credentials.credentials
    payload = _decode_jwt(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return CurrentUser(
        id=payload["sub"],
        email=payload["email"],
        roles=tuple(payload.get("roles", [])),
    )


def _decode_jwt(token: str) -> Optional[dict]:
    """
    @codegraph
    type: function
    description: Decodes and validates a JWT token, checking expiry and signature
    owner: auth-team
    status: stable
    tags: [auth, jwt, crypto]
    compliance:
      regulations: [SOC2]
      data_sensitivity: confidential
    """
    # Implementation omitted for example purposes
    pass
