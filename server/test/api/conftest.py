import pytest
import traceback
from sqlalchemy_utils import database_exists, create_database, drop_database
from server.web import app as _app
from server import config
from server.database import db as _db
from server import model

DB_NAME = config.DB_NAME + "_test"

@pytest.fixture(scope="session")
def app(request):
    """Session-wide test `Flask` application."""
    config.DB_NAME = DB_NAME
    DATABASE_URI = config.DATABASE_URI.format(**config.__dict__)

    if not database_exists(DATABASE_URI):
        create_database(DATABASE_URI)

    print "Test Database: %s" % DATABASE_URI

    # Config the app
    _app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URI
    _app.config["TESTING"] = True

    # Establish an application context before running the tests.
    ctx = _app.app_context()
    ctx.push()

    def teardown():
        ctx.pop()

    request.addfinalizer(teardown)
    return _app

@pytest.fixture(scope="session")
def db(app, request):
    """Session-wide test database."""

    _db.init_app(app)
    _db.drop_all()
    _db.create_all()

    return _db
    
@pytest.fixture(scope="session")
def client(db, app):
    """Creates a new test client."""
    return app.test_client()

@pytest.fixture
def session(db, monkeypatch, request):
    """Creates a new database session for a test."""
    connection = db.engine.connect()
    transaction = connection.begin()

    # Fix from https://github.com/mitsuhiko/flask-sqlalchemy/pull/249
    monkeypatch.setattr(db, "get_engine", lambda *args: connection)

    def teardown():
        transaction.rollback()
        connection.close()
        db.session.remove()

    request.addfinalizer(teardown)
    return db.session

@pytest.fixture
def user(session):
    """Creates a default, not logged in user."""
    user = model.User(name="Adrian", email="a.cooney10@nuigalway.ie", password="root")
    session.add(user)
    session.commit()
    return user