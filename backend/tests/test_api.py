VEHICLE = {"name": "Toyota Corolla", "price_cash": "25000", "brand": "Toyota", "year": 2024}
OFFER = {
    "source_name": "Banco Test",
    "down_payment": "5000",
    "tin": "6.5",
    "tae": "7.2",
    "months": 60,
    "monthly_payment": "391.32",
    "opening_fee_percent": "1.5",
}


def create_vehicle_and_offer(client, headers):
    vehicle = client.post("/vehicles", json=VEHICLE, headers=headers).json()
    offer = client.post("/leasing-offers", json={**OFFER, "vehicle_id": vehicle["id"]}, headers=headers).json()
    return vehicle, offer


def test_health(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_requires_auth(client):
    assert client.get("/vehicles").status_code == 401
    assert client.get("/vehicles", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_dev_token_and_me(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@familia.com"


def test_vehicle_crud(client, auth_headers):
    created = client.post("/vehicles", json=VEHICLE, headers=auth_headers)
    assert created.status_code == 201
    vehicle_id = created.json()["id"]

    assert [v["id"] for v in client.get("/vehicles", headers=auth_headers).json()] == [vehicle_id]

    updated = client.patch(f"/vehicles/{vehicle_id}", json={"price_cash": "24000"}, headers=auth_headers)
    assert updated.json()["price_cash"] == "24000.00"

    assert client.delete(f"/vehicles/{vehicle_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/vehicles/{vehicle_id}", headers=auth_headers).status_code == 404


def test_users_cannot_see_each_others_vehicles(client, auth_headers):
    vehicle_id = client.post("/vehicles", json=VEHICLE, headers=auth_headers).json()["id"]

    other = client.post("/auth/dev-token", json={"email": "otro@familia.com"}).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    assert client.get(f"/vehicles/{vehicle_id}", headers=other_headers).status_code == 404
    assert client.get("/vehicles", headers=other_headers).json() == []


def test_calculate_comparison(client, auth_headers):
    vehicle, offer = create_vehicle_and_offer(client, auth_headers)

    response = client.post(
        "/comparisons/calculate",
        json={"vehicle_id": vehicle["id"], "leasing_offer_id": offer["id"], "user_monthly_income": "2000"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["total_fees"] == "300.00"
    assert result["total_leasing_cost"] == "28779.20"
    assert result["monthly_income_percent"] == "19.57"
    assert {"OPENING_FEE_HIGH", "LEASING_MORE_EXPENSIVE"} <= {a["code"] for a in result["alerts"]}


def test_save_and_share_comparison(client, auth_headers):
    vehicle, offer = create_vehicle_and_offer(client, auth_headers)
    body = {"vehicle_id": vehicle["id"], "leasing_offer_id": offer["id"]}

    saved = client.post("/comparisons", json=body, headers=auth_headers)
    assert saved.status_code == 201, saved.text
    assert saved.json()["vehicle_name"] == "Toyota Corolla"

    # El enlace público funciona sin autenticación
    public = client.get(f"/comparisons/public/{saved.json()['shared_slug']}")
    assert public.status_code == 200
    assert public.json()["source_name"] == "Banco Test"
    assert public.json()["alerts"]

    assert client.get("/comparisons/public/no-existe").status_code == 404


def test_deleting_vehicle_removes_offers_and_comparisons(client, auth_headers):
    vehicle, offer = create_vehicle_and_offer(client, auth_headers)
    client.post("/comparisons", json={"vehicle_id": vehicle["id"], "leasing_offer_id": offer["id"]}, headers=auth_headers)

    assert client.delete(f"/vehicles/{vehicle['id']}", headers=auth_headers).status_code == 204
    assert client.get("/leasing-offers", headers=auth_headers).json() == []
    assert client.get("/comparisons", headers=auth_headers).json() == []


def test_residual_value_flows_through_calculation_and_public_link(client, auth_headers):
    vehicle = client.post("/vehicles", json=VEHICLE, headers=auth_headers).json()
    offer = client.post(
        "/leasing-offers",
        json={
            "vehicle_id": vehicle["id"],
            "source_name": "Financiera Multiopción",
            "down_payment": "5000",
            "tin": "6.5",
            "tae": "6.7",
            "months": 48,
            "monthly_payment": "291.32",
            "residual_value_percent": "40",
        },
        headers=auth_headers,
    ).json()
    body = {"vehicle_id": vehicle["id"], "leasing_offer_id": offer["id"]}

    result = client.post("/comparisons/calculate", json=body, headers=auth_headers).json()
    assert result["residual_value"] == "10000.00"
    assert result["total_leasing_cost"] == "28983.36"
    assert "BALLOON_PAYMENT" in {a["code"] for a in result["alerts"]}

    saved = client.post("/comparisons", json=body, headers=auth_headers).json()
    assert saved["total_leasing_cost"] == "28983.36"
    public = client.get(f"/comparisons/public/{saved['shared_slug']}").json()
    assert public["residual_value"] == "10000.00"
