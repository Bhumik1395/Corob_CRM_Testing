import os
from dbutils.pooled_db import PooledDB
import pymysql

_pool: PooledDB | None = None


def get_pool() -> PooledDB:
    global _pool
    if _pool is None:
        ssl_kwargs = {}
        if os.getenv("MYSQL_SSL", "").lower() in ("1", "true", "yes"):
            ca = os.getenv("MYSQL_SSL_CA")
            ssl_kwargs["ssl"] = {"ca": ca} if ca else {"check_hostname": False}

        _pool = PooledDB(
            creator=pymysql,
            maxconnections=int(os.getenv("MYSQL_POOL_SIZE", "10")),
            mincached=2,
            host=os.getenv("MYSQL_HOST", "localhost"),
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=os.getenv("MYSQL_USER", "corob"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DATABASE", "corob_service"),
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True,
            connect_timeout=10,
            **ssl_kwargs,
        )
    return _pool


def get_connection():
    """Use as a context manager: `with get_connection() as conn: ...`"""
    return get_pool().connection()
