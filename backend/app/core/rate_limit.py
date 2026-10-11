import time
from collections import defaultdict
from threading import Lock


class AttemptLimiter:
    """Bloquea una clave tras demasiados intentos fallidos en una ventana de tiempo.

    Vive en memoria: vale para una sola instancia del backend. Con varias
    instancias habría que llevarlo a un almacén compartido (Redis).
    """

    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def _recent(self, key: str, now: float) -> list[float]:
        recent = [t for t in self._failures[key] if now - t < self.window_seconds]
        if recent:
            self._failures[key] = recent
        else:
            self._failures.pop(key, None)
        return recent

    def is_blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent(key, time.monotonic())) >= self.max_attempts

    def record_failure(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._recent(key, now)
            self._failures[key].append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._failures.clear()
