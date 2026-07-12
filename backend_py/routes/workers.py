from fastapi import APIRouter, Depends, HTTPException
from ..lib.db import get_db
from ..lib.deps import get_current_user
from ..lib.utils import now

router = APIRouter()

@router.get('/')
async def list_workers(current_user: dict = Depends(get_current_user)):
    db = get_db()
    workers = await db.workers.find().sort('last_heartbeat_at', -1).to_list(None)
    enriched = []
    utc_now = now()
    for worker in workers:
        last = await db.worker_heartbeats.find({'worker_id': worker['id']}).sort('created_at', -1).limit(1).to_list(None)
        latest_heartbeat = last[0] if last else None
        enriched.append({
            **worker,
            'health': 'healthy' if latest_heartbeat and (utc_now - latest_heartbeat['created_at']).total_seconds() < 15 else 'stale',
            'latest_heartbeat': latest_heartbeat,
            '_count': {'executions': await db.job_executions.count_documents({'worker_id': worker['id']})},
        })
    return {'workers': enriched}

@router.get('/{worker_id}')
async def get_worker(worker_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    worker = await db.workers.find_one({'id': worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail='Worker not found')
    worker['heartbeats'] = await db.worker_heartbeats.find({'worker_id': worker_id}).sort('created_at', -1).limit(60).to_list(None)
    worker['jobs'] = await db.jobs.find({'worker_id': worker_id, 'status': 'running'}).limit(5).to_list(None)
    return {'worker': worker}
