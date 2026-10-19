from starlette.requests import HTTPConnection

from app.container import Container


def get_container(conn: HTTPConnection) -> Container:
    return conn.app.state.container
