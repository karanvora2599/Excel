from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.routes import health, upload, workflow, execute, exports, nodes


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:  # type: ignore[misc]
    init_db()
    yield


app = FastAPI(title="GridFlow", version="0.1.0", lifespan=lifespan)  # type: ignore[arg-type]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(upload.router, prefix="/files", tags=["files"])
app.include_router(workflow.router, prefix="/workflows", tags=["workflows"])
app.include_router(execute.router, prefix="/workflows", tags=["execute"])
app.include_router(exports.router, prefix="/files", tags=["exports"])
app.include_router(nodes.router, tags=["nodes"])
