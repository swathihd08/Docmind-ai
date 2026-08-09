import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Uploads a document (.pdf, .docx, .xlsx) to the backend pipeline.
 * @param {File} file 
 */
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Sends a question to the backend RAG pipeline.
 * @param {string} query 
 * @param {number} topK 
 */
export const askQuestion = async (query, topK = 3) => {
  const response = await api.post('/documents/ask', {
    query,
    top_k: topK,
  });

  return response.data;
};

export default api;