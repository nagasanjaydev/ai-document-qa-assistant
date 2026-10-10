import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from backend.app.models.user import UserCreate, UserLogin, UserResponse, Token
from backend.app.database import get_users_collection
from backend.app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_in: UserCreate):
    users_col = get_users_collection()
    
    # Check if username or email already exists
    existing = await users_col.find_one({
        "$or": [
            {"username": user_in.username.lower()},
            {"email": user_in.email.lower()}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    hashed = hash_password(user_in.password)

    user_doc = {
        "id": user_id,
        "_id": user_id,
        "username": user_in.username,
        "email": user_in.email.lower(),
        "hashed_password": hashed,
        "created_at": now
    }
    await users_col.insert_one(user_doc)

    user_resp = UserResponse(
        id=user_id,
        username=user_in.username,
        email=user_in.email.lower(),
        created_at=now
    )
    token = create_access_token(data={"sub": user_id, "username": user_in.username})
    return Token(access_token=token, user=user_resp)


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    users_col = get_users_collection()
    identifier = credentials.username_or_email.lower()

    user_doc = await users_col.find_one({
        "$or": [
            {"username": identifier},
            {"email": identifier}
        ]
    })
    if not user_doc or not verify_password(credentials.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    user_id = str(user_doc.get("id") or user_doc.get("_id"))
    user_resp = UserResponse(
        id=user_id,
        username=user_doc.get("username", "User"),
        email=user_doc.get("email", ""),
        created_at=str(user_doc.get("created_at", ""))
    )
    token = create_access_token(data={"sub": user_id, "username": user_resp.username})
    return Token(access_token=token, user=user_resp)


@router.post("/demo", response_model=Token)
async def demo_login():
    """Quick demo user login for effortless evaluation"""
    users_col = get_users_collection()
    demo_id = "demo-user-001"
    demo_doc = await users_col.find_one({"$or": [{"_id": demo_id}, {"id": demo_id}]})
    
    now = datetime.now(timezone.utc).isoformat()
    if not demo_doc:
        demo_doc = {
            "id": demo_id,
            "_id": demo_id,
            "username": "Demo User",
            "email": "demo@example.com",
            "hashed_password": hash_password("demo1234"),
            "created_at": now
        }
        await users_col.insert_one(demo_doc)

    user_resp = UserResponse(
        id=demo_id,
        username=demo_doc.get("username", "Demo User"),
        email=demo_doc.get("email", "demo@example.com"),
        created_at=str(demo_doc.get("created_at", now))
    )
    token = create_access_token(data={"sub": demo_id, "username": user_resp.username})
    return Token(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user
