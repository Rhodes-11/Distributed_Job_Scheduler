import re
import uuid
from datetime import datetime


def gen_id() -> str:
    return uuid.uuid4().hex


def slugify(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')[:60]


def now() -> datetime:
    return datetime.utcnow()
