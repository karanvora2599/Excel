import uuid
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workflow import Workflow
from app.engine.models import WorkflowGraph
from pydantic import BaseModel

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str = "Untitled Workflow"
    graph: WorkflowGraph = WorkflowGraph()


class WorkflowUpdate(BaseModel):
    name: str | None = None
    graph: WorkflowGraph | None = None


@router.post("")
def create_workflow(body: WorkflowCreate, db: Session = Depends(get_db)):
    wf = Workflow(
        id=str(uuid.uuid4()),
        name=body.name,
        graph=body.graph.model_dump(),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _wf_response(wf)


@router.get("")
def list_workflows(db: Session = Depends(get_db)):
    wfs = db.query(Workflow).order_by(Workflow.updated_at.desc()).all()
    return [_wf_response(w) for w in wfs]


@router.get("/{workflow_id}")
def get_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return _wf_response(wf)


@router.put("/{workflow_id}")
def update_workflow(workflow_id: str, body: WorkflowUpdate, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    if body.name is not None:
        wf.name = body.name
    if body.graph is not None:
        wf.graph = body.graph.model_dump()
    db.commit()
    db.refresh(wf)
    return _wf_response(wf)


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db)):
    wf = db.get(Workflow, workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    db.delete(wf)
    db.commit()
    return {"deleted": workflow_id}


def _wf_response(wf: Workflow) -> dict:
    return {
        "id": wf.id,
        "name": wf.name,
        "graph": wf.graph,
        "created_at": wf.created_at.isoformat(),
        "updated_at": wf.updated_at.isoformat(),
    }
