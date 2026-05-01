import os
from datetime import datetime, timezone
from typing import Dict, List, Any

from supabase import create_client


def _get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_SERVICE_KEY is missing")
    return create_client(url, key)


def fetch_learned_adjustments() -> Dict[str, float]:
    """
    Reads global learned adjustments from Supabase table: learned_adjustments.
    Expected columns:
      - parameter (text, unique)
      - adjustment_value (double precision)
    """
    supabase = _get_supabase()
    response = (
        supabase.table("learned_adjustments")
        .select("parameter, adjustment_value")
        .execute()
    )
    rows = response.data or []

    learned: Dict[str, float] = {}
    for row in rows:
        param = row.get("parameter")
        value = row.get("adjustment_value")
        if param is not None and value is not None:
            learned[str(param)] = float(value)
    return learned


def store_adjustment_history(transformer_id: str, adjustments: List[Dict[str, Any]]) -> None:
    """
    Stores each correction event in Supabase table: adjustment_history.
    Expected columns:
      - transformer_id (text)
      - adjustments (jsonb)
      - created_at (timestamptz)
    """
    supabase = _get_supabase()
    payload = {
        "transformer_id": transformer_id,
        "adjustments": adjustments,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    supabase.table("adjustment_history").insert(payload).execute()


def update_learned_adjustments(adjustments: List[Dict[str, Any]], learning_rate: float = 0.1) -> None:
    """
    Updates/creates learned adjustment values in Supabase table: learned_adjustments.
    """
    if not adjustments:
        return

    supabase = _get_supabase()

    # Current values (parameter -> adjustment_value)
    current = fetch_learned_adjustments()
    next_values: Dict[str, float] = dict(current)

    for adj in adjustments:
        param = adj.get("parameter")
        diff = float(adj.get("difference", 0.0))
        if not param:
            continue
        next_values[param] = float(next_values.get(param, 0.0) + diff * learning_rate)

    timestamp = datetime.now(timezone.utc).isoformat()
    upsert_rows = [
        {"parameter": param, "adjustment_value": value, "updated_at": timestamp}
        for param, value in next_values.items()
    ]
    if upsert_rows:
        supabase.table("learned_adjustments").upsert(
            upsert_rows, on_conflict="parameter"
        ).execute()
