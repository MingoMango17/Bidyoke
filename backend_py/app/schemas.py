from pydantic import BaseModel


class JoinBody(BaseModel):
    name: str
