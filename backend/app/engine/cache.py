"""In-process node result cache keyed by content hash."""
import hashlib
import json
from app.engine.models import NodeResult

_cache: dict[str, NodeResult] = {}


def _make_key(node_id: str, config: dict, input_keys: list[str]) -> str:
    payload = json.dumps(
        {"node_id": node_id, "config": config, "inputs": sorted(input_keys)},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def get(node_id: str, config: dict, input_keys: list[str]) -> NodeResult | None:
    key = _make_key(node_id, config, input_keys)
    return _cache.get(key)


def put(node_id: str, config: dict, input_keys: list[str], result: NodeResult) -> str:
    key = _make_key(node_id, config, input_keys)
    result.cache_key = key
    _cache[key] = result
    return key


def invalidate(cache_key: str) -> None:
    _cache.pop(cache_key, None)


def clear() -> None:
    _cache.clear()
