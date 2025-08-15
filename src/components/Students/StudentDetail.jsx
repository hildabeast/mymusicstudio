import React, { useState, useEffect, useRef } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiEdit2, FiUser, FiCalendar, FiMail, FiPhone, FiMapPin, FiClock, FiStar, FiDollarSign, FiPlus, FiAlertCircle, FiArrowLeft, FiCheck, FiX, FiSave } from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import { format, subDays } from 'date-fns'
import ParentDetails from './ParentDetails'
import LessonTimeEditor from './LessonTimeEditor'

const StudentDetail = ({ studentId, onBack }) => {
  const { currentUserID, userIsAdmin } = useUser()
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  
  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    instrument: '',
    status: 'Current',
    date_of_birth: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    enrollment_date: ''
  })
  
  // Ref for first input field focus
  const firstNameInputRef = useRef(null)

  useEffect(() => {
    if (studentId && currentUserID) {
      fetchStudent()
      fetchStudentLessons()
      
      // Check URL for edit mode parameter
      const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '')
      const shouldEdit = urlParams.get('edit') === 'true'
      if (shouldEdit) {
        setEditMode(true)
      }
    }
  }, [studentId, currentUserID])
  
  // Focus first input when entering edit mode
  useEffect(() => {
    if (editMode && firstNameInputRef.current) {
      setTimeout(() => {
        firstNameInputRef.current.focus()
      }, 100)
    }
  }, [editMode])

  const fetchStudent = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .eq('teacher_id', currentUserID) // Security: only fetch students belonging to current teacher
        .single()

      if (studentError) {
        throw new Error(`Error fetching student: ${studentError.message}`)
      }

      setStudent(studentData)
      setFormData({
        first_name: studentData.first_name || '',
        last_name: studentData.last_name || '',
        instrument: studentData.instrument || '',
        status: studentData.status || 'Current',
        date_of_birth: studentData.date_of_birth || '',
        gender: studentData.gender || '',
        email: studentData.email || '',
        phone: studentData.phone || '',
        address: studentData.address || '',
        enrollment_date: studentData.enrollment_date || ''
      })
    } catch (error) {
      console.error('❌ Error fetching student:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentLessons = async () => {
    try {
      setLoadingLessons(true)
      // Calculate date from one week ago
      const oneWeekAgo = subDays(new Date(), 7).toISOString()
      // Fetch lessons for this student from one week ago and all future lessons
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .gte('scheduled_time', oneWeekAgo)
        .order('scheduled_time', { ascending: true })

      if (error) {
        throw new Error(`Error fetching student lessons: ${error.message}`)
      }

      setLessons(data || [])
    } catch (error) {
      console.error('❌ Error fetching student lessons:', error)
    } finally {
      setLoadingLessons(false)
    }
  }

  const handleEditStudent = () => {
    setEditMode(true)
  }
  
  const handleCancelEdit = () => {
    // Reset form data to original values
    if (student) {
      setFormData({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        instrument: student.instrument || '',
        status: student.status || 'Current',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        email: student.email || '',
        phone: student.phone || '',
        address: student.address || '',
        enrollment_date: student.enrollment_date || ''
      })
    }
    setEditMode(false)
    setSaveSuccess(false)
  }
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear success message when user makes changes
    if (saveSuccess) {
      setSaveSuccess(false)
    }
  }
  
  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Calculate full name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      
      // Prepare update data
      const updateData = {
        ...formData,
        name: fullName,
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .eq('teacher_id', currentUserID) // Security check
        .select()
        .single()
        
      if (error) {
        throw new Error(`Error saving student: ${error.message}`)
      }
      
      // Update local state
      setStudent(data)
      setSaveSuccess(true)
      
      // Exit edit mode after a short delay
      setTimeout(() => {
        setEditMode(false)
        setSaveSuccess(false)
      }, 1500)
    } catch (error) {
      console.error('❌ Error saving student:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      'scheduled': 'bg-blue-100 text-blue-800 border-blue-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'missed': 'bg-amber-100 text-amber-800 border-amber-200',
    }

    return statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return FiCheck
      case 'cancelled': return FiX
      case 'missed': return FiAlertCircle
      default: return FiCalendar
    }
  }

  // Format date for display
  const formatLessonDate = (dateString) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${format(date, 'h:mm a')}`
    }

    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow, ${format(date, 'h:mm a')}`
    }

    // Otherwise, return full date and time
    return format(date, 'EEE, MMM d, h:mm a')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <SafeIcon icon={FiAlertCircle} className="text-red-500 text-2xl mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Student</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button onClick={onBack} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors">
            Back to Students
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <SafeIcon icon={FiAlertCircle} className="text-amber-500 text-2xl mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-amber-800 mb-2">Student Not Found</h2>
          <p className="text-amber-700 mb-4">The requested student could not be found or you don't have access.</p>
          <button onClick={onBack} className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors">
            Back to Students
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with Student Name */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{student.name || 'Unnamed Student'}</h1>
          <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
            <SafeIcon icon={FiArrowLeft} className="text-sm" />
            <span className="text-sm font-medium">Return to Student List</span>
          </button>
        </div>
      </div>

      {/* Main Layout - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar - Student Context */}
        <div className="lg:col-span-1 space-y-6">
          {/* Lessons Section - Now with Real Data */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <SafeIcon icon={FiCalendar} className="text-teal-600 mr-2" />
                Lessons
              </h2>
              <button className="w-7 h-7 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center hover:bg-teal-200 transition-colors">
                <SafeIcon icon={FiPlus} className="text-sm" />
              </button>
            </div>

            {loadingLessons ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((index) => (
                  <div key={index} className="h-12 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            ) : lessons.length > 0 ? (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-sm"
                  >
                    <div className="flex items-start flex-col">
                      <span className="font-medium text-gray-800">
                        {formatLessonDate(lesson.scheduled_time)}
                      </span>
                      {lesson.duration_min && (
                        <span className="text-xs text-gray-500">
                          {lesson.duration_min} minutes
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(lesson.status)}`}>
                      <SafeIcon icon={getStatusIcon(lesson.status)} className="text-xs" />
                      <span className="capitalize">{lesson.status || 'Scheduled'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No upcoming lessons</div>
            )}
          </div>

          {/* Performances Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <SafeIcon icon={FiStar} className="text-amber-500 mr-2" />
                Upcoming Performances
              </h2>
              <button className="w-7 h-7 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center hover:bg-amber-200 transition-colors">
                <SafeIcon icon={FiPlus} className="text-sm" />
              </button>
            </div>
            <div className="text-center py-4 text-gray-500">No upcoming performances</div>
          </div>
        </div>

        {/* Right Content - Stacked Sections */}
        <div className="lg:col-span-3 space-y-6">
          {/* Student Details Section - Now with Edit Functionality */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <SafeIcon icon={FiUser} className="text-teal-600 mr-2" />
                Student Details
              </h2>
              
              {/* Edit/Save Buttons */}
              {userIsAdmin && !editMode && (
                <button 
                  onClick={handleEditStudent}
                  className="flex items-center space-x-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-xl hover:bg-teal-200 transition-colors"
                >
                  <SafeIcon icon={FiEdit2} />
                  <span>Edit details</span>
                </button>
              )}
              
              {userIsAdmin && editMode && (
                <div className="flex items-center space-x-3">
                  {saveSuccess && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <SafeIcon icon={FiCheck} />
                      <span>Saved!</span>
                    </div>
                  )}
                  <button 
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <SafeIcon icon={FiSave} />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {editMode ? (
              // Edit Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={firstNameInputRef}
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  
                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                  
                  {/* Instrument */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instrument <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.instrument}
                      onChange={(e) => handleInputChange('instrument', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      placeholder="e.g., Piano, Guitar, Violin"
                      required
                    />
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    >
                      <option value="Current">Current</option>
                      <option value="Paused">Paused</option>
                      <option value="Discontinued">Discontinued</option>
                    </select>
                  </div>
                  
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <SafeIcon icon={FiMail} className="text-gray-400 mr-1" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      placeholder="student@example.com"
                    />
                  </div>
                  
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <SafeIcon icon={FiPhone} className="text-gray-400 mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  {/* Enrollment Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <SafeIcon icon={FiCalendar} className="text-gray-400 mr-1" />
                      Enrollment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.enrollment_date}
                      onChange={(e) => handleInputChange('enrollment_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <SafeIcon icon={FiMapPin} className="text-gray-400 mr-1" />
                      Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
                      placeholder="Enter student's address"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Name (first & last) */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                    <p className="text-gray-800 font-medium">{student.name || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Instrument</h3>
                    <p className="text-gray-800 font-medium capitalize">{student.instrument}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${student.status === 'Current' ? 'bg-green-100 text-green-800' : student.status === 'Paused' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                      {student.status}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
                    <p className="text-gray-800">
                      {student.date_of_birth ? format(new Date(student.date_of_birth), 'MMMM d, yyyy') : 'Not provided'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Gender</h3>
                    <p className="text-gray-800">{student.gender || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <SafeIcon icon={FiMail} className="text-gray-400 mr-1" />
                      Email Address
                    </h3>
                    <p className="text-gray-800">{student.email || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <SafeIcon icon={FiPhone} className="text-gray-400 mr-1" />
                      Phone Number
                    </h3>
                    <p className="text-gray-800">{student.phone || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <SafeIcon icon={FiMapPin} className="text-gray-400 mr-1" />
                      Address
                    </h3>
                    <p className="text-gray-800 whitespace-pre-line">{student.address || 'Not provided'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <SafeIcon icon={FiClock} className="text-gray-400 mr-1" />
                      Enrollment Date
                    </h3>
                    <p className="text-gray-800">
                      {student.enrollment_date ? format(new Date(student.enrollment_date), 'MMMM d, yyyy') : format(new Date(student.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lesson Time Editor */}
          <LessonTimeEditor studentId={studentId} studentName={student.name} />

          {/* Parent Details Section */}
          <ParentDetails studentId={studentId} studentName={student.name} />

          {/* Billing Section (Placeholder) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <SafeIcon icon={FiDollarSign} className="text-green-600 mr-2" />
                Billing
              </h2>
            </div>
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <p className="text-gray-500">Billing information and payment history will be displayed here.</p>
              <p className="text-gray-400 text-sm mt-2">Feature coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDetail