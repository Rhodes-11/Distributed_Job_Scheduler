from fastapi import APIRouter, Depends, HTTPException
from lib.db import get_db
from lib.deps import get_current_user
from lib.schemas import ProjectCreatePayload
from lib.utils import now, slugify

router = APIRouter()

@router.get('/')
async def list_projects(current_user: dict = Depends(get_current_user)):
    db = get_db()
    memberships = await db.memberships.find({'user_id': current_user['id']}).to_list(None)
    org_ids = [m['organization_id'] for m in memberships]
    projects = await db.projects.find({'organization_id': {'$in': org_ids}}).sort('created_at', -1).to_list(None)
    enriched = []
    for project in projects:
        queues = await db.queues.find({'project_id': project['id']}).to_list(None)
        queue_ids = [q['id'] for q in queues]
        total = await db.jobs.count_documents({'queue_id': {'$in': queue_ids}})
        running = await db.jobs.count_documents({'queue_id': {'$in': queue_ids}, 'status': 'running'})
        failed = await db.jobs.count_documents({'queue_id': {'$in': queue_ids}, 'status': 'failed'})
        completed = await db.jobs.count_documents({'queue_id': {'$in': queue_ids}, 'status': 'completed'})
        enriched.append({
            **project,
            '_count': {'queues': len(queues)},
            'stats': {'total': total, 'running': running, 'failed': failed, 'completed': completed},
        })
    return {'projects': enriched}

@router.post('/')
async def create_project(payload: ProjectCreatePayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    org_id = payload.organizationId
    if not org_id:
        membership = await db.memberships.find_one({'user_id': current_user['id']})
        if not membership:
            raise HTTPException(status_code=400, detail='No organization for user')
        org_id = membership['organization_id']
    slug = f"{slugify(payload.name)}-{now().timestamp():.0f}"[:60]
    project = {
        'id': f'proj_{now().timestamp():.0f}_{payload.name[:6]}',
        'organization_id': org_id,
        'name': payload.name,
        'slug': slug,
        'description': payload.description,
        'color': payload.color or '#FF5A00',
        'created_at': now(),
        'updated_at': now(),
    }
    await db.projects.insert_one(project)
    return {'project': project}

@router.get('/{project_id}')
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    project = await db.projects.find_one({'id': project_id})
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    project['queues'] = await db.queues.find({'project_id': project_id}).to_list(None)
    return {'project': project}

@router.delete('/{project_id}')
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.projects.delete_one({'id': project_id})
    return {'ok': True}
