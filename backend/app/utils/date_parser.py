from datetime import datetime, timezone
from typing import Optional
import pandas as pd


def parse_date(date_val) -> Optional[datetime]:
    """Parse various date formats into a standard datetime object."""
    if date_val is None or pd.isna(date_val):
        return None
    
    if isinstance(date_val, datetime):
        return date_val
        
    if isinstance(date_val, pd.Timestamp):
        return date_val.to_pydatetime()
        
    date_str = str(date_val).strip()
    if not date_str or date_str.lower() in ("nan", "none", "null", ""):
        return None

    # Try common formats
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue

    # Fallback to pandas parser
    try:
        parsed = pd.to_datetime(date_str, errors="coerce")
        if pd.notna(parsed):
            return parsed.to_pydatetime()
    except Exception:
        pass

    return None
