# backend/app/routes/user_routes.py
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.models.user import User

# Create Blueprint FIRST
user_bp = Blueprint(
    "users",
    __name__
)

# GET ALL USERS (Professor Only)
@user_bp.route("/", methods=["GET"])
@jwt_required()
def get_users():
    claims = get_jwt()

    # Only professor can view all users
    if claims.get("role") != "professor":
        return jsonify({"msg": "Access forbidden"}), 403

    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

# GET CURRENT USER PROFILE
@user_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    from flask_jwt_extended import get_jwt_identity

    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"msg": "User not found"}), 404

    return jsonify(user.to_dict()), 200