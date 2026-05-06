# backend/app/config.py

import os  # access environment variables
from dotenv import load_dotenv
from datetime import timedelta  # used for JWT expiry duration

load_dotenv()  # load .env into environment

class Config:
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST")
    DB_NAME = os.getenv("DB_NAME")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # secret key for signing JWT tokens

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.getenv("JWT_EXPIRES", 86400))  # token expiry (default 24 hrs)
    )

    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    )  # DB connection string for PostgreSQL

    SQLALCHEMY_TRACK_MODIFICATIONS = False  # disables overhead of tracking object changes

    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")  # API key for LLM requests