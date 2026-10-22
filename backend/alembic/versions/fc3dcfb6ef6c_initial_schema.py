"""initial_schema

Revision ID: fc3dcfb6ef6c
Revises: 
Create Date: 2026-10-22 21:21:20.297272

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fc3dcfb6ef6c'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create all application tables and indexes."""
    from backend.app.core.database import Base
    import backend.app.models  # ensure models registered
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    """Downgrade schema - drop all application tables."""
    from backend.app.core.database import Base
    import backend.app.models
    Base.metadata.drop_all(bind=op.get_bind())
