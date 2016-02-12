import re
from json import dumps, loads
from server.test import assert_api_error
from server.model import User

USER_NAME = "Adrian"
USER_EMAIL = "a.cooney10@nuigalway.ie"
USER_PASSWORD = "root"

def test_create(session, institution, client):
    """POST /user { name, email, password }"""
    resp = client.post("/user", data=dumps({
        "name": USER_NAME,
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }), content_type="application/json")

    assert resp.status_code == 200

    # Ensure the user is in the database
    user = session.query(User).filter(User.email == USER_EMAIL).one()

    assert user, "User does not exist"
    assert user.sessions[0], "User is not logged in"
    assert user.institution.id == institution.id, "Insitution is not added to user"

    # Check we have the key returned and user
    data = loads(resp.get_data())
    assert data["key"] == user.sessions[0].key
    assert data["name"]
    assert data["id"]

def test_create_unknown_institution(client):
    """POST /user { name, email, password }"""
    resp = client.post("/user", data=dumps({
        "name": USER_NAME,
        "email": "cooney.adrian@gmail.com",
        "password": USER_PASSWORD
    }), content_type="application/json")

    assert_api_error(resp, 422, "Institution with domain 'gmail.com'")

def test_create_used_email(user, client):
    """POST /user with used email."""
    resp = client.post("/user", data=dumps({
        "name": USER_NAME,
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }), content_type="application/json")

    assert_api_error(resp, 409)

def test_create_missing_param(client):
    """POST /user with missing parameter"""
    resp = client.post("/user", data=dumps({
        "name": USER_NAME,
        "email": USER_EMAIL
    }), content_type="application/json")

    assert_api_error(resp, 422, meta={ "field": "password" })