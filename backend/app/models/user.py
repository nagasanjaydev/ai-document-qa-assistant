from typing import Optional
from pydantic import BaseModel, Field


class UserRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6)
    username: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
