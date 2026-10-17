import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.errors import AppError

log = logging.getLogger(__name__)


def _body(code: str, message: str) -> dict:
    return {"error": {"code": code, "message": message}}


def install(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        level = logging.WARNING if exc.status >= 500 else logging.INFO
        log.log(level, "%s %s -> %s %s", request.method, request.url.path, exc.status, exc.code)
        return JSONResponse(_body(exc.code, exc.message), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError):
        log.info("%s %s -> 422 invalid_payload", request.method, request.url.path)
        return JSONResponse(_body("invalid_payload", "Invalid request."), status_code=422)
