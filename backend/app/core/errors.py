"""Application-level API error type."""


class ApiError(Exception):
    """A safe, expected error that can be returned to an API caller."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)
