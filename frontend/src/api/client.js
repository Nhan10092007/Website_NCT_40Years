import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.DEV
    ? '/api'
    : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('nct40_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiError(error) {
  return error.response?.data?.message || error.message || 'Đã có lỗi xảy ra';
}

export default client;
