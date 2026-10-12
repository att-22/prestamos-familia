import pytest
from pydantic import ValidationError

from app.api.routes.auth import auth_limiter, email_limiter
from app.core.config import Settings, get_settings
from app.core.security import hash_password, verify_password

PASSWORD = "una-clave-larga-1"


def register(client, email="ana@familia.com", password=PASSWORD, **extra):
    return client.post("/auth/register", json={"email": email, "password": password, **extra})


def login(client, email="ana@familia.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def test_register_and_login(client):
    registered = register(client, name="Ana")
    assert registered.status_code == 201, registered.text
    assert registered.json()["user"] == {**registered.json()["user"], "email": "ana@familia.com", "name": "Ana"}
    assert "password" not in str(registered.json())

    logged_in = login(client)
    assert logged_in.status_code == 200
    headers = {"Authorization": f"Bearer {logged_in.json()['access_token']}"}
    assert client.get("/auth/me", headers=headers).json()["email"] == "ana@familia.com"


def test_email_is_case_insensitive(client):
    register(client, email="Ana@Familia.com")

    assert login(client, email="ANA@familia.com").status_code == 200
    assert register(client, email="ana@familia.com").status_code == 409


def test_only_allowed_emails_can_register(client):
    response = register(client, email="extrano@otro.com")

    assert response.status_code == 403
    assert login(client, email="extrano@otro.com").status_code == 401


def test_registration_code(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "REGISTRATION_CODE", "codigo-familiar")

    assert register(client).status_code == 403
    assert register(client, registration_code="otro").status_code == 403
    assert register(client, registration_code="codigo-familiar").status_code == 201


def test_cannot_register_twice(client):
    assert register(client).status_code == 201

    second = register(client, password="otra-clave-distinta")
    assert second.status_code == 409
    # La contraseña original sigue siendo la válida
    assert login(client).status_code == 200
    assert login(client, password="otra-clave-distinta").status_code == 401


def test_wrong_credentials_give_the_same_error(client):
    register(client)

    wrong_password = login(client, password="no-es-esta-clave")
    unknown_user = login(client, email="nadie@familia.com")

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json() == unknown_user.json()


@pytest.mark.parametrize("password", ["corta", "x" * 73, "ñ" * 40])
def test_password_rules(client, password):
    assert register(client, password=password).status_code == 422


def test_login_is_blocked_after_repeated_failures(client):
    register(client)
    for _ in range(auth_limiter.max_attempts):
        assert login(client, password="no-es-esta-clave").status_code == 401

    # Ni siquiera la contraseña correcta entra mientras dura el bloqueo
    assert login(client).status_code == 429
    # El bloqueo es por email: otra cuenta no se ve afectada
    register(client, email="luis@familia.com")
    assert login(client, email="luis@familia.com").status_code == 200


def test_an_email_is_blocked_even_if_the_attempts_come_from_different_ips(client, monkeypatch):
    register(client)
    # Como si cada intento llegara desde una IP distinta: el límite por IP nunca salta
    monkeypatch.setattr(auth_limiter, "max_attempts", 10_000)
    for _ in range(email_limiter.max_attempts):
        assert login(client, password="no-es-esta-clave").status_code == 401

    assert login(client).status_code == 429


def test_successful_login_resets_the_failure_count(client):
    register(client)
    for _ in range(auth_limiter.max_attempts - 1):
        login(client, password="no-es-esta-clave")
    assert login(client).status_code == 200

    for _ in range(auth_limiter.max_attempts - 1):
        assert login(client, password="no-es-esta-clave").status_code == 401
    assert login(client).status_code == 200


def test_dev_users_have_no_password(client):
    client.post("/auth/dev-token", json={"email": "demo@familia.com"})

    assert login(client, email="demo@familia.com", password="").status_code == 401
    # ...pero pueden ponerse una registrándose
    assert register(client, email="demo@familia.com").status_code == 201
    assert login(client, email="demo@familia.com").status_code == 200


def test_dev_token_is_disabled_in_production(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "ENVIRONMENT", "production")

    assert client.post("/auth/dev-token", json={"email": "demo@familia.com"}).status_code == 404


def test_delete_account_removes_its_data(client):
    token = register(client).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/purchases", json={"name": "Lavadora", "price_cash": "600"}, headers=headers)

    assert client.delete("/auth/me", headers=headers).status_code == 204

    # El token de una cuenta borrada deja de valer, y el email queda libre
    assert client.get("/purchases", headers=headers).status_code == 401
    assert login(client).status_code == 401
    assert register(client).status_code == 201


def test_token_must_belong_to_an_existing_user(client):
    from app.core.security import create_access_token

    forged = create_access_token("00000000-0000-0000-0000-000000000000", "nadie@familia.com")
    not_a_uuid = create_access_token("dev-nadie@familia.com", "nadie@familia.com")

    for token in (forged, not_a_uuid):
        assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_password_hashing():
    hashed = hash_password(PASSWORD)

    assert hashed != PASSWORD
    assert hash_password(PASSWORD) != hashed  # sal distinta cada vez
    assert verify_password(PASSWORD, hashed)
    assert not verify_password("otra", hashed)
    assert not verify_password(PASSWORD, None)


def test_allowed_emails_accept_addresses_and_domains():
    settings = Settings(DATABASE_URL="postgresql://x", JWT_SECRET="x", ALLOWED_EMAILS="Ana@Ejemplo.com, @familia.com")

    assert settings.is_email_allowed("ana@ejemplo.com")
    assert settings.is_email_allowed("cualquiera@FAMILIA.com")
    assert not settings.is_email_allowed("luis@ejemplo.com")
    assert not settings.is_email_allowed("ana@nofamilia.com.evil.org")
    assert not Settings(DATABASE_URL="postgresql://x", JWT_SECRET="x", ALLOWED_EMAILS="").is_email_allowed("ana@ejemplo.com")


def test_database_url_always_uses_the_psycopg_driver():
    for url in ("postgres://user:pw@host/db?sslmode=require", "postgresql://user:pw@host/db?sslmode=require"):
        assert Settings(DATABASE_URL=url, JWT_SECRET="x").DATABASE_URL == "postgresql+psycopg://user:pw@host/db?sslmode=require"

    explicit = "postgresql+psycopg2://user:pw@host/db"
    assert Settings(DATABASE_URL=explicit, JWT_SECRET="x").DATABASE_URL == explicit


def test_production_requires_strong_settings():
    base = dict(DATABASE_URL="postgresql://x", ENVIRONMENT="production")

    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(**base, JWT_SECRET="corto", REGISTRATION_CODE="codigo")
    with pytest.raises(ValidationError, match="REGISTRATION_CODE"):
        Settings(**base, JWT_SECRET="s" * 32, REGISTRATION_CODE="")
    assert Settings(**base, JWT_SECRET="s" * 32, REGISTRATION_CODE="codigo").ENVIRONMENT == "production"


def change_password(client, headers, current=PASSWORD, new="otra-clave-distinta-2"):
    return client.post("/auth/me/password", json={"current_password": current, "new_password": new}, headers=headers)


def test_change_password_replaces_the_old_one(client):
    headers = {"Authorization": f"Bearer {register(client).json()['access_token']}"}

    assert change_password(client, headers).status_code == 204

    assert login(client).status_code == 401
    assert login(client, password="otra-clave-distinta-2").status_code == 200


def test_change_password_requires_the_current_one(client):
    headers = {"Authorization": f"Bearer {register(client).json()['access_token']}"}

    wrong = change_password(client, headers, current="no-es-esta-clave")

    # 400: la sesión sigue siendo válida, así que la app no debe cerrarla
    assert wrong.status_code == 400
    assert login(client).status_code == 200
    assert client.post("/auth/me/password", json={"current_password": PASSWORD, "new_password": "x"}).status_code == 401


def test_change_password_validates_the_new_one(client):
    headers = {"Authorization": f"Bearer {register(client).json()['access_token']}"}

    assert change_password(client, headers, new="corta").status_code == 422
    assert change_password(client, headers, new="ñ" * 40).status_code == 422  # más de 72 bytes
    assert change_password(client, headers, new=PASSWORD).status_code == 400
    assert login(client).status_code == 200


def test_change_password_is_rate_limited(client):
    headers = {"Authorization": f"Bearer {register(client).json()['access_token']}"}
    for _ in range(auth_limiter.max_attempts):
        assert change_password(client, headers, current="no-es-esta-clave").status_code == 400

    # Con la sesión robada no se puede probar contraseñas sin límite
    assert change_password(client, headers).status_code == 429
