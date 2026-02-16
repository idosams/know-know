"""
@knowgraph
type: module
description: Product data models and Pydantic schemas for catalog management
owner: catalog-team
status: stable
tags: [products, models, catalog]
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass(frozen=True)
class ProductCreate:
    """
    @knowgraph
    type: class
    description: Pydantic schema for product creation requests with required catalog fields
    owner: catalog-team
    status: stable
    tags: [products, models, validation, input]
    """
    name: str
    description: str
    price_cents: int
    category: str
    sku: str
    inventory_count: int


@dataclass(frozen=True)
class ProductResponse:
    """
    @knowgraph
    type: class
    description: Pydantic schema for product API responses including availability status
    owner: catalog-team
    status: stable
    tags: [products, models, response]
    """
    id: str
    name: str
    description: str
    price_cents: int
    category: str
    sku: str
    in_stock: bool
    created_at: datetime
    updated_at: datetime
