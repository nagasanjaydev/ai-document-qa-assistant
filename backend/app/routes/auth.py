import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from backend.app.models.user import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from backend.app.database.mongodb import get_users_collection
from backend.app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegisterRequest):
    users_col = get_users_collection()
    email_clean = req.email.strip().lower()

    existing = await users_col.find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    username = req.username or email_clean.split("@")[0]
    hashed_pw = hash_password(req.password)

    user_doc = {
        "id": user_id,
        "_id": user_id,
        "email": email_clean,
        "username": username,
        "password_hash": hashed_pw,
        "created_at": now
    }
    await users_col.insert_one(user_doc)

    user_resp = UserResponse(
        id=user_id,
        email=email_clean,
        username=username,
        created_at=now
    )
    token = create_access_token({"sub": user_id, "email": email_clean})
    return TokenResponse(access_token=token, user=user_resp)


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    users_col = get_users_collection()
    email_clean = req.email.strip().lower()

    user = await users_col.find_one({"email": email_clean})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = str(user.get("id") or user.get("_id"))
    user_resp = UserResponse(
        id=user_id,
        email=user.get("email", email_clean),
        username=user.get("username", email_clean.split("@")[0]),
        created_at=str(user.get("created_at", ""))
    )
    token = create_access_token({"sub": user_id, "email": user_resp.email})
    return TokenResponse(access_token=token, user=user_resp)


@router.post("/demo", response_model=TokenResponse)
async def demo_login():
    users_col = get_users_collection()
    demo_id = "demo-user-001"
    user = await users_col.find_one({"$or": [{"_id": demo_id}, {"id": demo_id}]})
    now = datetime.now(timezone.utc).isoformat()

    if not user:
        user = {
            "id": demo_id,
            "_id": demo_id,
            "email": "demo@documind.ai",
            "username": "Demo User",
            "password_hash": hash_password("demo1234"),
            "created_at": now
        }
        await users_col.insert_one(user)

    user_resp = UserResponse(
        id=demo_id,
        email=user.get("email", "demo@documind.ai"),
        username=user.get("username", "Demo User"),
        created_at=str(user.get("created_at", now))
    )
    token = create_access_token({"sub": demo_id, "email": user_resp.email})
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        username=current_user["username"],
        created_at=current_user["created_at"]
    )
