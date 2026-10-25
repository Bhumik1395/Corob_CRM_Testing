import io
import zipfile

from fastapi import HTTPException

MAX_FILE_BYTES = 100 * 1024 * 1024 
MAX_UNZIPPED_BYTES = 800 * 1024 * 1024

def read_capped(upload) -> bytes:
    data = upload.file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, {
            "error": "file_too_large",
            "message": f"'{upload.filename}' is larger than {MAX_FILE_BYTES // (1024 * 1024)} MB.",
        })
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            unzipped = sum(i.file_size for i in z.infolist())
    except zipfile.BadZipFile:
        return data  
    if unzipped > MAX_UNZIPPED_BYTES:
        raise HTTPException(413, {
            "error": "file_too_large",
            "message": f"'{upload.filename}' expands to more data than we accept.",
        })
    return data