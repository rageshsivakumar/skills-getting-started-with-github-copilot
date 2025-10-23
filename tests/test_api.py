from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    # make a deep copy of initial activities to restore after each test
    import copy
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)

def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"].get("participants"), list)

def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "pytest_user@example.com"

    # ensure not present initially
    assert email not in activities[activity]["participants"]

    # sign up
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in activities[activity]["participants"]

    # try duplicate signup
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400

    # unregister
    r3 = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert r3.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregister non-existing
    r4 = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert r4.status_code == 400

def test_signup_nonexistent_activity():
    r = client.post("/activities/Nonexistent/signup?email=foo@example.com")
    assert r.status_code == 404

def test_unregister_nonexistent_activity():
    r = client.delete("/activities/Nonexistent/unregister?email=foo@example.com")
    assert r.status_code == 404
