"""Node type metadata — tells the frontend what nodes exist."""
from fastapi import APIRouter
from app.engine import node_registry

router = APIRouter()


@router.get("/nodes")
def list_nodes():
    return {"node_types": node_registry.list_types()}
