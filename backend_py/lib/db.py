import os
from motor.motor_asyncio import AsyncIOMotorClient

client: AsyncIOMotorClient | None = None

def get_db():
    if client is None:
        raise RuntimeError('Database not initialized')
    return client.pulsequeue

async def init_db() -> None:
    global client
    if client is None:
        uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/pulsequeue')
        client = AsyncIOMotorClient(uri)
        await client.admin.command('ping')
