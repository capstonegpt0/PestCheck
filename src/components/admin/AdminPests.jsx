import React, { useState, useEffect } from 'react';
import { Search, Book, Plus, Edit, Trash2, Eye, EyeOff, X } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const AdminPests = ({ user, onLogout }) => {
  const [pests, setPests] = useState([]);
  const [filteredPests, setFilteredPests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cropFilter, setCropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPest, setEditingPest] = useState(null);
  const [selectedPest, setSelectedPest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
    crop_affected: '',
    description: '',
    symptoms: '',
    control_methods: '',
    prevention: '',
    image_url: '',
    is_published: true
  });

  useEffect(() => {
    fetchPests();
  }, []);

  useEffect(() => {
    filterPests();
  }, [searchQuery, cropFilter, statusFilter, pests]);

  const fetchPests = async () => {
    try {
      const response = await api.get('/admin/pests/');
      const pestData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || []);
      
      setPests(pestData);
      setFilteredPests(pestData);
    } catch (error) {
      console.error('Error fetching pests:', error);
      alert('Failed to load pest information');
      setPests([]);
      setFilteredPests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPests = () => {
    let filtered = pests;

    if (cropFilter !== 'all') {
      filtered = filtered.filter(p => p.crop_affected.toLowerCase() === cropFilter.toLowerCase());
    }

    if (statusFilter === 'published') {
      filtered = filtered.filter(p => p.is_published);
    } else if (statusFilter === 'unpublished') {
      filtered = filtered.filter(p => !p.is_published);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.scientific_name.toLowerCase().includes(query) ||
        p.crop_affected.toLowerCase().includes(query)
      );
    }

    setFilteredPests(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingPest) {
        await api.put(`/admin/pests/${editingPest.id}/`, formData);
        alert('Pest information updated successfully!');
      } else {
        await api.post('/admin/pests/', formData);
        alert('Pest information created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      fetchPests();
    } catch (error) {
      console.error('Error saving pest info:', error);
      alert('Failed to save pest information');
    }
  };

  const handleDelete = async (pestId) => {
    if (!window.confirm('Are you sure you want to delete this pest information?')) {
      return;
    }

    try {
      await api.delete(`/admin/pests/${pestId}/`);
      alert('Pest information deleted successfully!');
      fetchPests();
    } catch (error) {
      console.error('Error deleting pest:', error);
      alert('Failed to delete pest information');
    }
  };

  const handleTogglePublish = async (pestId) => {
    try {
      await api.post(`/admin/pests/${pestId}/toggle_publish/`);
      fetchPests();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      alert('Failed to toggle publish status');
    }
  };

  const openEditModal = (pest) => {
    setEditingPest(pest);
    setFormData({
      name: pest.name,
      scientific_name: pest.scientific_name,
      crop_affected: pest.crop_affected,
      description: pest.description,
      symptoms: pest.symptoms,
      control_methods: pest.control_methods,
      prevention: pest.prevention,
      image_url: pest.image_url || '',
      is_published: pest.is_published
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPest(null);
    setFormData({
      name: '',
      scientific_name: '',
      crop_affected: '',
      description: '',
      symptoms: '',
      control_methods: '',
      prevention: '',
      image_url: '',
      is_published: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Pest Information Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Pest Info
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, scientific name, or crop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-2">
              <select
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Crops</option>
                <option value="rice">Rice</option>
                <option value="corn">Corn</option>
              </select>

              <button
                onClick={() => setStatusFilter('all')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'published' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Published
              </button>
              <button
                onClick={() => setStatusFilter('unpublished')}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  statusFilter === 'unpublished' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unpublished
              </button>
            </div>
          </div>
        </div>

        {/* Pests Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Loading pest information...</p>
            </div>
          ) : filteredPests.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center">
              <Book className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No pest information found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add First Pest Info
              </button>
            </div>
          ) : (
            filteredPests.map((pest) => (
              <div
                key={pest.id}
                className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${
                  !pest.is_published ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <Book className="w-8 h-8 text-green-600" />
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      pest.crop_affected.toLowerCase() === 'rice' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {pest.crop_affected}
                    </span>
                    {pest.is_published ? (
                      <Eye className="w-5 h-5 text-green-600" title="Published" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-400" title="Unpublished" />
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-800 mb-2">{pest.name}</h3>
                <p className="text-sm text-gray-600 italic mb-3">{pest.scientific_name}</p>
                <p className="text-gray-700 line-clamp-3 mb-4">{pest.description}</p>

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedPest(pest);
                      setShowDetailModal(true);
                    }}
                    className="flex-1 text-blue-600 hover:text-blue-800 py-2 px-3 border border-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => openEditModal(pest)}
                    className="p-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleTogglePublish(pest.id)}
                    className={`p-2 border rounded-lg ${
                      pest.is_published 
                        ? 'text-green-600 hover:text-green-800 border-green-300 hover:bg-green-50'
                        : 'text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                    title={pest.is_published ? 'Unpublish' : 'Publish'}
                  >
                    {pest.is_published ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(pest.id)}
                    className="p-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingPest ? 'Edit Pest Information' : 'Add New Pest Information'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pest Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Brown Planthopper"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Scientific Name *
                    </label>
                    <input
                      type="text"
                      value={formData.scientific_name}
                      onChange={(e) => setFormData({...formData, scientific_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Nilaparvata lugens"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Affected *
                  </label>
                  <select
                    value={formData.crop_affected}
                    onChange={(e) => setFormData({...formData, crop_affected: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select crop</option>
                    <option value="rice">Rice</option>
                    <option value="corn">Corn</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="General description of the pest..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Symptoms *
                  </label>
                  <textarea
                    value={formData.symptoms}
                    onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Visible symptoms on crops..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Control Methods *
                  </label>
                  <textarea
                    value={formData.control_methods}
                    onChange={(e) => setFormData({...formData, control_methods: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Methods to control the pest..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prevention *
                  </label>
                  <textarea
                    value={formData.prevention}
                    onChange={(e) => setFormData({...formData, prevention: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Prevention measures..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({...formData, is_published: e.target.checked})}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                    Publish immediately (visible to farmers)
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium"
                  >
                    {editingPest ? 'Update Pest Info' : 'Create Pest Info'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-gray-800">{selectedPest.name}</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPest(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-lg text-gray-600 italic mb-4">{selectedPest.scientific_name}</p>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedPest.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Symptoms</h3>
                  <p className="text-gray-700">{selectedPest.symptoms}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Control Methods</h3>
                  <p className="text-gray-700">{selectedPest.control_methods}</p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Prevention</h3>
                  <p className="text-gray-700">{selectedPest.prevention}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedPest.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedPest.is_published ? 'Published' : 'Unpublished'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedPest(null);
                    }}
                    className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPests;