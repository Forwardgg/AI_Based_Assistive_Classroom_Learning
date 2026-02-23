# backend/app/__init__.py

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Initialize extensions
    CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True)
    db.init_app(app)
    jwt.init_app(app)

    # 🔹 JWT Error Handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {"message": "Token expired"}, 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {"message": "Invalid token"}, 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {"message": "Authorization required"}, 401

    # Import models
    from .models.user import User
    from .models.enrollment import Enrollment

    # Test DB connection
    with app.app_context():
        try:
            db.engine.connect()
            print("PostgreSQL Connected Successfully")
        except Exception as e:
            print("PostgreSQL Connection Failed:", e)

    # Register blueprints
    from .routes.user_routes import user_bp
    from .routes.auth_routes import auth_bp
    from .routes.course_routes import course_bp

    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(course_bp, url_prefix="/api/courses")
    return app