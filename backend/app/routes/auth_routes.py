# backend/app/routes/auth_routes.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app.models.user import User
from app import db

auth_bp = Blueprint("auth", __name__)  # auth route group

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}  # get request body

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"msg": "Email and password required"}), 400  # validation

    user = User.query.filter_by(email=email).first()  # fetch user by email

    if not user or not user.check_password(password):
        return jsonify({"msg": "Invalid credentials"}), 401  # auth failure

    access_token = create_access_token(
        identity=str(user.id),  # store user id in token
        additional_claims={  # extra info inside JWT
            "role": user.role,
            "email": user.email,
            "name": user.name
        }
    )

    return jsonify({
        "access_token": access_token,
        "user": user.to_dict()  # send user info to frontend
    }), 200

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}  # get request body

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")

    if not all([name, email, password, role]):
        return jsonify({"msg": "All fields are required"}), 400  # validation

    if role not in ["professor", "student"]:
        return jsonify({"msg": "Invalid role"}), 400  # role restriction

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"msg": "Email already registered"}), 400  # duplicate check

    user = User(
        name=name,
        email=email,
        role=role
    )
    user.set_password(password)  # hash password before storing

    db.session.add(user)
    db.session.commit()  # save to database

    return jsonify({"msg": "User registered successfully"}), 201