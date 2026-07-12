from pydantic import BaseModel, EmailStr, Field
from typing import Any, Optional, Literal

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    avatar_url: Optional[str] = None

class RegisterPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=120)

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: Optional[UserOut] = None

class ProjectCreatePayload(BaseModel):
    organizationId: Optional[str] = None
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    color: Optional[str] = None

class QueueCreatePayload(BaseModel):
    projectId: str
    name: str = Field(min_length=1, max_length=120)
    description: Optional[str] = None
    concurrency: Optional[int] = None
    priority: Optional[int] = None
    maxAttempts: Optional[int] = None
    backoffType: Optional[Literal['fixed', 'exponential']] = None
    backoffDelayMs: Optional[int] = None

class QueuePatchPayload(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    concurrency: Optional[int] = None
    priority: Optional[int] = None
    maxAttempts: Optional[int] = None
    backoffType: Optional[Literal['fixed', 'exponential']] = None
    backoffDelayMs: Optional[int] = None
    isPaused: Optional[bool] = None

class JobCreatePayload(BaseModel):
    queueId: str
    name: str = Field(min_length=1, max_length=200)
    type: Optional[Literal['immediate', 'delayed', 'scheduled', 'recurring', 'batch']] = None
    priority: Optional[int] = None
    payload: Optional[dict[str, Any]] = None
    runAt: Optional[str] = None
    delayMs: Optional[int] = None
    cron: Optional[str] = None
    idempotencyKey: Optional[str] = None
    maxAttempts: Optional[int] = None
