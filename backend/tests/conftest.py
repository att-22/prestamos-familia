import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.api.routes.auth import auth_limiter
from app.core.database import engine, get_session
from app.main import app


@pytest.fixture(autouse=True)
def reset_auth_limiter():
    """El límite de intentos vive en memoria: se vacía para que los tests no se afecten."""
    auth_limiter.clear()
    yield
    auth_limiter.clear()


@pytest.fixture
def client():
    """Cliente contra la BD real, pero dentro de una transacción que se deshace al acabar."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def auth_headers(client):
    response = client.post("/auth/dev-token", json={"email": "test@familia.com"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
