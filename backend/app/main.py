"""
AeroTwin-UAV FastAPI Application Entrypoint
===========================================
Main application setup, middleware configuration, global error handling,
and API route mounting.

Software-only research prototype.
"""

import logging
import asyncio
from contextlib import asynccontextmanager
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.core.config import settings
from backend.app.api import api_router
from backend.app.api.websocket import router as websocket_router
from backend.app.services.twin_service import service_manager

# Configure server-side logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aerotwin.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warms fleet simulations and ML models on server startup for instant response."""
    try:
        await asyncio.to_thread(service_manager.ensure_fleet_simulation)
        await asyncio.to_thread(service_manager.step_fleet_simulation)
        logger.info("AeroTwin-UAV fleet simulations and digital twin models pre-warmed successfully.")
    except Exception as e:
        logger.warning("Startup pre-warm notice: %s", e)
    yield


# Initialize FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# -----------------------------------------------------------------------------
# CORS Middleware Configuration (Supporting React development origin)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Structured Error Handlers (No raw stack traces exposed to clients)
# -----------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Formats standard HTTP errors with consistent JSON responses."""
    logger.warning("HTTP %d error on %s %s: %s", exc.status_code, request.method, request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Formats Pydantic request validation errors cleanly."""
    raw_errors = exc.errors()
    clean_errors = [
        {
            "loc": [str(l) for l in err.get("loc", [])],
            "msg": str(err.get("msg", "")),
            "type": str(err.get("type", ""))
        }
        for err in raw_errors
    ]
    logger.info("Validation error on %s %s: %s", request.method, request.url.path, clean_errors)
    first_msg = clean_errors[0]["msg"] if clean_errors else "Invalid request body."
    loc = " -> ".join(clean_errors[0]["loc"]) if clean_errors else ""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": f"Validation failed at '{loc}': {first_msg}",
            "errors": clean_errors
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catches unhandled server exceptions without leaking internal stack traces."""
    logger.error("Unhandled internal error on %s %s: %s", request.method, request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please verify backend logs."}
    )


# -----------------------------------------------------------------------------
# Mount API Routes under /api
# -----------------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(websocket_router)


@app.get("/", tags=["Root"])
def root_index():
    """Service metadata and interactive documentation link."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "documentation": "/docs",
        "openapi": "/openapi.json"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
