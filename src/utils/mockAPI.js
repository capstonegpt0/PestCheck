// src/utils/mockApi.js
import { mockPests, mockDetections, mockFarms, mockStats } from '../data/mockData';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const mockApi = {
  // Auth endpoints
  async post(url, data) {
    await delay(500); // Simulate network delay

    if (url.includes('/auth/login/')) {
      return {
        data: {
          user: {
            id: 1,
            username: data.username,
            email: 'user@example.com',
            role: 'farmer',
            first_name: 'Test',
            last_name: 'User'
          },
          tokens: {
            access: 'mock-access-token',
            refresh: 'mock-refresh-token'
          }
        }
      };
    }

    if (url.includes('/auth/register/')) {
      return {
        data: {
          user: {
            id: 2,
            username: data.username,
            email: data.email,
            role: 'farmer',
            first_name: data.first_name,
            last_name: data.last_name
          },
          tokens: {
            access: 'mock-access-token',
            refresh: 'mock-refresh-token'
          }
        }
      };
    }


    if (url.includes('/farms/')) {
      const newFarm = {
        id: Date.now(),
        ...data,
        is_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockFarms.push(newFarm);
      return { data: newFarm };
    }

    throw new Error('Mock API endpoint not implemented');
  },

  async get(url) {
    await delay(500);

    if (url.includes('/auth/profile/')) {
      return {
        data: {
          id: 1,
          username: 'testuser',
          email: 'user@example.com',
          role: 'farmer',
          first_name: 'Test',
          last_name: 'User',
          phone: '09123456789',
          created_at: new Date().toISOString()
        }
      };
    }

    if (url.includes('/detections/statistics/')) {
      return { data: mockStats };
    }

    if (url.includes('/detections/heatmap_data/')) {
      return {
        data: mockDetections.map(d => ({
          id: d.id,
          pest: d.pest_name,
          severity: d.severity,
          lat: d.latitude,
          lng: d.longitude,
          farm_id: null,
          reported_at: d.detected_at,
          active: true,
          status: 'verified'
        }))
      };
    }

    if (url.includes('/detections/')) {
      return {
        data: {
          results: mockDetections,
          count: mockDetections.length
        }
      };
    }

    if (url.includes('/farms/')) {
      return { data: mockFarms };
    }

    if (url.includes('/pests/')) {
      return { data: mockPests };
    }

    throw new Error('Mock API endpoint not implemented');
  },

  async delete(url) {
    await delay(300);
    
    if (url.includes('/farms/')) {
      const id = parseInt(url.split('/').slice(-2)[0]);
      const index = mockFarms.findIndex(f => f.id === id);
      if (index > -1) {
        mockFarms.splice(index, 1);
      }
      return { data: { success: true } };
    }

    return { data: { success: true } };
  },

  async patch(url, data) {
    await delay(300);
    
    if (url.includes('/detections/')) {
      const id = parseInt(url.split('/').slice(-2)[0]);
      const detection = mockDetections.find(d => d.id === id);
      if (detection) {
        Object.assign(detection, data);
      }
      return { data: detection };
    }

    return { data };
  },

  async put(url, data) {
    return this.patch(url, data);
  }
};

export default mockApi;