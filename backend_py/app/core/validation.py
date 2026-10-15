from app.errors import AppError

NAME_MAX = 24


def clean_name(raw: str) -> str:
    name = raw.strip()
    if not name or len(name) > NAME_MAX or any(ord(c) < 32 or ord(c) == 127 for c in name):
        raise AppError(422, "invalid_name", f"Name must be 1-{NAME_MAX} characters.")
    return name
