from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from ..lib.db import get_db
from ..lib.deps import get_current_user
from ..lib.schemas import QueueCreatePayload, QueuePatchPayload
from ..lib.utils import slugify, now

router = APIRouter()

@router.get('/')
async def list_queues(projectId: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    db = get_db()
    filter_query = {'project_id': projectId} if projectId else {}
    queues = await db.queues.find(filter_query).sort('created_at', -1).to_list(None)
    enriched = []
    for queue in queues:
        pending = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'pending'})
        queued = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'queued'})
        running = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'running'})
        completed = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'completed'})
        failed = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'failed'})
        dead = await db.jobs.count_documents({'queue_id': queue['id'], 'status': 'dead'})
        project = await db.projects.find_one({'id': queue['project_id']})
        enriched.append({
            **queue,
            'project': project,
            'stats': {
                'pending': pending,
                'queued': queued,
                'running': running,
                'completed': completed,
                'failed': failed,
                'dead': dead,
            },
        })
    return {'queues': enriched}

@router.post('/')
async def create_queue(payload: QueueCreatePayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    slug = f"{slugify(payload.name)}-{now().timestamp():.0f}"[:60]
    queue = {
        'id': f'queue_{now().timestamp():.0f}_{payload.name[:6]}',
        'project_id': payload.projectId,
        'name': payload.name,
        'slug': slug,
        'description': payload.description,
        'concurrency': payload.concurrency or 5,
        'priority': payload.priority or 0,
        'max_attempts': payload.maxAttempts or 3,
        'backoff_type': payload.backoffType or 'exponential',
        'backoff_delay_ms': payload.backoffDelayMs or 2000,
        'is_paused': False,
        'created_at': now(),
        'updated_at': now(),
    }
    await db.queues.insert_one(queue)
    return {'queue': queue}

@router.patch('/{queue_id}')
async def update_queue(queue_id: str, payload: QueuePatchPayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if k != 'projectId'}
    if not update:
        raise HTTPException(status_code=400, detail='No update payload')
    update['updated_at'] = now()
    result = await db.queues.update_one({'id': queue_id}, {'$set': update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Queue not found')
    queue = await db.queues.find_one({'id': queue_id})
    return {'queue': queue}

@router.post('/{queue_id}/pause')
async def pause_queue(queue_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.queues.update_one({'id': queue_id}, {'$set': {'is_paused': True, 'updated_at': now()}})
    queue = await db.queues.find_one({'id': queue_id})
    return {'queue': queue}

@router.post('/{queue_id}/resume')
async def resume_queue(queue_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.queues.update_one({'id': queue_id}, {'$set': {'is_paused': False, 'updated_at': now()}})
    queue = await db.queues.find_one({'id': queue_id})
    return {'queue': queue}

@router.delete('/{queue_id}')
async def delete_queue(queue_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.queues.delete_one({'id': queue_id})
    return {'ok': True}

@router.get('/{queue_id}')
async def get_queue(queue_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    queue = await db.queues.find_one({'id': queue_id})
    if not queue:
        raise HTTPException(status_code=404, detail='Queue not found')
    queue['project'] = await db.projects.find_one({'id': queue['project_id']})
    queue['scheduled_jobs'] = await db.scheduled_jobs.find({'queue_id': queue_id}).to_list(None)
    return {'queue': queue}
