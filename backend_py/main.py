from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routes.auth import router as auth_router
from routes.projects import router as projects_router
from routes.queues import router as queues_router
from routes.jobs import router as jobs_router
from routes.workers import router as workers_router
from routes.analytics import router as analytics_router
from routes.dlq import router as dlq_router
from routes.health import router as health_router
from lib.db import init_db

load_dotenv()

app = FastAPI(title='PulseQueue API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.on_event('startup')
async def startup_event():
    await init_db()

app.include_router(auth_router, prefix='/api/auth')
app.include_router(projects_router, prefix='/api/projects')
app.include_router(queues_router, prefix='/api/queues')
app.include_router(jobs_router, prefix='/api/jobs')
app.include_router(workers_router, prefix='/api/workers')
app.include_router(analytics_router, prefix='/api/analytics')
app.include_router(dlq_router, prefix='/api/dlq')
app.include_router(health_router, prefix='/api/health')
