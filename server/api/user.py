from flask import Blueprint, request, session
from sqlalchemy.exc import IntegrityError
from webargs import fields, validate
from webargs.flaskparser import parser, use_args
from server import model
from server.library.util import merge
from server.database import db
from server.response import respond, success
from server.library.schema import schema
from server.exc import NotFound, LoginError, AlreadyExists, InvalidEntity

User = Blueprint("user", __name__)

@User.route("/user", methods=["POST"])
@use_args(schema(model.User, only=("name", "email", "password")))
def create(details):
    try:
        user = model.User(**details)
        db.session.add(user)

        # Log the user in
        session = user.login(db.session)
        db.session.commit()

        userSchema = schema(model.User, exclude=("password",))
        return respond(merge({ "key": session.key}, user.dump(exclude=("password",))))
    except NotFound as nf:
        raise InvalidEntity("Institution", "domain", nf.meta["fields"]["domain"])
    except IntegrityError as ie:
        raise AlreadyExists("User", "email", details["email"])

@User.route("/user/<int:user>", methods=["GET", "PUT"])
def get_or_update_user(user): 
    # Get the user
    user = model.User.query.get(user)

    if request.method == "GET":
        userSchema = schema(model.User, exclude=("password",))
        return respond(user.dump(exclude=("password",)))
    elif request.method == "PUT":
        pass