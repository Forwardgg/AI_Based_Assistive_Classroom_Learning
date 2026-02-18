from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2

# Create app 1st
app = Flask(__name__)
CORS(app)

# Database connection function
def get_db_connection():
    conn = psycopg2.connect(
        host="localhost",
        database="AI_classroom",
        user="postgres",
        password="roitmahan"
    )
    return conn

# Home route
@app.route("/")
def home():
    return jsonify({"message": "Backend is running!"})

# Test DB route
@app.route("/test-db")
def test_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({"database_version": version})

# Run server
if __name__ == "__main__":
    app.run(debug=True)
