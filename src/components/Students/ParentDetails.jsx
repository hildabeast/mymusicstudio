import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiUser, FiPlus, FiMail, FiPhone, FiMapPin, FiEdit2, FiTrash2, FiAlertCircle, FiHeart, FiUserPlus, FiMessageSquare, FiLink } from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import AddParentModal from './AddParentModal'
import EditParentLinkModal from './EditParentLinkModal'
import InviteParentModal from './InviteParentModal'
import ConfirmModal from '../common/ConfirmModal'

const ParentDetails = ({ studentId, studentName }) => {
  const { userIsAdmin } = useUser()
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedParentLink, setSelectedParentLink] = useState(null)
  const [selectedParent, setSelectedParent] = useState(null)

  useEffect(() => {
    if (studentId) {
      fetchParents()
    }
  }, [studentId])

  const fetchParents = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📚 Fetching parents for student:', studentId)

      // Use the correct table name without suffix
      const { data, error } = await supabase
        .from('parent_links')
        .select(`
          id,
          relationship,
          emergency_contact,
          parent:parent_id (
            id,
            first_name,
            last_name,
            email,
            phone_number,
            address,
            notes,
            user_id
          )
        `)
        .eq('student_id', studentId)
        .order('emergency_contact', { ascending: false })

      if (error) {
        console.error('❌ Database error fetching parents:', error)
        throw new Error(`Failed to load parent information: ${error.message}`)
      }

      console.log('📚 Fetched parents:', data)
      setParents(data || [])
    } catch (error) {
      console.error('❌ Error fetching parents:', error)
      setError(error.message || 'Failed to load parent information')
    } finally {
      setLoading(false)
    }
  }

  const handleAddParent = () => {
    if (!userIsAdmin) return
    setShowAddModal(true)
  }

  const handleEditParentLink = (parentLink) => {
    setSelectedParentLink(parentLink)
    setShowEditModal(true)
  }

  const handleDeleteParentLink = (parentLink) => {
    setSelectedParentLink(parentLink)
    setShowDeleteModal(true)
  }

  const handleInviteParent = (parent) => {
    setSelectedParent(parent)
    setShowInviteModal(true)
  }

  const confirmDeleteParentLink = async () => {
    if (!selectedParentLink) return
    try {
      setLoading(true)
      // Use correct table name without suffix
      const { error } = await supabase
        .from('parent_links')
        .delete()
        .eq('id', selectedParentLink.id)

      if (error) {
        console.error('❌ Error deleting parent link:', error)
        throw new Error(`Failed to remove parent connection: ${error.message}`)
      }

      setParents(parents.filter(p => p.id !== selectedParentLink.id))
      setShowDeleteModal(false)
      setSelectedParentLink(null)
    } catch (error) {
      console.error('❌ Error deleting parent link:', error)
      setError(error.message || 'Failed to remove parent connection')
    } finally {
      setLoading(false)
    }
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteModal(false)
    setShowInviteModal(false)
    setSelectedParentLink(null)
    setSelectedParent(null)
    fetchParents() // Refresh the list after modal actions
  }

  const handleInviteSuccess = (inviteData) => {
    console.log('Invitation created successfully:', inviteData);
    // You could show a success message or handle this in any way needed
  }

  if (loading && parents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <SafeIcon icon={FiUser} className="text-blue-600 mr-2" />
            Parent/Guardian Details
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded-lg w-full"></div>
          <div className="h-24 bg-gray-200 rounded-lg w-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <SafeIcon icon={FiUser} className="text-blue-600 mr-2" />
          Parent/Guardian Details
        </h2>
        {userIsAdmin && (
          <button
            onClick={handleAddParent}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors"
          >
            <SafeIcon icon={FiPlus} />
            <span>Add Parent</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
            <div>
              <p className="text-red-600 text-sm font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {parents.length > 0 ? (
        <div className="space-y-4">
          {parents.map((parentLink) => {
            // Safely access parent data
            const parent = parentLink.parent
            if (!parent) {
              console.warn('⚠️ Parent data missing for link:', parentLink.id)
              return null
            }

            return (
              <div
                key={parentLink.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mt-1">
                      <span className="text-white font-medium text-sm">
                        {parent.first_name && parent.last_name
                          ? `${parent.first_name[0]}${parent.last_name[0]}`
                          : '??'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-800">
                          {parent.first_name && parent.last_name
                            ? `${parent.first_name} ${parent.last_name}`
                            : 'Unnamed Parent'}
                        </h3>
                        {parentLink.emergency_contact && (
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full flex items-center">
                            <SafeIcon icon={FiHeart} className="mr-1 text-xs" />
                            Emergency Contact
                          </span>
                        )}
                        {parent.user_id && (
                          <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full flex items-center">
                            <SafeIcon icon={FiLink} className="mr-1 text-xs" />
                            Portal Access
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {parentLink.relationship || 'Relationship not specified'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {userIsAdmin && !parent.user_id && (
                      <button
                        onClick={() => handleInviteParent(parent)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        aria-label="Invite parent to portal"
                        title="Invite to Portal"
                      >
                        <SafeIcon icon={FiUserPlus} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditParentLink(parentLink)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      aria-label="Edit parent"
                    >
                      <SafeIcon icon={FiEdit2} />
                    </button>
                    {userIsAdmin && (
                      <button
                        onClick={() => handleDeleteParentLink(parentLink)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Remove parent"
                      >
                        <SafeIcon icon={FiTrash2} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {parent.email && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <SafeIcon icon={FiMail} className="text-gray-400" />
                      <span>{parent.email}</span>
                    </div>
                  )}

                  {parent.phone_number && (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <SafeIcon icon={FiPhone} className="text-gray-400" />
                      <span>{parent.phone_number}</span>
                    </div>
                  )}

                  {parent.address && (
                    <div className="flex items-start space-x-2 text-gray-600 col-span-2">
                      <SafeIcon icon={FiMapPin} className="text-gray-400 mt-0.5" />
                      <span className="whitespace-pre-line">{parent.address}</span>
                    </div>
                  )}

                  {/* Display parent notes */}
                  {parent.notes && (
                    <div className="flex items-start space-x-2 text-gray-600 col-span-2 mt-2 border-t border-gray-100 pt-2">
                      <SafeIcon icon={FiMessageSquare} className="text-gray-400 mt-0.5" />
                      <span className="whitespace-pre-line">{parent.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiUserPlus} className="text-blue-500 text-xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Parents Added Yet</h3>
          <p className="text-gray-500 mb-4">
            Add parent/guardian information to keep track of emergency contacts and improve communication.
          </p>
          {userIsAdmin && (
            <button
              onClick={handleAddParent}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors inline-flex items-center space-x-2"
            >
              <SafeIcon icon={FiPlus} />
              <span>Add First Parent</span>
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddParentModal
          studentId={studentId}
          studentName={studentName}
          onClose={handleModalClose}
        />
      )}

      {showEditModal && selectedParentLink && (
        <EditParentLinkModal
          parentLink={selectedParentLink}
          studentName={studentName}
          onClose={handleModalClose}
        />
      )}

      {showInviteModal && selectedParent && (
        <InviteParentModal
          parent={selectedParent}
          onClose={handleModalClose}
          onSuccess={handleInviteSuccess}
        />
      )}

      {showDeleteModal && selectedParentLink && (
        <ConfirmModal
          title="Remove Parent Connection"
          message={`Are you sure you want to remove ${
            selectedParentLink.parent?.first_name || 'this parent'
          } ${
            selectedParentLink.parent?.last_name || ''
          } as a parent/guardian of ${studentName}? This will only remove the connection, not delete the parent record.`}
          confirmText="Remove Connection"
          cancelText="Cancel"
          confirmButtonClass="bg-red-500 hover:bg-red-600"
          onConfirm={confirmDeleteParentLink}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  )
}

export default ParentDetails