"""
@codegraph
type: module
description: FastAPI application entry point for the e-commerce API
owner: platform-team
status: stable
tags: [api, fastapi, e-commerce]
links:
  - type: notion
    url: https://notion.so/api-architecture
    title: API Architecture Document
context:
  business_goal: Provide REST API for e-commerce frontend
  funnel_stage: activation
  revenue_impact: critical
dependencies:
  services: [auth-service, payment-service, inventory-service]
  databases: [postgres-main, redis-cache]
operational:
  sla: "99.9%"
  on_call_team: platform-team
  monitoring_dashboards:
    - type: datadog
      url: https://app.datadoghq.com/dashboard/ecommerce-api
      title: E-Commerce API Dashboard
"""

from fastapi import FastAPI, Depends
from .routers import users, products, orders
from .auth import get_current_user

app = FastAPI(title="E-Commerce API", version="1.0.0")

app.include_router(users.router, prefix="/api/v1/users")
app.include_router(products.router, prefix="/api/v1/products")
app.include_router(orders.router, prefix="/api/v1/orders")


def create_app() -> FastAPI:
    """
    @codegraph
    type: function
    description: Factory function that creates and configures the FastAPI application instance
    owner: platform-team
    status: stable
    tags: [api, factory, configuration]
    """
    application = FastAPI(
        title="E-Commerce API",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )
    application.include_router(users.router, prefix="/api/v1/users")
    application.include_router(products.router, prefix="/api/v1/products")
    application.include_router(orders.router, prefix="/api/v1/orders")
    return application
