from fastapi import APIRouter, Depends
from lib.db import get_db
from lib.deps import get_current_user

router = APIRouter()

@router.get('/')
async def list_dlq(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.dead_letter_queue.find().sort('created_at', -1).to_list(None)
    return {'items': items}
