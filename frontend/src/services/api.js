import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// AUTHENTICATION APIs
// ============================================

export const registerUser = async (userData) => {
  try {
    const response = await api.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await api.post("/auth/login", userData);
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const forgotPassword = async (email) => {
  try {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const resetPassword = async (token, password) => {
  try {
    const response = await api.post(`/auth/reset-password/${token}`, { password });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const getProfile = async (token) => {
  try {
    const response = await api.get("/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

// ============================================
// CV APIs
// ============================================

export const uploadCV = async (token, formData) => {
  try {
    const response = await axios.post(`${API_URL}/cv/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const extractCVData = async (token) => {
  try {
    const response = await axios.post(`${API_URL}/cv/extract`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const getCVData = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/cv/data`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

// ============================================
// AI APIs
// ============================================

export const generateAIAnswer = async (token, fieldType) => {
  try {
    const response = await axios.post(
      `${API_URL}/ai/generate-answer`,
      { fieldType },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

// ============================================
// APPLICATION APIs
// ============================================

export const submitApplication = async (token, applicationData) => {
  try {
    const response = await axios.post(
      `${API_URL}/application/submit`,
      applicationData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export default api;