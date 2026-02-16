"""
@knowgraph
type: module
description: User data models and Pydantic schemas for request/response validation
owner: platform-team
status: stable
tags: [users, models, validation]
compliance:
  regulations: [GDPR]
  data_sensitivity: confidential
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass(frozen=True)
class UserCreate:
    """
    @knowgraph
    type: class
    description: Pydantic schema for user registration request validation
    owner: platform-team
    status: stable
    tags: [users, models, validation, input]
    """
    email: str
    name: str
    password: str


@dataclass(frozen=True)
class UserUpdate:
    """
    @knowgraph
    type: class
    description: Pydantic schema for user profile update request with optional fields
    owner: platform-team
    status: stable
    tags: [users, models, validation, input]
    """
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


@dataclass(frozen=True)
class UserResponse:
    """
    @knowgraph
    type: class
    description: Pydantic schema for user API responses, excludes sensitive fields like password
    owner: platform-team
    status: stable
    tags: [users, models, response]
    compliance:
      regulations: [GDPR]
      data_sensitivity: confidential
    """
    id: str
    email: str
    name: str
    avatar_url: Optional[str]
    created_at: datetime
