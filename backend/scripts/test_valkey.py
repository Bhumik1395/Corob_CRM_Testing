import redis
from app.core.config import VALKEY_URL
r = redis.from_url(VALKEY_URL)
r.set("sanity_check", "hello", ex=5)
print(r.get("sanity_check")) 
import time; time.sleep(6)
print(r.get("sanity_check")) 