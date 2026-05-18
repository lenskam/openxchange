from pydantic import BaseModel, EmailStr

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshToken(BaseModel):
    refresh_token: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""
