# backend/app/routes/auth_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app.models.user import User
from app import db

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"msg": "Invalid credentials"}), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "email": user.email
        }
    )

    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([name, email, password, role]):
        return jsonify({"msg": "All fields are required"}), 400

    if role not in ["professor", "student"]:
        return jsonify({"msg": "Invalid role"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"msg": "Email already registered"}), 400

    user = User(
        name=name,
        email=email,
        role=role
    )
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({"msg": "User registered successfully"}), 201