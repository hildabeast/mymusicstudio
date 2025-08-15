import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiUser, FiMusic, FiClock, FiCalendar, FiSave, FiEdit2 } from 'react-icons/fi'

const StudentTimetableList = ({ 
  students, 
  timeSlots, 
  daysOfWeek, 
  onStudentUpdate, 
  userIsAdmin,
  formatTimeSlot 
}) => {
  const [editingStudent, setEditingStudent] = useState(null)
  const [saving, setSaving] = useState(null)

  const handleEdit = (studentId) => {
    if (!userIsAdmin) return
    setEditingStudent(studentId)
  }

  const handleSave = async (student, field, value) => {
    if (!userIsAdmin) return

    try {
      setSaving(student.id)
      await onStudentUpdate(student.id, field, value)
      setEditingStudent(null)
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(null)
    }
  }

  const handleCancel = () => {
    setEditingStudent(null)
  }

  const getCompletionStatus = (student) => {
    const hasDay = !!student.lesson_day
    const hasTime = !!student.lesson_time
    const hasDuration = !!student.lesson_duration
    
    if (hasDay && hasTime && hasDuration) return 'complete'
    if (hasDay || hasTime || hasDuration) return 'partial'
    return 'empty'
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'complete':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Complete</span>
      case 'partial':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Partial</span>
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">Not Set</span>
    }
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <SafeIcon icon={FiUser} className="text-gray-300 text-3xl mb-4 mx-auto" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">No Students Found</h3>
        <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <SafeIcon icon={FiUser} className="text-teal-600 mr-2" />
          Student Schedule ({students.length})
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          {userIsAdmin ? 'Click to edit lesson day, time, and duration' : 'View student schedule information'}
        </p>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {students.map((student) => {
          const isEditing = editingStudent === student.id
          const isSaving = saving === student.id
          const completionStatus = getCompletionStatus(student)

          return (
            <div key={student.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Student Info */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {student.name ? student.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold text-gray-800">{student.name || 'Unnamed Student'}</h3>
                      {getStatusBadge(completionStatus)}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                      <SafeIcon icon={FiMusic} className="text-gray-400" />
                      <span className="capitalize">{student.instrument || 'No instrument'}</span>
                    </div>

                    {/* Schedule Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Lesson Day */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Lesson Day</label>
                        {isEditing && userIsAdmin ? (
                          <select
                            defaultValue={student.lesson_day || ''}
                            onChange={(e) => handleSave(student, 'lesson_day', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                            disabled={isSaving}
                          >
                            <option value="">Select day</option>
                            {daysOfWeek.map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiCalendar} className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-800">{student.lesson_day || 'Not set'}</span>
                          </div>
                        )}
                      </div>

                      {/* Lesson Time */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Lesson Time</label>
                        {isEditing && userIsAdmin ? (
                          <select
                            defaultValue={student.lesson_time || ''}
                            onChange={(e) => handleSave(student, 'lesson_time', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                            disabled={isSaving}
                          >
                            <option value="">Select time</option>
                            {timeSlots.map(time => (
                              <option key={time} value={time}>{formatTimeSlot(time)}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiClock} className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-800">{formatTimeSlot(student.lesson_time)}</span>
                          </div>
                        )}
                      </div>

                      {/* Lesson Duration */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
                        {isEditing && userIsAdmin ? (
                          <select
                            defaultValue={student.lesson_duration || ''}
                            onChange={(e) => handleSave(student, 'lesson_duration', parseInt(e.target.value))}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
                            disabled={isSaving}
                          >
                            <option value="">Select duration</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                            <option value="90">90 minutes</option>
                          </select>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <SafeIcon icon={FiClock} className="text-gray-400 text-sm" />
                            <span className="text-sm text-gray-800">
                              {student.lesson_duration ? `${student.lesson_duration} min` : 'Not set'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {userIsAdmin && (
                  <div className="flex items-center space-x-2 ml-4">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        {isSaving ? (
                          <div className="flex items-center space-x-2 text-teal-600">
                            <SafeIcon icon={FiSave} className="animate-pulse" />
                            <span className="text-sm">Saving...</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleCancel}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(student.id)}
                        className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Edit schedule"
                      >
                        <SafeIcon icon={FiEdit2} className="text-sm" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StudentTimetableList