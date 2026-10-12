"""admin allowed emails

Adds the administrator flag and the table of addresses the administrator
allows to register.

Revision ID: e5b8d0f17c63
Revises: d4a7c9e05b12
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "e5b8d0f17c63"
down_revision: Union[str, None] = "d4a7c9e05b12"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.BOOLEAN(), nullable=False, server_default=sa.false()))
    op.alter_column("users", "is_admin", server_default=None)

    op.create_table(
        "allowed_emails",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entry", sa.VARCHAR(length=255), nullable=False),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_allowed_emails_entry"), "allowed_emails", ["entry"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_allowed_emails_entry"), table_name="allowed_emails")
    op.drop_table("allowed_emails")
    op.drop_column("users", "is_admin")
