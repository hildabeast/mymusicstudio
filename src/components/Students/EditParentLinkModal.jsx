import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiX, FiEdit2, FiUser, FiCheck, FiAlertCircle, FiMail, FiPhone, FiMapPin, FiMessageSquare } from 'react-icons/fi'
import { supabase } from '../../config/supabase'

const EditParentLinkModal = ({ parentLink, studentName, onClose }) => {
  // Relationship data (from parent_links table)
  const [relationship, setRelationship] = useState(parentLink.relationship || '')
  const [isEmergencyContact, setIsEmergencyContact] = useState(parentLink.emergency_contact || false)

  // Parent contact data (from parents table)
  const [parentData, setParentData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    notes: '' // Added notes field
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('relationship') // 'relationship' or 'contact'

  // Initialize parent contact data when modal opens
  useEffect(() => {
    if (parentLink.parent) {
      setParentData({
        first_name: parentLink.parent.first_name || '',
        last_name: parentLink.parent.last_name || '',
        email: parentLink.parent.email || '',
        phone_number: parentLink.parent.phone_number || '',
        address: parentLink.parent.address || '',
        notes: parentLink.parent.notes || '' // Initialize notes field
      })
    }
  }, [parentLink])

  const handleParentDataChange = (field, value) => {
    setParentData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = []
    if (!parentData.first_name.trim()) {
      errors.push('First name is required')
    }
    if (!parentData.last_name.trim()) {
      errors.push('Last name is required')
    }
    if (parentData.email && !parentData.email.includes('@')) {
      errors.push('Please enter a valid email address')
    }
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('✏️ Updating parent link and contact details:', {
        parentLinkId: parentLink.id,
        parentId: parentLink.parent.id,
        relationship: relationship.trim(),
        emergency_contact: isEmergencyContact,
        parentData
      })

      // Update parent_links table (relationship info) - using correct table name
      const { error: linkError } = await supabase
        .from('parent_links')
        .update({
          relationship: relationship.trim() || null,
          emergency_contact: isEmergencyContact,
          updated_at: new Date().toISOString()
        })
        .eq('id', parentLink.id)

      if (linkError) {
        console.error('❌ Error updating parent link:', linkError)
        throw new Error(`Failed to update relationship information: ${linkError.message}`)
      }

      // Update parents table (contact info) - using correct table name
      const { error: parentError } = await supabase
        .from('parents')
        .update({
          first_name: parentData.first_name.trim(),
          last_name: parentData.last_name.trim(),
          email: parentData.email.trim() || null,
          phone_number: parentData.phone_number.trim() || null,
          address: parentData.address.trim() || null,
          notes: parentData.notes.trim() || null, // Include notes field in update
          updated_at: new Date().toISOString()
        })
        .eq('id', parentLink.parent.id)

      if (parentError) {
        console.error('❌ Error updating parent contact:', parentError)
        throw new Error(`Failed to update parent contact information: ${parentError.message}`)
      }

      console.log('✅ Parent link and contact details updated successfully')
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('❌ Error updating parent information:', error)
      setError(error.message || 'Failed to update parent information')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiEdit2} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Edit Parent Information</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>

        {/* Parent info header */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiUser} className="text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800">
                {parentData.first_name && parentData.last_name
                  ? `${parentData.first_name} ${parentData.last_name}`
                  : 'Parent/Guardian'}
              </h3>
              <p className="text-sm text-gray-600">
                Parent of {studentName}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setActiveTab('relationship')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'relationship'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <SafeIcon icon={FiUser} className="text-sm" />
            <span className="font-medium">Relationship</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'contact'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <SafeIcon icon={FiMail} className="text-sm" />
            <span className="font-medium">Contact Details</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
              <div>
                <p className="text-red-600 text-sm font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiCheck} className="text-green-500 mr-2" />
              <p className="text-green-600 text-sm">
                Parent information updated successfully!
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Relationship Tab */}
          {activeTab === 'relationship' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Relationship Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Relationship to Student
                </label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="e.g., Mother, Father, Guardian"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emergency-contact-edit"
                  checked={isEmergencyContact}
                  onChange={(e) => setIsEmergencyContact(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="emergency-contact-edit" className="ml-2 block text-sm text-gray-700">
                  Emergency Contact
                </label>
              </div>
            </div>
          )}

          {/* Contact Details Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Contact Information</h3>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={parentData.first_name}
                    onChange={(e) => handleParentDataChange('first_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={parentData.last_name}
                    onChange={(e) => handleParentDataChange('last_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <SafeIcon icon={FiMail} className="text-gray-400 mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={parentData.email}
                  onChange={(e) => handleParentDataChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="parent@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <SafeIcon icon={FiPhone} className="text-gray-400 mr-1" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={parentData.phone_number}
                  onChange={(e) => handleParentDataChange('phone_number', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <SafeIcon icon={FiMapPin} className="text-gray-400 mr-1" />
                  Address
                </label>
                <textarea
                  value={parentData.address}
                  onChange={(e) => handleParentDataChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                  placeholder="Enter parent's address"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <SafeIcon icon={FiMessageSquare} className="text-gray-400 mr-1" />
                  Notes
                </label>
                <textarea
                  value={parentData.notes}
                  onChange={(e) => handleParentDataChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                  placeholder="Additional notes about this parent/guardian"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : success ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Required Fields Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
          <div className="flex items-start space-x-2">
            <SafeIcon icon={FiAlertCircle} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Required Fields</p>
              <p>First name and last name are required. All other fields are optional but recommended for better communication.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditParentLinkModal