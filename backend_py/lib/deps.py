from fastapi import Depends, HTTPException, Request
from .auth import AuthError, verify_access_token
from .db import get_db


def extract_token(request: Request) -> str | None:
    token = request.cookies.get('access_token')
    if token:
        return token
    auth_header = request.headers.get('authorization')
    if auth_header and auth_header.lower().startswith('bearer '):
        return auth_header.split(' ', 1)[1]
    return None


async def get_current_user(request: Request) -> dict:
    token = extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = verify_access_token(token)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    db = get_db()
    user = await db.users.find_one({'id': payload['sub']})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user
