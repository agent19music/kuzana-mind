"""billing — org_subscriptions, promo_codes, promo_redemptions

Revision ID: d1e2f3a4b5c6
Revises: c2d3e4f5a6b7
Create Date: 2026-09-03

Org-level entitlements for Starter/Pro (Paddle subscriptions + in-app promo
grants). No RLS — same rationale as ingest_jobs / integration_interest: no
tenant document content, every read is filtered by clerk_org_id in app code.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "org_subscriptions",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "clerk_org_id",
            sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("plan", sa.String(), nullable=False, server_default="starter"),  # starter | pro
        sa.Column("status", sa.String(), nullable=False, server_default="active"),  # active | past_due | canceled | trialing
        sa.Column("source", sa.String(), nullable=False),  # paddle | promo
        sa.Column("seats", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paddle_customer_id", sa.String(), nullable=True),
        sa.Column("paddle_subscription_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("clerk_org_id", name="uq_org_subscriptions_clerk_org"),
    )
    op.create_index("ix_org_subscriptions_clerk_org", "org_subscriptions", ["clerk_org_id"])
    op.create_index("ix_org_subscriptions_paddle_sub", "org_subscriptions", ["paddle_subscription_id"])

    op.create_table(
        "promo_codes",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("grant_plan", sa.String(), nullable=False, server_default="pro"),
        sa.Column("duration_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("max_redemptions", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("code", name="uq_promo_codes_code"),
    )

    op.create_table(
        "promo_redemptions",
        sa.Column("id", postgresql.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "promo_code_id",
            postgresql.UUID(),
            sa.ForeignKey("promo_codes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "clerk_org_id",
            sa.String(),
            sa.ForeignKey("organizations.clerk_org_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("redeemed_by", sa.String(), nullable=False),  # clerk_user_id
        sa.Column("redeemed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("promo_code_id", "clerk_org_id", name="uq_promo_redemptions_code_org"),
        sa.UniqueConstraint("clerk_org_id", name="uq_promo_redemptions_org"),  # one early-bird grant per org
    )
    op.create_index("ix_promo_redemptions_org", "promo_redemptions", ["clerk_org_id"])

    # Seed early-adopter code — in-app redeem grants 30 days of Pro, no card.
    op.execute(
        sa.text(
            "INSERT INTO promo_codes (code, grant_plan, duration_days, active) "
            "VALUES ('ATHENA-EARLY', 'pro', 30, true) "
            "ON CONFLICT (code) DO NOTHING"
        )
    )


def downgrade() -> None:
    op.drop_index("ix_promo_redemptions_org", table_name="promo_redemptions")
    op.drop_table("promo_redemptions")
    op.drop_table("promo_codes")
    op.drop_index("ix_org_subscriptions_paddle_sub", table_name="org_subscriptions")
    op.drop_index("ix_org_subscriptions_clerk_org", table_name="org_subscriptions")
    op.drop_table("org_subscriptions")
