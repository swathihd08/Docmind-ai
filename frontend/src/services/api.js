import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getDocuments = async () => {
  const response = await api.get('/documents/');
  return response.data;
};

export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// --- UPDATED: Now accepts chatHistory array ---
export const askQuestion = async (query, chatHistory = [], topK = 3) => {
  const response = await api.post('/documents/ask', {
    query: query,
    top_k: topK,
    chat_history: chatHistory,
  });
  return response.data;
};

export default api;

// --- NEW: Delete a document by ID ---
export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};