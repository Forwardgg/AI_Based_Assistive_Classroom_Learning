from flask import Blueprint, jsonify

test_bp = Blueprint("test", __name__)

@test_bp.route("/api/test", methods=["GET"])
def test():
    return jsonify({"message": "Backend connected!"})
