from flask import Flask, Blueprint
from server import api
from server.response import fail, respond, abort
from server.exc import HttpException, NotFound
from server import config

app = Flask(__name__)

# Connect it to the database
app.config["SQLALCHEMY_DATABASE_URI"] = config.DATABASE_URI.format(**config.__dict__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Register all the blueprints
for name, blueprint in api.__dict__.iteritems():
    if isinstance(blueprint, Blueprint):
        app.register_blueprint(blueprint)


# Parameter errors
@app.errorhandler(422)
def handle_validation_error(err):
    messages = [(name, msg[0]) for name, msg in err.data["messages"].iteritems()]
    name, message = messages[0]
    return fail(422, message, { "field": name })

@app.errorhandler(404)
def handle_error(err):
    return abort(NotFound())

# App errors
@app.errorhandler(HttpException)
def handle_http_exception(exception):
    return fail(exception.code, exception.message, exception.meta)

if config.APP_DEBUG:
    # Print SQLAlchemy queries
    app.config["SQLALCHEMY_ECHO"] = True

    # Allow for CORS in development
    @app.after_request
    def handle_after_request(resp):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "origin, content-type, accept"
        return resp

if not config.APP_DEBUG:
    # Handle app exceptions and don't let the app die
    @app.errorhandler(Exception)
    def handle_exception(exception):
        return fail(500, str(exception))