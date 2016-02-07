from invoke import run, task
from sqlalchemy.sql import text
from fyp.server.web import app
from fyp.server.database import db

@task(name="db")
def database(force=False):
    with app.app_context():
        # Create the database
        if force:
            db.drop_all()
            
        db.create_all()
