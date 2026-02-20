from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    CORS(app)
    db.init_app(app)

    with app.app_context():
        try:
            db.engine.connect()
            print("PostgreSQL Connected Successfully")
        except Exception as e:
            print("PostgreSQL Connection Failed:", e)

    from .routes.test_routes import test_bp
    app.register_blueprint(test_bp)

    return app
