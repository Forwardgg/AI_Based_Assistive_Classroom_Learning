// frontend/src/features/auth/authAPI.js
import API from "../../services/api";

export const loginUser = (formData) => {
  return API.post("/auth/login", formData);
};

export const signupUser = (formData) => {
  return API.post("/auth/signup", formData);
};