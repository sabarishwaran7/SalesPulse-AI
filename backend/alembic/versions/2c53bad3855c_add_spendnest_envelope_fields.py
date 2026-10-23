"""add_spendnest_envelope_fields

Revision ID: 2c53bad3855c
Revises: fc3dcfb6ef6c
Create Date: 2026-10-23 09:36:40.347305

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c53bad3855c'
down_revision: Union[str, Sequence[str], None] = 'fc3dcfb6ef6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - add SpendNest envelope and routing columns."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_cols = [c['name'] for c in insp.get_columns('conversations')]

    cols_to_add = [
        ('source_type', sa.Column('source_type', sa.String(length=20), nullable=True, server_default='call')),
        ('source_id', sa.Column('source_id', sa.String(length=100), nullable=True)),
        ('record_ref', sa.Column('record_ref', sa.String(length=20), nullable=True)),
        ('revision', sa.Column('revision', sa.Integer(), nullable=True, server_default='1')),
        ('batch_id', sa.Column('batch_id', sa.String(length=50), nullable=True, server_default='initial-001')),
        ('organizer_email', sa.Column('organizer_email', sa.String(length=255), nullable=True)),
        ('rep_email', sa.Column('rep_email', sa.String(length=255), nullable=True)),
        ('direction', sa.Column('direction', sa.String(length=50), nullable=True)),
        ('is_connected', sa.Column('is_connected', sa.Boolean(), nullable=True)),
        ('is_conversation', sa.Column('is_conversation', sa.Boolean(), nullable=True)),
        ('observed_outcome', sa.Column('observed_outcome', sa.String(length=100), nullable=True)),
        ('has_usable_text', sa.Column('has_usable_text', sa.Boolean(), nullable=True, server_default='false')),
        ('unavailable_reason', sa.Column('unavailable_reason', sa.Text(), nullable=True)),
        ('raw_payload', sa.Column('raw_payload', sa.JSON(), nullable=True)),
        ('raw_transcript_payload', sa.Column('raw_transcript_payload', sa.JSON(), nullable=True)),
        ('assigned_routes', sa.Column('assigned_routes', sa.JSON(), nullable=True)),
        ('routing_reason', sa.Column('routing_reason', sa.Text(), nullable=True)),
        ('manual_route_override', sa.Column('manual_route_override', sa.JSON(), nullable=True)),
        ('is_manually_routed', sa.Column('is_manually_routed', sa.Boolean(), nullable=True, server_default='false')),
        ('analysis_freshness', sa.Column('analysis_freshness', sa.String(length=50), nullable=True, server_default='Fresh')),
        ('structured_analysis', sa.Column('structured_analysis', sa.JSON(), nullable=True)),
    ]

    for col_name, col_def in cols_to_add:
        if col_name not in existing_cols:
            op.add_column('conversations', col_def)


def downgrade() -> None:
    """Downgrade schema."""
    pass
