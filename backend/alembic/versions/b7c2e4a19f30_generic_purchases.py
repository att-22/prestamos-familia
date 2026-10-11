"""generic purchases

Renames vehicles -> purchases and leasing_offers -> financing_offers, and adds
a category to purchases. Existing rows are kept and tagged as vehicles.

Revision ID: b7c2e4a19f30
Revises: 94f90e71309d
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7c2e4a19f30"
down_revision: Union[str, None] = "94f90e71309d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (tabla, nombre antiguo, nombre nuevo), en el sentido del upgrade
TABLES = [
    ("vehicles", "purchases"),
    ("leasing_offers", "financing_offers"),
]
COLUMNS = [
    ("financing_offers", "vehicle_id", "purchase_id"),
    ("comparisons", "vehicle_id", "purchase_id"),
    ("comparisons", "leasing_offer_id", "financing_offer_id"),
    ("comparisons", "total_leasing_cost", "total_financing_cost"),
]
INDEXES = [
    ("vehicles_pkey", "purchases_pkey"),
    ("ix_vehicles_user_id", "ix_purchases_user_id"),
    ("leasing_offers_pkey", "financing_offers_pkey"),
    ("ix_leasing_offers_vehicle_id", "ix_financing_offers_purchase_id"),
    ("ix_comparisons_vehicle_id", "ix_comparisons_purchase_id"),
    ("ix_comparisons_leasing_offer_id", "ix_comparisons_financing_offer_id"),
]
CONSTRAINTS = [
    ("purchases", "vehicles_user_id_fkey", "purchases_user_id_fkey"),
    ("financing_offers", "leasing_offers_vehicle_id_fkey", "financing_offers_purchase_id_fkey"),
    ("comparisons", "comparisons_vehicle_id_fkey", "comparisons_purchase_id_fkey"),
    ("comparisons", "comparisons_leasing_offer_id_fkey", "comparisons_financing_offer_id_fkey"),
]


def upgrade() -> None:
    for old, new in TABLES:
        op.rename_table(old, new)
    for table, old, new in COLUMNS:
        op.alter_column(table, old, new_column_name=new)
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX "{old}" RENAME TO "{new}"')
    for table, old, new in CONSTRAINTS:
        op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}"')

    # Todo lo que existía hasta ahora eran vehículos
    op.add_column("purchases", sa.Column("category", sa.VARCHAR(length=20), nullable=False, server_default="vehicle"))
    op.alter_column("purchases", "category", server_default=None)


def downgrade() -> None:
    op.drop_column("purchases", "category")

    for table, old, new in CONSTRAINTS:
        op.execute(f'ALTER TABLE "{table}" RENAME CONSTRAINT "{new}" TO "{old}"')
    for old, new in INDEXES:
        op.execute(f'ALTER INDEX "{new}" RENAME TO "{old}"')
    for table, old, new in COLUMNS:
        op.alter_column(table, new, new_column_name=old)
    for old, new in TABLES:
        op.rename_table(new, old)
