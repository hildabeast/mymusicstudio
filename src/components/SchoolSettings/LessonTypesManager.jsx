import React, { useState, useEffect } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiAlertCircle, FiCheck, FiDollarSign, FiClock, FiUsers, FiUser } from 'react-icons/fi';
import { supabase } from '../../config/supabase';
import { useUser } from '../../contexts/UserContext';
import ConfirmModal from '../common/ConfirmModal';

const LessonTypesManager = () => {
  const { currentSchoolID, userIsAdmin } = useUser();
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLessonType, setSelectedLessonType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_min: 30,
    price_cents: 0,
    lesson_category: 'individual'
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (currentSchoolID) {
      fetchLessonTypes();
    }
  }, [currentSchoolID]);

  const fetchLessonTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📚 Fetching lesson types for school:', currentSchoolID);
      
      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .eq('school_id', currentSchoolID)
        .order('name');
      
      if (error) {
        throw new Error(`Error fetching lesson types: ${error.message}`);
      }
      
      console.log('📚 Lesson types fetched:', data?.length || 0);
      setLessonTypes(data || []);
    } catch (error) {
      console.error('❌ Error fetching lesson types:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      duration_min: 30,
      price_cents: 0,
      lesson_category: 'individual'
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (lessonType) => {
    setSelectedLessonType(lessonType);
    setFormData({
      name: lessonType.name || '',
      duration_min: lessonType.duration_min || 30,
      price_cents: lessonType.price_cents || 0,
      lesson_category: lessonType.lesson_category || 'individual'
    });
    setShowEditModal(true);
  };

  const handleOpenDeleteModal = (lessonType) => {
    setSelectedLessonType(lessonType);
    setShowDeleteModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setSelectedLessonType(null);
    setSuccess(null);
    setSaving(false);
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) {
      errors.push('Name is required');
    }
    if (!formData.duration_min || formData.duration_min <= 0) {
      errors.push('Duration must be greater than 0');
    }
    if (formData.price_cents < 0) {
      errors.push('Price cannot be negative');
    }
    if (!formData.lesson_category) {
      errors.push('Lesson category is required');
    }
    return errors;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate form
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      if (showAddModal) {
        // Create new lesson type
        const { data, error } = await supabase
          .from('lesson_types')
          .insert({
            school_id: currentSchoolID,
            name: formData.name.trim(),
            duration_min: parseInt(formData.duration_min),
            price_cents: parseInt(formData.price_cents),
            lesson_category: formData.lesson_category
          })
          .select();
        
        if (error) throw new Error(`Error creating lesson type: ${error.message}`);
        
        console.log('✅ New lesson type created:', data);
        setSuccess('Lesson type created successfully!');
        
        // Update the local state
        setLessonTypes(prev => [...prev, data[0]]);
        
        // Close modal after a delay
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      } else if (showEditModal && selectedLessonType) {
        // Update existing lesson type
        const { data, error } = await supabase
          .from('lesson_types')
          .update({
            name: formData.name.trim(),
            duration_min: parseInt(formData.duration_min),
            price_cents: parseInt(formData.price_cents),
            lesson_category: formData.lesson_category
          })
          .eq('id', selectedLessonType.id)
          .eq('school_id', currentSchoolID) // Extra security
          .select();
        
        if (error) throw new Error(`Error updating lesson type: ${error.message}`);
        
        console.log('✅ Lesson type updated:', data);
        setSuccess('Lesson type updated successfully!');
        
        // Update the local state
        setLessonTypes(prev => prev.map(lt => lt.id === selectedLessonType.id ? data[0] : lt));
        
        // Close modal after a delay
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Error saving lesson type:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      setError(null);
      
      if (!selectedLessonType) return;
      
      const { error } = await supabase
        .from('lesson_types')
        .delete()
        .eq('id', selectedLessonType.id)
        .eq('school_id', currentSchoolID); // Extra security
      
      if (error) throw new Error(`Error deleting lesson type: ${error.message}`);
      
      console.log('✅ Lesson type deleted:', selectedLessonType.id);
      setSuccess('Lesson type deleted successfully!');
      
      // Update the local state
      setLessonTypes(prev => prev.filter(lt => lt.id !== selectedLessonType.id));
      
      // Close modal after a delay
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      console.error('❌ Error deleting lesson type:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (cents) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getCategoryIcon = (category) => {
    return category === 'individual' ? FiUser : FiUsers;
  };

  if (!userIsAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <SafeIcon icon={FiAlertCircle} className="text-amber-500 text-2xl mb-4 mx-auto" />
        <h2 className="text-lg font-semibold text-amber-800 mb-2">Admin Access Required</h2>
        <p className="text-amber-700 mb-4">You need administrator privileges to manage lesson types.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/4"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Lesson Types</h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
        >
          <SafeIcon icon={FiPlus} />
          <span>Add Lesson Type</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {lessonTypes.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lessonTypes.map((lessonType) => (
                <tr key={lessonType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{lessonType.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiClock} className="text-gray-400" />
                      <span>{lessonType.duration_min} min</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiDollarSign} className="text-gray-400" />
                      <span>{formatPrice(lessonType.price_cents)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={getCategoryIcon(lessonType.lesson_category)} className="text-gray-400" />
                      <span className="capitalize">{lessonType.lesson_category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(lessonType)}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit lesson type"
                      >
                        <SafeIcon icon={FiEdit2} />
                      </button>
                      <button
                        onClick={() => handleOpenDeleteModal(lessonType)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete lesson type"
                      >
                        <SafeIcon icon={FiTrash2} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiClock} className="text-gray-400 text-xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Lesson Types Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first lesson type to start organizing your lessons.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center space-x-2"
          >
            <SafeIcon icon={FiPlus} />
            <span>Add First Lesson Type</span>
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                {showAddModal ? 'Add New Lesson Type' : 'Edit Lesson Type'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={saving}
              >
                <SafeIcon icon={FiX} className="text-gray-500" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <div className="flex items-center">
                  <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <div className="flex items-center">
                  <SafeIcon icon={FiCheck} className="text-green-500 mr-2" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Type Name*
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  placeholder="e.g., Standard Piano Lesson"
                  disabled={saving}
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)*
                </label>
                <input
                  type="number"
                  value={formData.duration_min}
                  onChange={(e) => handleInputChange('duration_min', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  placeholder="30"
                  min="1"
                  disabled={saving}
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (in cents)*
                </label>
                <div className="flex items-center">
                  <span className="absolute ml-4 text-gray-500">
                    <SafeIcon icon={FiDollarSign} />
                  </span>
                  <input
                    type="number"
                    value={formData.price_cents}
                    onChange={(e) => handleInputChange('price_cents', parseInt(e.target.value) || 0)}
                    className="w-full pl-10 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    placeholder="5000"
                    min="0"
                    disabled={saving}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Current price: {formatPrice(formData.price_cents)}
                </p>
              </div>

              {/* Lesson Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Category*
                </label>
                <div className="relative">
                  <select
                    value={formData.lesson_category}
                    onChange={(e) => handleInputChange('lesson_category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent appearance-none"
                    disabled={saving}
                    required
                  >
                    <option value="individual">Individual</option>
                    <option value="group">Group</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <SafeIcon icon={getCategoryIcon(formData.lesson_category)} className="text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : (showAddModal ? 'Create' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLessonType && (
        <ConfirmModal
          title="Delete Lesson Type"
          message={`Are you sure you want to delete the lesson type "${selectedLessonType.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmButtonClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleDelete}
          onCancel={handleCloseModal}
        />
      )}
    </div>
  );
};

export default LessonTypesManager;