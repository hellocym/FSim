import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
const WS_BASE_URL = 'ws://localhost:8000/ws';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// 机器相关API
export const machineAPI = {
  getAll: () => api.get('/machines'),
  getById: (id) => api.get(`/machines/${id}`),
  create: (data) => api.post('/machines', data),
  update: (id, data) => api.put(`/machines/${id}`, data),
  delete: (id) => api.delete(`/machines/${id}`),
  deleteAll: () => api.delete('/machines'),
};

// 连接相关API
export const connectionAPI = {
  getAll: () => api.get('/connections'),
  create: (data) => api.post('/connections', data),
  delete: (id) => api.delete(`/connections/${id}`),
};

// 物品类型相关API
export const itemTypeAPI = {
  getAll: () => api.get('/machines/item-types'),
  create: (data) => api.post('/machines/item-types', data),
};

// 生产相关API
export const productionAPI = {
  getRates: () => api.get('/production/rates'),
  getMachineRates: (machineId) => api.get(`/production/rates/${machineId}`),
  getHistory: (machineId, itemType, hours = 1) => 
    api.get(`/production/history/${machineId}`, { params: { item_type: itemType, hours } }),
  getStatus: () => api.get('/production/status'),
  getOverview: () => api.get('/production/overview'),
  simulate: (machineId, itemType, quantity) => 
    api.post(`/production/simulate/${machineId}`, null, { params: { item_type: itemType, quantity } }),
};

// WebSocket连接
export const createWebSocket = (endpoint) => {
  return new WebSocket(`${WS_BASE_URL}${endpoint}`);
};

export default api;