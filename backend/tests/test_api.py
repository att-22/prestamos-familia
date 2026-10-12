from app.core.database import get_session
from app.main import app

PURCHASE = {"name": "Toyota Corolla", "price_cash": "25000", "category": "vehicle", "brand": "Toyota", "year": 2024}
OFFER = {
    "source_name": "Banco Test",
    "down_payment": "5000",
    "tin": "6.5",
    "tae": "7.2",
    "months": 60,
    "monthly_payment": "391.32",
    "opening_fee_percent": "1.5",
}


def create_purchase_and_offer(client, headers):
    purchase = client.post("/purchases", json=PURCHASE, headers=headers).json()
    offer = client.post("/financing-offers", json={**OFFER, "purchase_id": purchase["id"]}, headers=headers).json()
    return purchase, offer


def test_health(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_reports_503_when_the_database_is_down(client):
    class BrokenSession:
        def connection(self):
            raise RuntimeError("connection refused: postgresql://user:secret@host/db")

    app.dependency_overrides[get_session] = lambda: BrokenSession()
    response = client.get("/healthz")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "disconnected"}


def test_requires_auth(client):
    assert client.get("/purchases").status_code == 401
    assert client.get("/purchases", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_dev_token_and_me(client, auth_headers):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "test@familia.com"


def test_purchase_crud(client, auth_headers):
    created = client.post("/purchases", json=PURCHASE, headers=auth_headers)
    assert created.status_code == 201
    purchase_id = created.json()["id"]

    assert [v["id"] for v in client.get("/purchases", headers=auth_headers).json()] == [purchase_id]

    updated = client.patch(f"/purchases/{purchase_id}", json={"price_cash": "24000"}, headers=auth_headers)
    assert updated.json()["price_cash"] == "24000.00"

    assert client.delete(f"/purchases/{purchase_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/purchases/{purchase_id}", headers=auth_headers).status_code == 404


def test_users_cannot_see_each_others_purchases(client, auth_headers):
    purchase_id = client.post("/purchases", json=PURCHASE, headers=auth_headers).json()["id"]

    other = client.post("/auth/dev-token", json={"email": "otro@familia.com"}).json()
    other_headers = {"Authorization": f"Bearer {other['access_token']}"}

    assert client.get(f"/purchases/{purchase_id}", headers=other_headers).status_code == 404
    assert client.get("/purchases", headers=other_headers).json() == []


def test_calculate_comparison(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)

    response = client.post(
        "/comparisons/calculate",
        json={"purchase_id": purchase["id"], "financing_offer_id": offer["id"], "user_monthly_income": "2000"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    result = response.json()
    assert result["total_fees"] == "300.00"
    assert result["total_financing_cost"] == "28779.20"
    assert result["monthly_income_percent"] == "19.57"
    assert {"OPENING_FEE_HIGH", "FINANCING_MORE_EXPENSIVE"} <= {a["code"] for a in result["alerts"]}


def test_save_and_share_comparison(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)
    body = {"purchase_id": purchase["id"], "financing_offer_id": offer["id"]}

    saved = client.post("/comparisons", json=body, headers=auth_headers)
    assert saved.status_code == 201, saved.text
    assert saved.json()["purchase_name"] == "Toyota Corolla"

    # El enlace público funciona sin autenticación
    public = client.get(f"/comparisons/public/{saved.json()['shared_slug']}")
    assert public.status_code == 200
    assert public.json()["source_name"] == "Banco Test"
    assert public.json()["alerts"]

    assert client.get("/comparisons/public/no-existe").status_code == 404


def test_deleting_purchase_removes_offers_and_comparisons(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)
    client.post("/comparisons", json={"purchase_id": purchase["id"], "financing_offer_id": offer["id"]}, headers=auth_headers)

    assert client.delete(f"/purchases/{purchase['id']}", headers=auth_headers).status_code == 204
    assert client.get("/financing-offers", headers=auth_headers).json() == []
    assert client.get("/comparisons", headers=auth_headers).json() == []


def test_residual_value_flows_through_calculation_and_public_link(client, auth_headers):
    purchase = client.post("/purchases", json=PURCHASE, headers=auth_headers).json()
    offer = client.post(
        "/financing-offers",
        json={
            "purchase_id": purchase["id"],
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
    body = {"purchase_id": purchase["id"], "financing_offer_id": offer["id"]}

    result = client.post("/comparisons/calculate", json=body, headers=auth_headers).json()
    assert result["residual_value"] == "10000.00"
    assert result["total_financing_cost"] == "28983.36"
    assert "BALLOON_PAYMENT" in {a["code"] for a in result["alerts"]}

    saved = client.post("/comparisons", json=body, headers=auth_headers).json()
    assert saved["total_financing_cost"] == "28983.36"
    public = client.get(f"/comparisons/public/{saved['shared_slug']}").json()
    assert public["residual_value"] == "10000.00"


def test_purchase_category(client, auth_headers):
    washer = client.post("/purchases", json={"name": "Lavadora", "price_cash": "600", "category": "home"}, headers=auth_headers)
    assert washer.status_code == 201
    assert washer.json()["category"] == "home"

    # Sin categoría se guarda como "other"
    plain = client.post("/purchases", json={"name": "Varios", "price_cash": "100"}, headers=auth_headers)
    assert plain.json()["category"] == "other"

    updated = client.patch(f"/purchases/{plain.json()['id']}", json={"category": "electronics"}, headers=auth_headers)
    assert updated.json()["category"] == "electronics"

    invalid = client.post("/purchases", json={"name": "X", "price_cash": "100", "category": "yacht"}, headers=auth_headers)
    assert invalid.status_code == 422


def test_saved_comparison_is_a_snapshot(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)
    body = {"purchase_id": purchase["id"], "financing_offer_id": offer["id"]}
    saved = client.post("/comparisons", json=body, headers=auth_headers).json()
    before = client.get(f"/comparisons/public/{saved['shared_slug']}").json()

    # Se editan la compra y la oferta después de guardar la comparativa
    client.patch(
        f"/purchases/{purchase['id']}",
        json={"name": "Otro nombre", "price_cash": "30000"},
        headers=auth_headers,
    )
    client.patch(
        f"/financing-offers/{offer['id']}",
        json={"source_name": "Otro banco", "tae": "12.5", "monthly_payment": "500", "months": 72, "residual_value": "4000"},
        headers=auth_headers,
    )

    # El enlace compartido sigue mostrando la oferta tal como era, coherente con sus totales
    after = client.get(f"/comparisons/public/{saved['shared_slug']}").json()
    assert after == before
    assert after["source_name"] == "Banco Test"
    assert after["monthly_payment"] == "391.32"

    listed = client.get("/comparisons", headers=auth_headers).json()[0]
    assert listed["purchase_name"] == "Toyota Corolla"
    assert listed["source_name"] == "Banco Test"

    # Una comparativa nueva sí refleja los cambios
    fresh = client.post("/comparisons", json=body, headers=auth_headers).json()
    fresh_public = client.get(f"/comparisons/public/{fresh['shared_slug']}").json()
    assert fresh_public["purchase_name"] == "Otro nombre"
    assert fresh_public["tae"] == "12.50"
    assert fresh_public["residual_value"] == "4000.00"


def test_public_link_hides_alerts_based_on_income_and_savings(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)
    body = {
        "purchase_id": purchase["id"],
        "financing_offer_id": offer["id"],
        "user_monthly_income": "1100",
        "user_available_savings": "6000",
    }

    saved = client.post("/comparisons", json=body, headers=auth_headers).json()
    owner_codes = {a["code"] for a in saved["alerts_json"]}
    assert {"DEBT_RATIO_CRITICAL", "LOW_EMERGENCY_FUND"} <= owner_codes

    public = client.get(f"/comparisons/public/{saved['shared_slug']}").json()
    public_codes = {a["code"] for a in public["alerts"]}
    assert "FINANCING_MORE_EXPENSIVE" in public_codes
    assert not public_codes & {"DEBT_RATIO_CRITICAL", "LOW_EMERGENCY_FUND"}
    # Ni los ingresos ni lo que queda de ahorros se pueden leer en la respuesta
    assert "35.57" not in str(public) and "1000.00" not in str(public)


def test_offer_ranking_orders_offers_by_total_cost(client, auth_headers):
    purchase, loan = create_purchase_and_offer(client, auth_headers)
    # Más entrada y menos plazo: cuota más alta, pero menos intereses
    short = client.post(
        "/financing-offers",
        json={**OFFER, "purchase_id": purchase["id"], "source_name": "Banco Corto", "down_payment": "10000",
              "months": 36, "monthly_payment": "450", "opening_fee_percent": "0"},
        headers=auth_headers,
    ).json()

    response = client.get(f"/purchases/{purchase['id']}/offer-ranking", headers=auth_headers)

    assert response.status_code == 200
    ranking = response.json()
    assert ranking["price_cash"] == "25000.00"
    cheapest, dearest = ranking["offers"]
    # 10000 + 36 x 450 = 26200
    assert cheapest == {**cheapest, "offer_id": short["id"], "total_financing_cost": "26200.00",
                        "total_interest_fees": "1200.00", "is_cheapest": True, "has_lowest_payment": False}
    # 5000 + 60 x 391.32 + 1.5 % de 20000 = 28779.20
    assert dearest == {**dearest, "offer_id": loan["id"], "total_financing_cost": "28779.20",
                       "total_interest_fees": "3779.20", "is_cheapest": False, "has_lowest_payment": True}


def test_offer_ranking_of_a_purchase_without_offers_is_empty(client, auth_headers):
    purchase = client.post("/purchases", json=PURCHASE, headers=auth_headers).json()

    response = client.get(f"/purchases/{purchase['id']}/offer-ranking", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["offers"] == []


def test_offer_ranking_is_private(client, auth_headers):
    purchase, _ = create_purchase_and_offer(client, auth_headers)
    other = client.post("/auth/dev-token", json={"email": "otra@familia.com"}).json()["access_token"]

    response = client.get(f"/purchases/{purchase['id']}/offer-ranking", headers={"Authorization": f"Bearer {other}"})

    assert response.status_code == 404
    assert client.get(f"/purchases/{purchase['id']}/offer-ranking").status_code == 401


def test_calculation_includes_the_amortization_schedule(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)

    response = client.post(
        "/comparisons/calculate",
        json={"purchase_id": purchase["id"], "financing_offer_id": offer["id"]},
        headers=auth_headers,
    )

    amortization = response.json()["amortization"]
    assert amortization["annual_rate"] == "6.50"
    assert len(amortization["rows"]) == 60
    assert amortization["rows"][0] == {
        "month": 1, "payment": "391.32", "interest": "108.33", "principal": "282.99", "balance": "19717.01",
    }
    assert amortization["rows"][-1]["balance"] == "0.00"


def test_simulating_other_conditions_for_an_offer(client, auth_headers):
    purchase, offer = create_purchase_and_offer(client, auth_headers)
    body = {"purchase_id": purchase["id"], "financing_offer_id": offer["id"]}

    response = client.post("/comparisons/simulate", json={**body, "down_payment": "10000", "months": 36}, headers=auth_headers)

    assert response.status_code == 200
    # 15.000 al 6,5 % a 36 meses, más el 1,5 % de apertura sobre lo financiado
    assert response.json() == {
        "down_payment": "10000", "months": 36, "monthly_payment": "459.73",
        "total_financing_cost": "26775.28", "total_interest_fees": "1775.28", "annual_rate": "6.50",
    }

    # Más entrada que el propio precio, plazos imposibles, ofertas ajenas
    for scenario, expected in (({"down_payment": "25000.01", "months": 36}, 422), ({"down_payment": "0", "months": 0}, 422),
                               ({"down_payment": "0", "months": 121}, 422), ({"down_payment": "-1", "months": 12}, 422)):
        assert client.post("/comparisons/simulate", json={**body, **scenario}, headers=auth_headers).status_code == expected
    other = client.post("/auth/dev-token", json={"email": "otra@familia.com"}).json()["access_token"]
    stranger = client.post("/comparisons/simulate", json={**body, "down_payment": "0", "months": 12},
                           headers={"Authorization": f"Bearer {other}"})
    assert stranger.status_code == 404
