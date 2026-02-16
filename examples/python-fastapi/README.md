# Python FastAPI Example

A fully annotated e-commerce API demonstrating CodeGraph annotations in Python.

## Project Structure

```
python-fastapi/
  main.py                    # FastAPI app entry point
  auth.py                    # JWT authentication
  routers/
    users.py                 # User CRUD endpoints
    products.py              # Product catalog endpoints
    orders.py                # Order management endpoints
  models/
    user.py                  # User data model
    product.py               # Product data model
    order.py                 # Order data model
  services/
    payment.py               # Stripe payment processing
    notification.py          # Email/SMS notifications
```

## Annotation Highlights

### Business Context

Every module includes business context metadata:

```python
"""
@codegraph
type: module
description: FastAPI application entry point for the e-commerce API
owner: platform-team
status: stable
context:
  business_goal: Provide REST API for e-commerce frontend
  funnel_stage: activation
  revenue_impact: critical
"""
```

### Compliance

The payment service demonstrates compliance annotations:

```python
"""
@codegraph
type: function
description: Processes a one-time payment charge through Stripe
compliance:
  regulations: [PCI-DSS]
  data_sensitivity: restricted
"""
```

### Dependencies & Operations

Services declare their dependencies and operational metadata:

```python
"""
@codegraph
dependencies:
  services: [auth-service, payment-service, inventory-service]
  databases: [postgres-main, redis-cache]
operational:
  sla: "99.9%"
  on_call_team: platform-team
"""
```

## Try It

```bash
# From the repository root
codegraph index examples/python-fastapi
codegraph query --owner "payments-team"
codegraph query "payment"
```
