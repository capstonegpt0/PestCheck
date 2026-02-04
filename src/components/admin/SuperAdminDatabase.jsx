import React, { useState, useEffect } from 'react';
import { Database, Search, Edit, Trash2, Plus, RefreshCw, Terminal, Eye, X, Save, Table } from 'lucide-react';
import AdminNavigation from './AdminNavigation';
import api from '../../utils/api';

const SuperAdminDatabase = ({ user, onLogout }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [createFormData, setCreateFormData] = useState({});
  const [customQuery, setCustomQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData();
    }
  }, [selectedTable, currentPage, pageSize]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/database/tables/');
      setTables(response.data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Only Super Admins can access the database management.');
      }
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/database/table_data/', {
        params: {
          table: selectedTable,
          page: currentPage,
          page_size: pageSize
        }
      });
      setTableData(response.data);
    } catch (error) {
      console.error('Error fetching table data:', error);
      alert('Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (row) => {
    setEditingRow(row);
    setEditFormData({ ...row });
    setShowEditModal(true);
  };

  const handleUpdateRow = async () => {
    try {
      await api.put('/super-admin/database/update_row/', {
        table: selectedTable,
        id: editingRow.id,
        updates: editFormData
      });
      alert('Row updated successfully!');
      setShowEditModal(false);
      fetchTableData();
    } catch (error) {
      console.error('Error updating row:', error);
      alert('Failed to update row: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteRow = async (rowId) => {
    if (!window.confirm('Are you sure you want to delete this row? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete('/super-admin/database/delete_row/', {
        params: {
          table: selectedTable,
          id: rowId
        }
      });
      alert('Row deleted successfully!');
      fetchTableData();
    } catch (error) {
      console.error('Error deleting row:', error);
      alert('Failed to delete row: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreateRow = async () => {
    try {
      await api.post('/super-admin/database/create_row/', {
        table: selectedTable,
        data: createFormData
      });
      alert('Row created successfully!');
      setShowCreateModal(false);
      setCreateFormData({});
      fetchTableData();
    } catch (error) {
      console.error('Error creating row:', error);
      alert('Failed to create row: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleExecuteQuery = async () => {
    try {
      const response = await api.post('/super-admin/database/execute_query/', {
        query: customQuery
      });
      setQueryResults(response.data);
    } catch (error) {
      console.error('Error executing query:', error);
      alert('Query failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredData = tableData?.data?.filter(row => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavigation user={user} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                <Database className="w-8 h-8 mr-3 text-purple-600" />
                Database Management
              </h1>
              <p className="text-sm text-purple-600 mt-1">⚡ Super Admin Access Only</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowQueryModal(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Terminal className="w-5 h-5 mr-2" />
                SQL Query
              </button>
              <button
                onClick={fetchTables}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Table className="w-5 h-5 mr-2" />
                Tables ({tables.length})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500 text-sm">Loading...</p>
                ) : (
                  tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => {
                        setSelectedTable(table.name);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedTable === table.name
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="font-medium text-sm">{table.name}</div>
                      <div className="text-xs opacity-75">{table.count} rows</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div className="lg:col-span-3">
            {!selectedTable ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Select a table to view data</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{selectedTable}</h2>
                    <button
                      onClick={() => {
                        const initialData = {};
                        tableData?.columns?.forEach(col => {
                          if (col !== 'id') initialData[col] = '';
                        });
                        setCreateFormData(initialData);
                        setShowCreateModal(true);
                      }}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Row
                    </button>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search in table..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                      <option value={500}>500 per page</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-600">Loading data...</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {tableData?.columns?.map((column) => (
                            <th
                              key={column}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {tableData?.columns?.map((column) => (
                              <td key={column} className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                {String(row[column] ?? '')}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-sm space-x-2">
                              <button
                                onClick={() => handleEditRow(row)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRow(row.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Pagination */}
                {tableData && (
                  <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                      {Math.min(currentPage * pageSize, tableData.total_count)} of{' '}
                      {tableData.total_count} rows
                      {searchQuery && ` (filtered from ${tableData.data?.length})`}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        First
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        Page {currentPage} of {tableData.total_pages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(tableData.total_pages, prev + 1))}
                        disabled={currentPage >= tableData.total_pages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                      <button
                        onClick={() => setCurrentPage(tableData.total_pages)}
                        disabled={currentPage >= tableData.total_pages}
                        className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Last
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Edit Row</h2>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {Object.keys(editFormData).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key} {key === 'id' && '(Read-only)'}
                    </label>
                    <input
                      type="text"
                      value={editFormData[key] ?? ''}
                      onChange={(e) => setEditFormData({ ...editFormData, [key]: e.target.value })}
                      disabled={key === 'id'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleUpdateRow}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 font-medium flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Create New Row</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {Object.keys(createFormData).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key}
                    </label>
                    <input
                      type="text"
                      value={createFormData[key] ?? ''}
                      onChange={(e) => setCreateFormData({ ...createFormData, [key]: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateRow}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Row
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Query Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                  <Terminal className="w-6 h-6 mr-2" />
                  Execute SQL Query
                </h2>
                <button onClick={() => setShowQueryModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SQL Query (SELECT only)
                </label>
                <textarea
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  rows="5"
                  placeholder="SELECT * FROM users WHERE role = 'admin';"
                />
              </div>

              <button
                onClick={handleExecuteQuery}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 font-medium mb-4"
              >
                Execute Query
              </button>

              {queryResults && (
                <div className="mt-4 border border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm text-gray-600">
                      Results: {queryResults.count} rows
                    </p>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          {queryResults.columns?.map((col) => (
                            <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {queryResults.data?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {queryResults.columns?.map((col) => (
                              <td key={col} className="px-4 py-2 text-sm text-gray-900">
                                {String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDatabase;