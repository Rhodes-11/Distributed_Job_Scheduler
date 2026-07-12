import os
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from .password import hash_password

client: AsyncIOMotorClient | None = None

def get_db():
    if client is None:
        raise RuntimeError('Database not initialized')
    return client.pulsequeue


async def seed_demo_user(db) -> None:
    email = os.getenv('ADMIN_EMAIL', 'demo@pulsequeue.dev').lower()
    password = os.getenv('ADMIN_PASSWORD', 'demo1234')
    existing = await db.users.find_one({'email': email})
    if existing:
        return
    demo_user = {
        'id': str(uuid.uuid4()),
        'email': email,
        'password_hash': hash_password(password),
        'name': 'Demo User',
        'role': 'owner',
        'avatar_url': None,
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    }
    await db.users.insert_one(demo_user)


async def init_db() -> None:
    global client
    if client is None:
        uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/pulsequeue')
        client = AsyncIOMotorClient(uri)
        await client.admin.command('ping')
        await seed_demo_user(client.pulsequeue)
