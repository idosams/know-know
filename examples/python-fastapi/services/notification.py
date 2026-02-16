"""
@knowgraph
type: module
description: Notification service handling email, SMS, and push notifications for user events
owner: platform-team
status: stable
tags: [notifications, email, sms, push]
links:
  - type: notion
    url: https://notion.so/notification-strategy
    title: Notification Strategy Document
context:
  business_goal: User engagement and transactional communication
  funnel_stage: retention
  revenue_impact: medium
dependencies:
  external_apis: [sendgrid-api, twilio-api, firebase-fcm]
  databases: [postgres-main, redis-cache]
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class NotificationResult:
    """Result of a notification dispatch attempt."""
    success: bool
    message_id: Optional[str]
    error: Optional[str] = None


def send_email(
    to_email: str,
    template_id: str,
    template_data: dict,
) -> NotificationResult:
    """
    @knowgraph
    type: function
    description: Sends a transactional email using SendGrid templates with retry and tracking
    owner: platform-team
    status: stable
    tags: [notifications, email, sendgrid]
    context:
      funnel_stage: retention
      revenue_impact: medium
    dependencies:
      external_apis: [sendgrid-api]
    """
    pass


def send_order_confirmation(
    user_email: str,
    order_id: str,
    order_total_cents: int,
) -> NotificationResult:
    """
    @knowgraph
    type: function
    description: Sends order confirmation email with receipt and tracking information
    owner: platform-team
    status: stable
    tags: [notifications, email, orders]
    context:
      funnel_stage: revenue
      revenue_impact: high
    """
    pass
