from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta
from croniter import croniter
from lib.db import get_db
from lib.deps import get_current_user
from lib.schemas import JobCreatePayload
from lib.utils import now

router = APIRouter()

@router.post('/')
async def create_job(payload: JobCreatePayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    queue = await db.queues.find_one({'id': payload.queueId})
    if not queue:
        raise HTTPException(status_code=404, detail='Queue not found')
    run_at = datetime.utcnow()
    if payload.runAt:
        run_at = datetime.fromisoformat(payload.runAt.replace('Z', '+00:00'))
    elif payload.delayMs is not None:
        run_at = datetime.utcnow() + timedelta(milliseconds=payload.delayMs)

    if payload.type == 'recurring':
        if not payload.cron:
            raise HTTPException(status_code=400, detail='Cron expression required for recurring jobs')
        interval = croniter(payload.cron, datetime.utcnow())
        next_run = interval.get_next(datetime)
        scheduled = {
            'id': f'sch_{now().timestamp():.0f}_{payload.name[:6]}',
            'queue_id': payload.queueId,
            'name': payload.name,
            'cron': payload.cron,
            'timezone': 'UTC',
            'payload': payload.payload or {},
            'is_active': True,
            'last_run_at': None,
            'next_run_at': next_run,
            'created_at': now(),
            'updated_at': now(),
        }
        await db.scheduled_jobs.insert_one(scheduled)
        return {'scheduled': True, 'nextRunAt': next_run.isoformat()}

    status = 'delayed' if run_at > datetime.utcnow() else 'pending'
    job = {
        'id': f'job_{now().timestamp():.0f}_{payload.name[:6]}',
        'queue_id': payload.queueId,
        'name': payload.name,
        'type': payload.type or 'immediate',
        'status': status,
        'priority': payload.priority or 0,
        'payload': payload.payload or {},
        'result': None,
        'error': None,
        'attempts': 0,
        'max_attempts': payload.maxAttempts or queue.get('max_attempts', 3),
        'run_at': run_at,
        'started_at': None,
        'finished_at': None,
        'worker_id': None,
        'parent_job_id': None,
        'idempotency_key': payload.idempotencyKey,
        'lock_token': None,
        'locked_until': None,
        'version': 0,
        'created_at': now(),
        'updated_at': now(),
    }
    await db.jobs.insert_one(job)
    return {'job': job}

@router.get('/')
async def list_jobs(
    queueId: Optional[str] = Query(None),
    projectId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query('created_at'),
    order: str = Query('desc'),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    query = {}
    if queueId:
        query['queue_id'] = queueId
    if projectId:
        queue_ids = [q['id'] for q in await db.queues.find({'project_id': projectId}).to_list(None)]
        query['queue_id'] = {'$in': queue_ids}
    if status:
        query['status'] = status
    if search:
        query['name'] = {'$regex': search, '$options': 'i'}
    total = await db.jobs.count_documents(query)
    sort_dir = -1 if order == 'desc' else 1
    jobs = await db.jobs.find(query).sort(sort, sort_dir).skip((page - 1) * limit).limit(limit).to_list(None)
    queue_ids = list({job['queue_id'] for job in jobs})
    queues = await db.queues.find({'id': {'$in': queue_ids}}).to_list(None)
    queue_map = {q['id']: q for q in queues}
    items = []
    for job in jobs:
        job['queue'] = queue_map.get(job['queue_id'])
        items.append(job)
    return {'items': items, 'page': page, 'limit': limit, 'total': total, 'totalPages': (total + limit - 1) // limit}

@router.get('/{job_id}')
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({'id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    job['queue'] = await db.queues.find_one({'id': job['queue_id']})
    job['executions'] = await db.job_executions.find({'job_id': job_id}).sort('attempt', 1).to_list(None)
    job['logs'] = await db.job_logs.find({'job_id': job_id}).sort('created_at', 1).to_list(None)
    return {'job': job}

@router.post('/{job_id}/retry')
async def retry_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    job = await db.jobs.find_one({'id': job_id})
    if not job:
        raise HTTPException(status_code=404, detail='Job not found')
    await db.jobs.update_one(
        {'id': job_id},
        {'$set': {
            'status': 'pending',
            'error': None,
            'result': None,
            'run_at': datetime.utcnow(),
            'started_at': None,
            'finished_at': None,
            'worker_id': None,
            'lock_token': None,
            'locked_until': None,
            'attempts': 0,
            'updated_at': now(),
        }},
    )
    await db.dead_letter_queue.delete_many({'job_id': job_id})
    updated = await db.jobs.find_one({'id': job_id})
    return {'job': updated}

@router.post('/{job_id}/cancel')
async def cancel_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    result = await db.jobs.update_one({'id': job_id}, {'$set': {'status': 'cancelled', 'finished_at': datetime.utcnow(), 'updated_at': now()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Job not found')
    job = await db.jobs.find_one({'id': job_id})
    return {'job': job}

@router.delete('/{job_id}')
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.jobs.delete_one({'id': job_id})
    return {'ok': True}
