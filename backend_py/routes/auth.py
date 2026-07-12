import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordBearer
from lib.auth import AuthError, hash_password, issue_refresh_token, revoke_refresh_token, rotate_refresh_token, sign_access_token, verify_password
from lib.db import get_db
from lib.deps import get_current_user
from lib.schemas import LoginPayload, RegisterPayload, TokenResponse, UserOut

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='token')

COOKIE_OPTIONS = {
    'httponly': True,
    'secure': os.getenv('NODE_ENV') == 'production',
    'samesite': 'lax',
    'path': '/',
}


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie('access_token', access_token, max_age=int(os.getenv('JWT_ACCESS_TTL_MIN', '15')) * 60, **COOKIE_OPTIONS)
    response.set_cookie('refresh_token', refresh_token, max_age=int(os.getenv('JWT_REFRESH_TTL_DAYS', '7')) * 24 * 60 * 60, **COOKIE_OPTIONS)


async def get_user_by_email(db, email: str):
    return await db.users.find_one({'email': email.lower()})


async def get_user_by_id(db, user_id: str):
    return await db.users.find_one({'id': user_id})


def serialize_user(user: dict) -> dict:
    return {
        'id': user.get('id'),
        'email': user.get('email'),
        'name': user.get('name'),
        'role': user.get('role', 'owner'),
        'avatarUrl': user.get('avatar_url'),
    }


def build_auth_payload(user: dict, access_token: str, refresh_token: str) -> dict:
    return {
        'accessToken': access_token,
        'access_token': access_token,
        'refreshToken': refresh_token,
        'refresh_token': refresh_token,
        'user': serialize_user(user),
    }


@router.post('/register', response_model=TokenResponse)
async def register(payload: RegisterPayload, request: Request, response: Response):
    db = get_db()
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail='Email already registered')
    password_hash = hash_password(payload.password)
    user = {
        'id': str((await db.users.count_documents({})) + 1),
        'email': payload.email.lower(),
        'password_hash': password_hash,
        'name': payload.name,
        'role': 'owner',
        'avatar_url': None,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    await db.users.insert_one(user)
    access_token = sign_access_token({'sub': user['id'], 'email': user['email'], 'role': user['role']})
    refresh_token, _expires_at = await issue_refresh_token(user['id'], {
        'user_agent': request.headers.get('user-agent'),
        'ip_address': request.client.host if request.client else None,
    })
    set_auth_cookies(response, access_token, refresh_token)
    return build_auth_payload(user, access_token, refresh_token)


@router.post('/login', response_model=TokenResponse)
async def login(payload: LoginPayload, request: Request, response: Response):
    db = get_db()
    user = await get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    access_token = sign_access_token({'sub': user['id'], 'email': user['email'], 'role': user['role']})
    refresh_token, _expires_at = await issue_refresh_token(user['id'], {
        'user_agent': request.headers.get('user-agent'),
        'ip_address': request.client.host if request.client else None,
    })
    set_auth_cookies(response, access_token, refresh_token)
    return build_auth_payload(user, access_token, refresh_token)


@router.post('/refresh', response_model=TokenResponse)
async def refresh(request: Request, response: Response):
    token = request.cookies.get('refresh_token')
    if not token:
        raise HTTPException(status_code=401, detail='No refresh token provided')
    try:
        access_token, refresh_token, user_id = await rotate_refresh_token(token, {
            'user_agent': request.headers.get('user-agent'),
            'ip_address': request.client.host if request.client else None,
        })
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    db = get_db()
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    set_auth_cookies(response, access_token, refresh_token)
    return build_auth_payload(user, access_token, refresh_token)


@router.post('/logout')
async def logout(request: Request, response: Response):
    token = request.cookies.get('refresh_token')
    if token:
        await revoke_refresh_token(token)
    response.delete_cookie('access_token', path='/')
    response.delete_cookie('refresh_token', path='/')
    return {'ok': True}


@router.get('/me')
async def me(current_user: dict = Depends(get_current_user)):
    return {'user': serialize_user(current_user)}
