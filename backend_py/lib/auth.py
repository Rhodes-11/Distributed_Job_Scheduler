import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.hash import bcrypt
from .db import get_db

ACCESS_SECRET = os.getenv('JWT_ACCESS_SECRET', 'default_access_secret')
REFRESH_SECRET = os.getenv('JWT_REFRESH_SECRET', 'default_refresh_secret')
ACCESS_TTL_MIN = int(os.getenv('JWT_ACCESS_TTL_MIN', '15'))
REFRESH_TTL_DAYS = int(os.getenv('JWT_REFRESH_TTL_DAYS', '7'))

class AuthError(Exception):
    pass


def hash_password(plain: str) -> str:
    return bcrypt.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.verify(plain, hashed)


def sign_access_token(payload: dict) -> str:
    to_encode = payload.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TTL_MIN)
    to_encode.update({'exp': expire, 'type': 'access'})
    return jwt.encode(to_encode, ACCESS_SECRET, algorithm='HS256')


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, ACCESS_SECRET, algorithms=['HS256'])
        if payload.get('type') != 'access':
            raise AuthError('Invalid token type')
        return payload
    except JWTError as exc:
        raise AuthError(str(exc)) from exc


def issue_refresh_token(user_id: str, meta: dict[str, str | None]) -> tuple[str, datetime]:
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TTL_DAYS)
    jti = hashlib.sha256(f'{user_id}-{datetime.utcnow().timestamp()}'.encode()).hexdigest()
    token = jwt.encode({'sub': user_id, 'jti': jti, 'type': 'refresh', 'exp': expires_at}, REFRESH_SECRET, algorithm='HS256')
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db = get_db()
    db.refresh_tokens.insert_one({
        'user_id': user_id,
        'token_hash': token_hash,
        'user_agent': meta.get('user_agent'),
        'ip_address': meta.get('ip_address'),
        'expires_at': expires_at,
        'revoked_at': None,
        'created_at': datetime.utcnow(),
    })
    return token, expires_at


def rotate_refresh_token(old_token: str, meta: dict[str, str | None]) -> tuple[str, datetime, str]:
    try:
        payload = jwt.decode(old_token, REFRESH_SECRET, algorithms=['HS256'])
    except JWTError as exc:
        raise AuthError(str(exc)) from exc
    if payload.get('type') != 'refresh':
        raise AuthError('Invalid token type')
    token_hash = hashlib.sha256(old_token.encode()).hexdigest()
    db = get_db()
    stored = db.refresh_tokens.find_one({'token_hash': token_hash})
    if not stored or stored.get('revoked_at') or stored['expires_at'] < datetime.utcnow():
        raise AuthError('Refresh token invalid or expired')
    db.refresh_tokens.update_one({'_id': stored['_id']}, {'$set': {'revoked_at': datetime.utcnow()}})
    fresh, expires_at = issue_refresh_token(payload['sub'], meta)
    return fresh, expires_at, payload['sub']


def revoke_refresh_token(token: str) -> None:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    db = get_db()
    db.refresh_tokens.update_many({'token_hash': token_hash, 'revoked_at': None}, {'$set': {'revoked_at': datetime.utcnow()}})
