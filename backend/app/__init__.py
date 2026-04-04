from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="eventlet"
)
def create_app():
    app = Flask(__name__)
    app.config.from_object("app.config.Config")

    # Initialize extensions
    CORS(app, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(app)

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

    # =========================
    # IMPORT MODELS
    # =========================
    from .models.user import User
    from .models.enrollment import Enrollment
    from .models.session import Session
    from .models.session_partition import SessionPartition
    from .models.transcript_segment import TranscriptSegment
    from .models.transcript import Transcript
    from .models.quiz import Quiz
    from .models.question import Question
    from .models.lecture_notes import LectureNotes
    from .models.student_answer import StudentAnswer

    # =========================
    # TEST DB CONNECTION
    # =========================
    with app.app_context():
        try:
            db.engine.connect()
            print("PostgreSQL Connected Successfully")
        except Exception as e:
            print("PostgreSQL Connection Failed:", e)

    # =========================
    # REGISTER BLUEPRINTS
    # =========================
    from .routes.user_routes import user_bp
    from .routes.auth_routes import auth_bp
    from .routes.course_routes import course_bp
    from .routes.session_routes import session_bp
    from .routes.transcript_routes import transcript_bp
    from .routes.quiz_routes import quiz_bp
    from .routes.analytics_routes import analytics_bp

    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(course_bp, url_prefix="/api/courses")
    app.register_blueprint(session_bp, url_prefix="/api/sessions")
    app.register_blueprint(transcript_bp, url_prefix="/api/transcripts")
    app.register_blueprint(quiz_bp, url_prefix="/api/quiz")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    return app