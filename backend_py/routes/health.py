from fastapi import APIRouter

router = APIRouter()

@router.get('/')
async def read_health():
    return {'status': 'ok'}
