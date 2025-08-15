import React,{useState,useEffect} from 'react'
import SafeIcon from '../../common/SafeIcon'
import {FiArrowLeft,FiSave,FiUser,FiMail,FiPhone,FiMapPin,FiCalendar,FiMusic,FiCheck,FiAlertCircle} from 'react-icons/fi'
import {supabase} from '../../config/supabase'
import {useUser} from '../../contexts/UserContext'

const StudentEditor=({studentId,onBack})=> {
  const {currentUserID,currentSchoolID,userIsAdmin}=useUser()
  const [student,setStudent]=useState(null)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState(null)
  const [saveStatus,setSaveStatus]=useState(null) // 'success','error',null
  const [originContext,setOriginContext]=useState('list') // 'list' or 'detail'
  const [formData,setFormData]=useState({
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

  useEffect(()=> {
    // Check if we came from student detail page by parsing URL parameters properly
    const currentHash = window.location.hash
    const urlParams = new URLSearchParams(currentHash.split('?')[1] || '')
    const fromParam = urlParams.get('from')
    
    console.log('🔧 StudentEditor: Parsing URL parameters', {
      currentHash,
      urlParams: urlParams.toString(),
      fromParam
    })
    
    if (fromParam === 'detail') {
      setOriginContext('detail')
      console.log('🔧 StudentEditor: Origin context set to detail')
    } else {
      setOriginContext('list')
      console.log('🔧 StudentEditor: Origin context set to list')
    }

    if (studentId && currentUserID) {
      console.log('🔧 StudentEditor: Fetching student data', { studentId, currentUserID })
      fetchStudent()
    }
  },[studentId,currentUserID])

  const fetchStudent=async ()=> {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔧 StudentEditor: Making database query for student:', studentId)
      
      const {data: studentData,error: studentError}=await supabase
        .from('students')
        .select('*')
        .eq('id',studentId)
        .eq('teacher_id',currentUserID) // Security: only fetch students belonging to current teacher
        .single()
        
      if (studentError) {
        console.error('🔧 StudentEditor: Database error:', studentError)
        throw new Error(`Error fetching student: ${studentError.message}`)
      }
      
      console.log('🔧 StudentEditor: Student data fetched successfully:', studentData)
      
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
      console.error('❌ Error fetching student:',error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange=(field,value)=> {
    setFormData(prev=> ({...prev,[field]: value}))
    // Clear save status when user makes changes
    if (saveStatus) {
      setSaveStatus(null)
    }
  }

  const handleNameBlur=()=> {
    // Auto-update the name field when first_name or last_name changes
    const fullName=`${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
    console.log('🔄 Auto-updating name field:',fullName)
    // This will be saved when the user clicks Save
  }

  const validateForm=()=> {
    const errors=[]
    
    if (!formData.first_name.trim()) {
      errors.push('First name is required')
    }
    if (!formData.last_name.trim()) {
      errors.push('Last name is required')
    }
    if (!formData.instrument.trim()) {
      errors.push('Instrument is required')
    }
    if (formData.email && !formData.email.includes('@')) {
      errors.push('Please enter a valid email address')
    }
    if (!formData.enrollment_date) {
      errors.push('Enrollment date is required')
    }
    
    return errors
  }

  const handleSave=async ()=> {
    try {
      setSaving(true)
      setError(null)
      setSaveStatus(null)
      
      // Validate form
      const validationErrors=validateForm()
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }
      
      // Calculate full name
      const fullName=`${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()
      
      // Prepare update data
      const updateData={
        ...formData,
        name: fullName, // Auto-calculated name field
        updated_at: new Date().toISOString()
      }
      
      console.log('💾 Saving student data:',updateData)
      
      const {data,error: updateError}=await supabase
        .from('students')
        .update(updateData)
        .eq('id',studentId)
        .eq('teacher_id',currentUserID) // Security: only update students belonging to current teacher
        .select()
        .single()
        
      if (updateError) {
        throw new Error(`Error saving student: ${updateError.message}`)
      }
      
      console.log('✅ Student saved successfully:',data)
      setStudent(data)
      setSaveStatus('success')
      
      // Auto-redirect after 2 seconds
      setTimeout(()=> {
        handleBackNavigation()
      },2000)
      
    } catch (error) {
      console.error('❌ Error saving student:',error)
      setError(error.message)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  const handleBackNavigation=()=> {
    console.log('🔧 StudentEditor: Navigating back, origin context:', originContext)
    
    if (originContext==='detail') {
      // Return to student detail view
      console.log('🔧 StudentEditor: Returning to student detail view')
      window.location.hash=`#view-student-${studentId}`
    } else {
      // Return to student list
      console.log('🔧 StudentEditor: Returning to student list')
      onBack()
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2,3,4,5,6].map(i=> (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !student) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <SafeIcon icon={FiAlertCircle} className="text-red-500 text-2xl mb-4 mx-auto" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Student</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="text-sm text-gray-600 mb-4">
            <div><strong>Student ID:</strong> {studentId}</div>
            <div><strong>Origin Context:</strong> {originContext}</div>
          </div>
          <button 
            onClick={handleBackNavigation} 
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
          >
            {originContext==='detail' ? 'Back to Student' : 'Back to Students'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleBackNavigation} 
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} />
            <span>{originContext==='detail' ? 'Back to Student' : 'Back to Students'}</span>
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {student?.name || 'Edit Student'}
            </h1>
            <p className="text-gray-600">Update student information and settings</p>
          </div>
        </div>

        {/* Save Status Indicator */}
        {saveStatus==='success' && (
          <div className="flex items-center space-x-2 text-green-600">
            <SafeIcon icon={FiCheck} />
            <span className="font-medium">Saved! Redirecting...</span>
          </div>
        )}
      </div>

      {/* Error Message */}
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

      {/* Student Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <SafeIcon icon={FiUser} className="text-teal-600" />
              <span>Basic Information</span>
            </h2>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e)=> handleInputChange('first_name',e.target.value)}
                onBlur={handleNameBlur}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
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
                value={formData.last_name}
                onChange={(e)=> handleInputChange('last_name',e.target.value)}
                onBlur={handleNameBlur}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Full Name Display (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name (Auto-generated)
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600">
                {`${formData.first_name.trim()} ${formData.last_name.trim()}`.trim() || 'Enter first and last name above'}
              </div>
            </div>

            {/* Instrument */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrument *
              </label>
              <input
                type="text"
                value={formData.instrument}
                onChange={(e)=> handleInputChange('instrument',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="e.g., Piano, Guitar, Violin"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e)=> handleInputChange('status',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              >
                <option value="Current">Current</option>
                <option value="Paused">Paused</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          {/* Personal Details */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <SafeIcon icon={FiCalendar} className="text-teal-600" />
              <span>Personal Details</span>
            </h2>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e)=> handleInputChange('date_of_birth',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e)=> handleInputChange('gender',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e)=> handleInputChange('email',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="student@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e)=> handleInputChange('phone',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Enrollment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrollment Date *
              </label>
              <input
                type="date"
                value={formData.enrollment_date}
                onChange={(e)=> handleInputChange('enrollment_date',e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Address - Full Width */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e)=> handleInputChange('address',e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            placeholder="Enter student's address"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
          <button 
            onClick={handleBackNavigation} 
            className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSave} 
            disabled={saving || saveStatus==='success'}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SafeIcon icon={FiSave} />
            <span>
              {saving ? 'Saving...' : saveStatus==='success' ? 'Saved!' : 'Save Student'}
            </span>
          </button>
        </div>
      </div>

      {/* Required Fields Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-2">
          <SafeIcon icon={FiAlertCircle} className="text-blue-500 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Required Fields</p>
            <p>Fields marked with * are required. The full name will be automatically generated from the first and last name fields.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentEditor