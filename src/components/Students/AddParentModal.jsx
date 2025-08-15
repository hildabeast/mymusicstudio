import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiX, FiUserPlus, FiSearch, FiPlus, FiCheck, FiAlertCircle } from 'react-icons/fi'
import { supabase } from '../../config/supabase'

const AddParentModal = ({ studentId, studentName, onClose }) => {
  const [mode, setMode] = useState('select') // 'select', 'existing', 'new'
  const [existingParents, setExistingParents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredParents, setFilteredParents] = useState([])
  const [selectedParentId, setSelectedParentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Form state for relationship details (used in both modes)
  const [relationship, setRelationship] = useState('')
  const [isEmergencyContact, setIsEmergencyContact] = useState(false)

  // Form state for new parent
  const [newParentData, setNewParentData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: ''
  })

  // Fetch existing parents
  useEffect(() => {
    if (mode === 'existing') {
      fetchExistingParents()
    }
  }, [mode])

  // Filter parents based on search term
  useEffect(() => {
    if (existingParents.length > 0) {
      const filtered = existingParents.filter(parent => {
        const fullName = `${parent.first_name || ''} ${parent.last_name || ''}`.toLowerCase()
        const email = parent.email ? parent.email.toLowerCase() : ''
        const term = searchTerm.toLowerCase()
        return fullName.includes(term) || email.includes(term)
      })
      setFilteredParents(filtered)
    }
  }, [searchTerm, existingParents])

  const fetchExistingParents = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📚 Fetching existing parents for student:', studentId)

      // Get all parents using correct table name
      const { data: allParents, error: parentsError } = await supabase
        .from('parents')
        .select('id, first_name, last_name, email')
        .order('last_name')

      if (parentsError) {
        console.error('❌ Error fetching all parents:', parentsError)
        throw new Error(`Failed to load parents: ${parentsError.message}`)
      }

      console.log('📚 All parents found:', allParents?.length || 0)

      // Get parents already linked to this student using correct table name
      const { data: linkedParents, error: linkedError } = await supabase
        .from('parent_links')
        .select('parent_id')
        .eq('student_id', studentId)

      if (linkedError) {
        console.error('❌ Error fetching linked parents:', linkedError)
        throw new Error(`Failed to check existing links: ${linkedError.message}`)
      }

      console.log('📚 Linked parents found:', linkedParents?.length || 0)

      // Filter out parents already linked to this student
      const linkedParentIds = linkedParents?.map(link => link.parent_id) || []
      const availableParents = allParents?.filter(parent => !linkedParentIds.includes(parent.id)) || []
      console.log('📚 Available parents for linking:', availableParents.length)

      setExistingParents(availableParents)
      setFilteredParents(availableParents)
    } catch (error) {
      console.error('❌ Error fetching existing parents:', error)
      setError(error.message || 'Failed to load existing parents')
    } finally {
      setLoading(false)
    }
  }

  const handleNewParentInputChange = (field, value) => {
    setNewParentData(prev => ({ ...prev, [field]: value }))
  }

  const validateNewParentForm = () => {
    const errors = []
    if (!newParentData.first_name.trim()) {
      errors.push('First name is required')
    }
    if (!newParentData.last_name.trim()) {
      errors.push('Last name is required')
    }
    if (newParentData.email && !newParentData.email.includes('@')) {
      errors.push('Please enter a valid email address')
    }
    return errors
  }

  const createParentLink = async (parentId) => {
    try {
      console.log('🔗 Creating parent link:', {
        parentId,
        studentId,
        relationship,
        isEmergencyContact
      })

      const { data, error } = await supabase
        .from('parent_links')
        .insert({
          parent_id: parentId,
          student_id: studentId,
          relationship: relationship.trim() || null,
          emergency_contact: isEmergencyContact
        })
        .select()

      if (error) {
        console.error('❌ Error creating parent link:', error)
        throw new Error(`Failed to link parent to student: ${error.message}`)
      }

      console.log('✅ Parent link created successfully:', data)
      return data
    } catch (error) {
      console.error('❌ Error creating parent link:', error)
      throw error
    }
  }

  const handleLinkExistingParent = async () => {
    if (!selectedParentId) {
      setError('Please select a parent')
      return
    }

    try {
      setLoading(true)
      setError(null)

      await createParentLink(selectedParentId)
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      setError(error.message || 'Failed to link parent')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNewParent = async () => {
    const validationErrors = validateNewParentForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('👤 Creating new parent:', newParentData)

      // 1. Create new parent using correct table name
      const { data: newParent, error: createError } = await supabase
        .from('parents')
        .insert({
          first_name: newParentData.first_name.trim(),
          last_name: newParentData.last_name.trim(),
          email: newParentData.email.trim() || null,
          phone_number: newParentData.phone_number.trim() || null,
          address: newParentData.address.trim() || null
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ Error creating new parent:', createError)
        throw new Error(`Failed to create parent: ${createError.message}`)
      }

      console.log('✅ New parent created:', newParent)

      // 2. Create parent link
      await createParentLink(newParent.id)
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('❌ Error creating new parent:', error)
      setError(error.message || 'Failed to create parent')
    } finally {
      setLoading(false)
    }
  }

  const renderSelectMode = () => (
    <>
      <div className="mb-6 text-center">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Add Parent/Guardian</h3>
        <p className="text-gray-600">
          Choose how you want to add a parent for {studentName}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setMode('existing')}
          className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-6 text-center transition-colors flex flex-col items-center"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <SafeIcon icon={FiSearch} className="text-blue-600 text-xl" />
          </div>
          <h4 className="font-medium text-gray-800 mb-1">Link Existing Parent</h4>
          <p className="text-sm text-gray-600">
            Connect to a parent already in the system
          </p>
        </button>
        <button
          onClick={() => setMode('new')}
          className="bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl p-6 text-center transition-colors flex flex-col items-center"
        >
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mb-3">
            <SafeIcon icon={FiUserPlus} className="text-teal-600 text-xl" />
          </div>
          <h4 className="font-medium text-gray-800 mb-1">Create New Parent</h4>
          <p className="text-sm text-gray-600">
            Add a new parent to the system
          </p>
        </button>
      </div>
    </>
  )

  const renderExistingParentMode = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Link Existing Parent</h3>
        <p className="text-gray-600">
          Search and select a parent to link to {studentName}
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <SafeIcon
          icon={FiSearch}
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
      </div>

      {/* Parent list */}
      <div className="mb-6 max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-200">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full inline-block mr-2"></div>
            <span className="text-gray-600">Loading parents...</span>
          </div>
        ) : filteredParents.length > 0 ? (
          filteredParents.map(parent => (
            <div
              key={parent.id}
              className={`p-3 cursor-pointer transition-colors ${
                selectedParentId === parent.id ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedParentId(parent.id)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedParentId === parent.id
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedParentId === parent.id && <SafeIcon icon={FiCheck} className="text-xs" />}
                </div>
                <div>
                  <div className="font-medium text-gray-800">
                    {parent.first_name || ''} {parent.last_name || ''}
                  </div>
                  {parent.email && (
                    <div className="text-sm text-gray-600">
                      {parent.email}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No parents found matching your search' : 'No available parents found'}
          </div>
        )}
      </div>

      {/* Relationship details */}
      {selectedParentId && (
        <div className="border border-gray-200 rounded-xl p-4 mb-6 bg-gray-50">
          <h4 className="font-medium text-gray-800 mb-3">Relationship Details</h4>
          <div className="mb-4">
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
              id="emergency-contact"
              checked={isEmergencyContact}
              onChange={(e) => setIsEmergencyContact(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="emergency-contact" className="ml-2 block text-sm text-gray-700">
              Emergency Contact
            </label>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setMode('select')}
          className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleLinkExistingParent}
          disabled={!selectedParentId || loading || success}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Linking...' : success ? 'Linked!' : 'Link Parent'}
        </button>
      </div>
    </>
  )

  const renderNewParentMode = () => (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Create New Parent</h3>
        <p className="text-gray-600">
          Add a new parent/guardian for {studentName}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {/* First Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={newParentData.first_name}
            onChange={(e) => handleNewParentInputChange('first_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            placeholder="Enter first name"
            required
          />
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={newParentData.last_name}
            onChange={(e) => handleNewParentInputChange('last_name', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            placeholder="Enter last name"
            required
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={newParentData.email}
            onChange={(e) => handleNewParentInputChange('email', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            placeholder="parent@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={newParentData.phone_number}
            onChange={(e) => handleNewParentInputChange('phone_number', e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <textarea
            value={newParentData.address}
            onChange={(e) => handleNewParentInputChange('address', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            placeholder="Enter parent's address"
          />
        </div>
      </div>

      {/* Relationship details */}
      <div className="border border-gray-200 rounded-xl p-4 mb-6 bg-gray-50">
        <h4 className="font-medium text-gray-800 mb-3">Relationship Details</h4>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship to Student
          </label>
          <input
            type="text"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            placeholder="e.g., Mother, Father, Guardian"
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="emergency-contact-new"
            checked={isEmergencyContact}
            onChange={(e) => setIsEmergencyContact(e.target.checked)}
            className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label htmlFor="emergency-contact-new" className="ml-2 block text-sm text-gray-700">
            Emergency Contact
          </label>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => setMode('select')}
          className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleCreateNewParent}
          disabled={loading || success}
          className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : success ? 'Created!' : 'Create Parent'}
        </button>
      </div>
    </>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <SafeIcon icon={FiUserPlus} className="text-blue-600" />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2 flex-shrink-0" />
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
              <SafeIcon icon={FiCheck} className="text-green-500 mr-2 flex-shrink-0" />
              <p className="text-green-600 text-sm">
                Parent successfully {mode === 'new' ? 'created' : 'linked'}!
              </p>
            </div>
          </div>
        )}

        {/* Render appropriate content based on mode */}
        {mode === 'select' && renderSelectMode()}
        {mode === 'existing' && renderExistingParentMode()}
        {mode === 'new' && renderNewParentMode()}
      </div>
    </div>
  )
}

export default AddParentModal