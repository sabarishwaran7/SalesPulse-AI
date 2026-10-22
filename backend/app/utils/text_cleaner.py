import hashlib
from typing import Optional


def compute_transcript_hash(transcript: Optional[str]) -> Optional[str]:
    """Compute normalized SHA256 hash for transcript to detect actual content changes."""
    if not transcript or not transcript.strip():
        return None
    # Normalize whitespaces
    normalized = " ".join(transcript.strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def clean_string(val) -> Optional[str]:
    """Normalize string, stripping whitespace and handling null/nan."""
    if val is None:
        return None
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "n/a"):
        return None
    return s
