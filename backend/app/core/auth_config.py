import os

PM_DATA_TTL_SECONDS = int(os.getenv("PM_DATA_TTL_SECONDS", str(60 * 60 * 24 * 30)))  # 30 days
