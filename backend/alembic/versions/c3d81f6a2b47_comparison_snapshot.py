"""comparison snapshot

Stores the purchase and offer values each saved comparison was calculated
from, so the shared link no longer depends on rows that can be edited later.

Revision ID: c3d81f6a2b47
Revises: b7c2e4a19f30
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c3d81f6a2b47"
down_revision: Union[str, None] = "b7c2e4a19f30"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("comparisons", sa.Column("snapshot", postgresql.JSONB(), nullable=True))

    # Las comparativas ya guardadas no conservan los valores originales: se
    # rellenan con los actuales, que es la mejor aproximación disponible.
    op.execute(
        """
        UPDATE comparisons c
        SET snapshot = jsonb_build_object(
            'purchase_name', p.name,
            'price_cash', p.price_cash::text,
            'source_name', o.source_name,
            'down_payment', o.down_payment::text,
            'tin', o.tin::text,
            'tae', o.tae::text,
            'months', o.months,
            'monthly_payment', o.monthly_payment::text,
            'residual_value', CASE
                WHEN o.residual_value > 0 THEN o.residual_value::text
                WHEN o.residual_value IS NULL AND o.residual_value_percent > 0
                    THEN round(p.price_cash * o.residual_value_percent / 100, 2)::text
            END
        )
        FROM purchases p, financing_offers o
        WHERE p.id = c.purchase_id AND o.id = c.financing_offer_id
        """
    )

    op.alter_column("comparisons", "snapshot", nullable=False)


def downgrade() -> None:
    op.drop_column("comparisons", "snapshot")
