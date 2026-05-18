from app.models.connection import Connection
from app.repositories.base import BaseRepository


class ConnectionRepository(BaseRepository[Connection]):
    def __init__(self, db):
        super().__init__(Connection, db)
