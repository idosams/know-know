"""
@codegraph
type: module
description: Order data models and Pydantic schemas for order management
owner: orders-team
status: stable
tags: [orders, models, validation]
compliance:
  regulations: [PCI-DSS]
  data_sensitivity: confidential
"""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass(frozen=True)
class OrderLineItem:
    """
    @codegraph
    type: class
    description: Represents a single line item within an order with product reference and quantity
    owner: orders-team
    status: stable
    tags: [orders, models, line-items]
    """
    product_id: str
    quantity: int
    price_cents: int


@dataclass(frozen=True)
class OrderCreate:
    """
    @codegraph
    type: class
    description: Pydantic schema for order creation requests with line items and shipping details
    owner: orders-team
    status: stable
    tags: [orders, models, validation, input]
    """
    items: list
    shipping_address: str
    payment_method_id: str


@dataclass(frozen=True)
class OrderResponse:
    """
    @codegraph
    type: class
    description: Pydantic schema for order API responses including fulfillment tracking info
    owner: orders-team
    status: stable
    tags: [orders, models, response, tracking]
    compliance:
      regulations: [PCI-DSS]
      data_sensitivity: confidential
    """
    id: str
    user_id: str
    items: list
    total_cents: int
    status: str
    tracking_number: Optional[str]
    created_at: datetime
    updated_at: datetime
