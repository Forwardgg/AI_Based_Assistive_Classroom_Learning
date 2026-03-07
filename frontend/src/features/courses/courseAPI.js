// frontend/src/features/courses/courseAPI.js

import API from "../../services/api";

export const createCourse = (data) => {
  return API.post("/courses", data);
};

export const getCourses = () => {
  return API.get("/courses");
};

export const joinCourse = (data) => {
  return API.post("/courses/join", data);
};