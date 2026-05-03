from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workflow import Workflow
from app.engine.graph_executor import execute_graph
from app.engine.models import WorkflowGraph, RunResponse
from app.engine import cache as node_cache

router = APIRouter()


@router.post("/{workflow_id}/run", response_model=RunResponse)
def run_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    graph = WorkflowGraph.model_validate(wf.graph)
    return execute_graph(graph)


@router.post("/{workflow_id}/run/{node_id}", response_model=RunResponse)
def run_from_node(workflow_id: str, node_id: str, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    graph = WorkflowGraph.model_validate(wf.graph)
    node_ids = {n.id for n in graph.nodes}
    if node_id not in node_ids:
        raise HTTPException(404, "Node not found in workflow")
    return execute_graph(graph, from_node=node_id)


@router.delete("/{workflow_id}/cache")
def clear_cache(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    node_cache.clear()
    return {"cleared": True}
