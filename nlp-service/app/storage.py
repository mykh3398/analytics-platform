import os
import io
import logging
from minio import Minio
from minio.error import S3Error

logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self):
        self.endpoint = os.getenv("MINIO_ENDPOINT", "minio:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.secure = os.getenv("MINIO_SECURE", "false").lower() == "true"
        self.bucket_name = os.getenv("MINIO_BUCKET_NAME", "nlp-indexes")
        
        self.client = None
        self._init_client()

    def _init_client(self):
        try:
            self.client = Minio(
                self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure
            )
            self._ensure_bucket_exists()
            logger.info(f"Connected to MinIO at {self.endpoint}, bucket: '{self.bucket_name}'")
        except Exception as e:
            logger.error(f"Failed to initialize MinIO client: {e}")

    def _ensure_bucket_exists(self):
        if not self.client:
            return
        if not self.client.bucket_exists(self.bucket_name):
            self.client.make_bucket(self.bucket_name)
            logger.info(f"Created new MinIO bucket: '{self.bucket_name}'")

    def save_knn_index(self, workspace_id: int, index_bytes: bytes) -> bool:
        if not self.client:
            logger.error("MinIO client is not initialized.")
            return False

        object_name = f"workspaces/{workspace_id}/knn_index.pkl"
        data_stream = io.BytesIO(index_bytes)
        
        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=data_stream,
                length=len(index_bytes)
            )
            logger.debug(f"Uploaded index to MinIO: {object_name} ({len(index_bytes)} bytes)")
            return True
        except Exception as e:
            logger.error(f"Failed to upload index for workspace {workspace_id}: {e}")
            return False

    def load_knn_index(self, workspace_id: int) -> bytes | None:
        if not self.client:
            return None

        object_name = f"workspaces/{workspace_id}/knn_index.pkl"
        response = None
        try:
            response = self.client.get_object(self.bucket_name, object_name)
            return response.read()
        except S3Error as e:
            if e.code == "NoSuchKey":
                return None
            logger.error(f"MinIO error reading {object_name}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error reading from MinIO: {e}")
            return None
        finally:
            if response:
                response.close()
                response.release_conn()
    
    def delete_knn_index(self, workspace_id: int) -> bool:
        if not self.client:
            return False

        object_name = f"workspaces/{workspace_id}/knn_index.pkl"
        try:
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Deleted index from MinIO: {object_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete index for workspace {workspace_id}: {e}")
            return False

storage = StorageManager()