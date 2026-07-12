from fastapi import APIRouter, Depends
from lib.db import get_db
from lib.deps import get_current_user

router = APIRouter()

@router.get('/')
async def analytics(current_user: dict = Depends(get_current_user)):
    db = get_db()
    summary = {
        'jobs_total': await db.jobs.count_documents({}),
        'jobs_completed': await db.jobs.count_documents({'status': 'completed'}),
        'jobs_failed': await db.jobs.count_documents({'status': 'failed'}),
        'workers_total': await db.workers.count_documents({}),
        'queues_total': await db.queues.count_documents({}),
    }
    return {'summary': summary}
