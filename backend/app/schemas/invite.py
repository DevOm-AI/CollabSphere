from datetime import datetime

from pydantic import BaseModel


class InviteCodeRead(BaseModel):
    id: int
    college: str
    code: str
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
