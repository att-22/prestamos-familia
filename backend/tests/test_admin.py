from uuid import uuid4

import pytest

from app.core.config import get_settings

PASSWORD = "una-clave-larga-1"
ADMIN = "jefa@ejemplo.org"


@pytest.fixture(autouse=True)
def admin_settings(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "ADMIN_EMAIL", ADMIN)
    monkeypatch.setattr(settings, "ALLOWED_EMAILS", [])
    monkeypatch.setattr(settings, "REGISTRATION_CODE", "")


def register(client, email, **extra):
    return client.post("/auth/register", json={"email": email, "password": PASSWORD, **extra})


def headers_for(response):
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture
def admin_headers(client):
    response = register(client, ADMIN)
    assert response.status_code == 201, response.text
    return headers_for(response)


def add(client, headers, entry):
    return client.post("/admin/allowed-emails", json={"entry": entry}, headers=headers)


def test_admin_email_can_always_register_and_becomes_admin(client):
    response = register(client, ADMIN)

    assert response.status_code == 201
    assert response.json()["user"]["is_admin"] is True
    # ...y nadie más puede registrarse mientras no se le autorice
    assert register(client, "otra@gmail.com").status_code == 403


def test_existing_account_becomes_admin_on_login(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "ADMIN_EMAIL", "")
    monkeypatch.setattr(get_settings(), "ALLOWED_EMAILS", [ADMIN])
    assert register(client, ADMIN).json()["user"]["is_admin"] is False

    # Se la nombra administradora después de haber creado la cuenta
    monkeypatch.setattr(get_settings(), "ADMIN_EMAIL", ADMIN)
    logged_in = client.post("/auth/login", json={"email": ADMIN, "password": PASSWORD})

    assert logged_in.json()["user"]["is_admin"] is True
    assert client.get("/admin/allowed-emails", headers=headers_for(logged_in)).status_code == 200


def test_admin_endpoints_are_forbidden_to_everyone_else(client, admin_headers):
    add(client, admin_headers, "normal@gmail.com")
    user_headers = headers_for(register(client, "normal@gmail.com"))

    for headers, expected in ((user_headers, 403), ({}, 401)):
        assert client.get("/admin/allowed-emails", headers=headers).status_code == expected
        assert client.get("/admin/settings", headers=headers).status_code == expected
        assert client.get("/admin/users", headers=headers).status_code == expected
        assert client.post(f"/admin/users/{uuid4()}/reset-password", headers=headers).status_code == expected
        assert client.post("/admin/allowed-emails", json={"entry": "x@gmail.com"}, headers=headers).status_code == expected


def test_adding_an_email_lets_that_person_register(client, admin_headers):
    assert register(client, "madre@gmail.com").status_code == 403

    added = add(client, admin_headers, "  Madre@Gmail.com ")
    assert added.status_code == 201
    assert added.json() == {**added.json(), "entry": "madre@gmail.com", "source": "admin", "is_domain": False, "registered": False}

    assert register(client, "madre@gmail.com").status_code == 201
    listed = {e["entry"]: e for e in client.get("/admin/allowed-emails", headers=admin_headers).json()}
    assert listed["madre@gmail.com"]["registered"] is True


def test_adding_a_domain_allows_every_address_in_it(client, admin_headers):
    added = add(client, admin_headers, "@familia.es")
    assert added.json()["is_domain"] is True

    assert register(client, "cualquiera@familia.es").status_code == 201
    assert register(client, "cualquiera@nofamilia.es").status_code == 403


def test_removing_an_entry_blocks_new_registrations_but_keeps_accounts(client, admin_headers):
    first = add(client, admin_headers, "primo@gmail.com").json()
    second = add(client, admin_headers, "prima@gmail.com").json()
    register(client, "primo@gmail.com")

    for entry in (first, second):
        assert client.delete(f"/admin/allowed-emails/{entry['id']}", headers=admin_headers).status_code == 204

    # Quien ya tenía cuenta sigue entrando; quien no, ya no puede crearla
    assert client.post("/auth/login", json={"email": "primo@gmail.com", "password": PASSWORD}).status_code == 200
    assert register(client, "prima@gmail.com").status_code == 403
    assert client.delete(f"/admin/allowed-emails/{first['id']}", headers=admin_headers).status_code == 404


def test_duplicates_are_rejected(client, admin_headers, monkeypatch):
    monkeypatch.setattr(get_settings(), "ALLOWED_EMAILS", ["fijo@gmail.com"])
    assert add(client, admin_headers, "nuevo@gmail.com").status_code == 201

    for entry in ("nuevo@gmail.com", "NUEVO@gmail.com", "fijo@gmail.com", ADMIN):
        assert add(client, admin_headers, entry).status_code == 409


@pytest.mark.parametrize("entry", ["", "no-es-un-email", "@", "@sin-punto", "@dominio..es", "a b@gmail.com"])
def test_invalid_entries_are_rejected(client, admin_headers, entry):
    assert add(client, admin_headers, entry).status_code == 422


def test_list_includes_config_entries_as_read_only(client, admin_headers, monkeypatch):
    monkeypatch.setattr(get_settings(), "ALLOWED_EMAILS", ["fijo@gmail.com", "@empresa.com"])
    add(client, admin_headers, "nuevo@gmail.com")

    listed = client.get("/admin/allowed-emails", headers=admin_headers).json()

    by_entry = {e["entry"]: e for e in listed}
    assert by_entry["nuevo@gmail.com"]["source"] == "admin" and by_entry["nuevo@gmail.com"]["id"]
    for entry in ("fijo@gmail.com", "@empresa.com", ADMIN):
        assert by_entry[entry]["source"] == "config" and by_entry[entry]["id"] is None
    assert by_entry[ADMIN]["registered"] is True


def test_settings_expose_the_registration_code_to_the_admin(client, admin_headers, monkeypatch):
    assert client.get("/admin/settings", headers=admin_headers).json() == {"registration_code": None, "admin_email": ADMIN}

    monkeypatch.setattr(get_settings(), "REGISTRATION_CODE", "codigo-familiar")
    assert client.get("/admin/settings", headers=admin_headers).json()["registration_code"] == "codigo-familiar"


def users_by_email(client, headers):
    return {u["email"]: u for u in client.get("/admin/users", headers=headers).json()}


def test_users_are_listed_without_exposing_password_hashes(client, admin_headers):
    add(client, admin_headers, "madre@gmail.com")
    register(client, "madre@gmail.com", name="Madre")

    response = client.get("/admin/users", headers=admin_headers)

    assert "password_hash" not in response.text
    users = {u["email"]: u for u in response.json()}
    assert users[ADMIN]["is_admin"] is True
    assert users["madre@gmail.com"] == {**users["madre@gmail.com"], "name": "Madre", "is_admin": False, "has_password": True}


def test_resetting_a_password_lets_the_person_choose_a_new_one_and_keeps_their_data(client, admin_headers):
    add(client, admin_headers, "madre@gmail.com")
    madre = headers_for(register(client, "madre@gmail.com"))
    client.post("/purchases", json={"name": "Sofá", "price_cash": "900", "category": "other"}, headers=madre)
    user_id = users_by_email(client, admin_headers)["madre@gmail.com"]["id"]

    reset = client.post(f"/admin/users/{user_id}/reset-password", headers=admin_headers)

    assert reset.status_code == 200 and reset.json()["has_password"] is False
    assert client.post("/auth/login", json={"email": "madre@gmail.com", "password": PASSWORD}).status_code == 401

    new_password = "otra-clave-distinta-2"
    again = client.post("/auth/register", json={"email": "madre@gmail.com", "password": new_password})
    assert again.status_code == 201
    assert client.post("/auth/login", json={"email": "madre@gmail.com", "password": new_password}).status_code == 200
    assert [p["name"] for p in client.get("/purchases", headers=headers_for(again)).json()] == ["Sofá"]


def test_reset_is_refused_when_it_would_lock_someone_out(client, admin_headers):
    entry = add(client, admin_headers, "primo@gmail.com").json()
    register(client, "primo@gmail.com")
    users = users_by_email(client, admin_headers)
    client.delete(f"/admin/allowed-emails/{entry['id']}", headers=admin_headers)

    # Ya no está en la lista: sin contraseña no podría volver a registrarse
    assert client.post(f"/admin/users/{users['primo@gmail.com']['id']}/reset-password", headers=admin_headers).status_code == 409
    # El administrador no se deja fuera a sí mismo
    assert client.post(f"/admin/users/{users[ADMIN]['id']}/reset-password", headers=admin_headers).status_code == 400
    assert client.post(f"/admin/users/{uuid4()}/reset-password", headers=admin_headers).status_code == 404
    assert client.post("/auth/login", json={"email": "primo@gmail.com", "password": PASSWORD}).status_code == 200
