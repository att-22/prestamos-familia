"""password auth

Replaces the unused Supabase identifier with a bcrypt password hash.

Revision ID: d4a7c9e05b12
Revises: c3d81f6a2b47
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d4a7c9e05b12"
down_revision: Union[str, None] = "c3d81f6a2b47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.VARCHAR(length=255), nullable=True))
    op.drop_index("ix_users_supabase_id", table_name="users")
    op.drop_column("users", "supabase_id")


def downgrade() -> None:
    op.add_column("users", sa.Column("supabase_id", sa.VARCHAR(length=255), nullable=True))
    # El valor original no se conserva: se genera uno único a partir del id
    op.execute("UPDATE users SET supabase_id = 'legacy-' || id::text")
    op.alter_column("users", "supabase_id", nullable=False)
    op.create_index("ix_users_supabase_id", "users", ["supabase_id"], unique=True)
    op.drop_column("users", "password_hash")
