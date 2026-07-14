import axios from "axios";

const API_URL = "/api";

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
    const response = await api.post("/cv/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
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
    const response = await api.post(
      "/cv/extract",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const getCVData = async (token) => {
  try {
    const response = await api.get("/cv/data", {
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
    const response = await api.post(
      "/ai/generate-answer",
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
    const response = await api.post("/application/submit", applicationData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

// ============================================
// ADMIN APIs
// ============================================

export const adminLogin = async (username, password) => {
  try {
    const response = await api.post("/admin/login", { username, password });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const getAllApplications = async (adminToken) => {
  try {
    const response = await api.get("/admin/applications", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const getApplicationById = async (adminToken, id) => {
  try {
    const response = await api.get(`/admin/applications/${id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

export const updateApplication = async (adminToken, id, data) => {
  try {
    const response = await api.put(`/admin/applications/${id}`, data, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};

// ============================================
// PROFILE APIs
// ============================================

export const getMyProfile = async (token) => {
  try {
    const response = await api.get("/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};
export const updateProfile = async (token, data) => {
  try {
    const response = await api.put("/profile", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};
export const uploadProfilePicture = async (token, formData) => {
  try {
    const response = await api.post("/profile/picture", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};
export const getDashboardStats = async (token) => {
  try {
    const response = await api.get("/profile/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response) return error.response.data;
    return { success: false, message: error.message || "Network error" };
  }
};
export default api;