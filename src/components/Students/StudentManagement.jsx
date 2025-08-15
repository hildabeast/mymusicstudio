import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiSearch, FiFilter, FiUser, FiMusic, FiUsers, FiAlertCircle, FiPlus, FiMail, FiCheck, FiX, FiChevronDown } from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import { format } from 'date-fns'

const StudentManagement = () => {
  const { currentUserID, currentSchoolID, userIsAdmin } = useUser()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [error, setError] = useState(null)
  const [creatingStudent, setCreatingStudent] = useState(false)
  
  // Selection state
  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailTarget, setEmailTarget] = useState('') // 'students', 'parents', or 'both'
  const [missingEmails, setMissingEmails] = useState([])

  // Status dropdown reference
  const statusDropdownRef = React.useRef(null)

  useEffect(() => {
    if (currentUserID) {
      console.log('📚 StudentManagement: currentUserID available, fetching students:', currentUserID)
      fetchStudents()
    } else {
      console.log('⚠️ StudentManagement: No currentUserID, cannot fetch students')
      setError('No user record found for this authenticated user. Please contact support.')
      setLoading(false)
    }
  }, [currentUserID])

  useEffect(() => {
    filterAndSortStudents()
  }, [students, searchTerm, statusFilter, sortBy, sortOrder])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📚 Fetching students for teacher:', currentUserID)

      // Fetch students using the correct teacher_id from context - include lesson scheduling fields
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, first_name, last_name, instrument, status, created_at, teacher_id, enrollment_date, lesson_day, lesson_time, email')
        .eq('teacher_id', currentUserID)
        .order('name')

      console.log('📚 Students query result:', {
        studentsData,
        studentsError,
        studentCount: studentsData?.length || 0
      })

      if (studentsError) {
        throw new Error(`Database error fetching students: ${studentsError.message}`)
      }

      setStudents(studentsData || [])
      setSelectedStudents([])
      setSelectAll(false)
    } catch (error) {
      console.error('❌ Error fetching students:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createNewStudent = async () => {
    if (!userIsAdmin) {
      console.warn('⚠️ Non-admin user attempted to create student')
      return
    }

    try {
      setCreatingStudent(true)
      console.log('➕ Creating new student for teacher:', currentUserID, 'school:', currentSchoolID)

      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert({
          teacher_id: currentUserID,
          school_id: currentSchoolID,
          status: 'Current',
          first_name: '',
          last_name: '',
          name: '',
          instrument: '',
          enrollment_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Error creating student: ${createError.message}`)
      }

      console.log('✅ New student created:', newStudent)
      
      // Navigate to student details view in edit mode
      window.location.hash = `#view-student-${newStudent.id}?edit=true`
    } catch (error) {
      console.error('❌ Error creating student:', error)
      setError(error.message)
    } finally {
      setCreatingStudent(false)
    }
  }

  const filterAndSortStudents = () => {
    let filtered = [...students]

    // Apply search filter - include lesson_day and lesson_time in search
    if (searchTerm) {
      filtered = filtered.filter(student => 
        (student.name && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.instrument && student.instrument.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.lesson_day && student.lesson_day.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.lesson_time && student.lesson_time.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(student => student.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy]
      let bValue = b[sortBy]
      
      // Handle null or undefined values to prevent errors
      if (sortBy === 'lesson_day' || sortBy === 'lesson_time') {
        aValue = aValue || '';
        bValue = bValue || '';
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue || '').toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredStudents(filtered)
    
    // Reset selection when filters change
    setSelectedStudents([])
    setSelectAll(false)
  }

  const handleSort = (field) => {
    // Special handling for date and time columns - combine them
    if (field === 'date' || field === 'time') {
      field = 'scheduled_time'
    }
    
    let direction = 'asc'
    if (sortBy === field && sortOrder === 'asc') {
      direction = 'desc'
    }
    
    setSortBy(field)
    setSortOrder(direction)
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      'Current': 'bg-green-100 text-green-800 border-green-200',
      'Paused': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Discontinued': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles['Current']}`}>
        {status}
      </span>
    )
  }

  const getSortIcon = (field) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const handleViewStudent = (studentId) => {
    window.location.hash = `#view-student-${studentId}`
  }

  const retryFetch = () => {
    fetchStudents()
  }

  // Format lesson time for display - clean user-friendly format
  const formatLessonTime = (timeString) => {
    if (!timeString) return 'Not set'
    
    // If it's already in a clean format (like "4:00 PM"), return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString
    }
    
    // If it's in 24-hour format (like "16:00"), convert to 12-hour
    if (timeString.includes(':') && !timeString.includes(' ')) {
      try {
        const [hours, minutes] = timeString.split(':')
        const hour = parseInt(hours)
        const minute = parseInt(minutes)
        
        if (hour === 0) {
          return `12:${minutes.padStart(2, '0')} AM`
        } else if (hour < 12) {
          return `${hour}:${minutes.padStart(2, '0')} AM`
        } else if (hour === 12) {
          return `12:${minutes.padStart(2, '0')} PM`
        } else {
          return `${hour - 12}:${minutes.padStart(2, '0')} PM`
        }
      } catch (e) {
        return timeString
      }
    }
    
    return timeString
  }

  // Handle checkbox selection
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectStudent = (e, studentId) => {
    e.stopPropagation() // Prevent row click from triggering
    
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId))
      setSelectAll(false)
    } else {
      setSelectedStudents([...selectedStudents, studentId])
      
      // Check if all filtered students are now selected
      if (selectedStudents.length + 1 === filteredStudents.length) {
        setSelectAll(true)
      }
    }
  }

  const clearSelection = () => {
    setSelectedStudents([])
    setSelectAll(false)
  }

  // Handle status dropdown
  const handleSelectStatus = (status) => {
    setStatusFilter(status)
    setShowStatusDropdown(false)
  }

  // Handle email actions
  const handleEmailAction = async (target) => {
    // target is 'students', 'parents', or 'both'
    setEmailTarget(target)
    
    // Check for missing emails
    const missing = []
    const selectedStudentRecords = students.filter(student => selectedStudents.includes(student.id))
    
    if (target === 'students' || target === 'both') {
      // Check for students without emails
      const studentsWithoutEmail = selectedStudentRecords.filter(student => !student.email)
      if (studentsWithoutEmail.length > 0) {
        missing.push(
          ...studentsWithoutEmail.map(student => ({
            type: 'student',
            name: student.name,
            id: student.id
          }))
        )
      }
    }
    
    if (target === 'parents' || target === 'both') {
      // We need to fetch parent info for the selected students
      try {
        const { data: parentLinks, error: parentLinksError } = await supabase
          .from('parent_links')
          .select(`
            parent:parent_id (
              id, 
              first_name,
              last_name,
              email
            ),
            student_id
          `)
          .in('student_id', selectedStudents)
        
        if (parentLinksError) throw parentLinksError
        
        // Check for parents without emails
        const parentsWithoutEmail = parentLinks.filter(
          link => !link.parent?.email && selectedStudents.includes(link.student_id)
        )
        
        if (parentsWithoutEmail.length > 0) {
          // Get student names for these parents
          for (const link of parentsWithoutEmail) {
            const student = students.find(s => s.id === link.student_id)
            missing.push({
              type: 'parent',
              name: `${link.parent?.first_name || ''} ${link.parent?.last_name || ''}`.trim() || 'Unnamed Parent',
              studentName: student?.name || 'Unknown Student',
              id: link.parent?.id
            })
          }
        }
        
        // If there are missing emails, show the modal
        if (missing.length > 0) {
          setMissingEmails(missing)
          setShowEmailModal(true)
          return
        }
        
        // If no missing emails, proceed with creating mailto link
        await createMailtoLink(target, parentLinks)
      } catch (error) {
        console.error('Error checking for parent emails:', error)
        setError('Failed to check parent email addresses. Please try again.')
      }
    } else {
      // If only targeting students and there are missing emails, show modal
      if (missing.length > 0) {
        setMissingEmails(missing)
        setShowEmailModal(true)
        return
      }
      
      // If no missing student emails, proceed with creating mailto link
      await createMailtoLink(target)
    }
  }

  const createMailtoLink = async (target, parentLinks = []) => {
    const selectedStudentRecords = students.filter(student => selectedStudents.includes(student.id))
    
    let emails = []
    
    if (target === 'students' || target === 'both') {
      // Add student emails
      emails = [...emails, ...selectedStudentRecords.filter(s => s.email).map(s => s.email)]
    }
    
    if (target === 'parents' || target === 'both') {
      // Add parent emails (already filtered for non-null emails)
      const parentEmails = parentLinks
        .filter(link => link.parent?.email)
        .map(link => link.parent.email)
      
      emails = [...emails, ...parentEmails]
    }
    
    // Remove duplicates
    emails = [...new Set(emails)]
    
    // Create and open mailto link
    if (emails.length > 0) {
      const mailtoLink = `mailto:?bcc=${emails.join(',')}`
      window.open(mailtoLink)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="flex space-x-4">
              <div className="h-10 bg-gray-200 rounded w-64"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800">Error Loading Students</h3>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <div className="mt-3 space-y-2 text-sm text-red-700">
            <div><strong>Current User ID:</strong> {currentUserID || 'Not available'}</div>
          </div>
          <button
            onClick={retryFetch}
            className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Students</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-600">{filteredStudents.length}</p>
            <p className="text-sm text-gray-500">Total Students</p>
          </div>
          {/* Admin-only New Student Button */}
          {userIsAdmin && (
            <button
              onClick={createNewStudent}
              disabled={creatingStudent}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <SafeIcon icon={FiPlus} className="text-lg" />
              <span className="font-medium">
                {creatingStudent ? 'Creating...' : 'New Student'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Selection Actions Bar */}
      {selectedStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="text-blue-600" />
            <span className="text-blue-800 font-medium">
              {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleEmailAction('students')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm flex items-center space-x-2"
            >
              <SafeIcon icon={FiMail} />
              <span>Email Students</span>
            </button>
            <button
              onClick={() => handleEmailAction('parents')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm flex items-center space-x-2"
            >
              <SafeIcon icon={FiMail} />
              <span>Email Parents</span>
            </button>
            <button
              onClick={() => handleEmailAction('both')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm flex items-center space-x-2"
            >
              <SafeIcon icon={FiMail} />
              <span>Email Both</span>
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, instrument, day, or time..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Status Filter - Custom Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button 
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center justify-between w-full px-4 py-2 text-left border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center">
                <SafeIcon icon={FiFilter} className="text-gray-400 mr-2" />
                <span>{statusFilter === 'All' ? 'All Status' : statusFilter}</span>
              </div>
              <SafeIcon icon={FiChevronDown} className={`text-gray-400 transition-transform duration-200 ${showStatusDropdown ? 'transform rotate-180' : ''}`} />
            </button>
            
            {showStatusDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                {['All', 'Current', 'Paused', 'Discontinued'].map((status) => (
                  <div 
                    key={status}
                    onClick={() => handleSelectStatus(status)}
                    className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex-1">{status}</div>
                    {status === statusFilter && (
                      <SafeIcon icon={FiCheck} className="text-teal-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || statusFilter !== 'All') && (
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchTerm && (
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-lg text-sm">
                Search: "{searchTerm}"
              </span>
            )}
            {statusFilter !== 'All' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">
                Status: {statusFilter}
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('All')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {/* Checkbox column */}
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiUser} className="text-gray-400" />
                      <span>Student Name</span>
                      <span className="text-xs">{getSortIcon('name')}</span>
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('instrument')}
                  >
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiMusic} className="text-gray-400" />
                      <span>Instrument</span>
                      <span className="text-xs">{getSortIcon('instrument')}</span>
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('lesson_day')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Lesson Day</span>
                      <span className="text-xs">{getSortIcon('lesson_day')}</span>
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('lesson_time')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Lesson Time</span>
                      <span className="text-xs">{getSortIcon('lesson_time')}</span>
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      <span className="text-xs">{getSortIcon('status')}</span>
                    </div>
                  </th>
                  <th
                    className="text-left px-6 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('enrollment_date')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Enrolled</span>
                      <span className="text-xs">{getSortIcon('enrollment_date')}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer h-14 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    } ${selectedStudents.includes(student.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => handleViewStudent(student.id)}
                  >
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => handleSelectStudent(e, student.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {student.name
                              ? student.name.split(' ').map(n => n[0]).join('').toUpperCase()
                              : '?'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {student.name || 'Unnamed Student'}
                          </div>
                          {!student.name && (
                            <div className="text-xs text-amber-600">
                              Click to complete profile
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <span className="font-medium text-gray-800 capitalize">
                        {student.instrument || 'Not set'}
                      </span>
                    </td>
                    <td className="px-6 py-2">
                      <div className="text-sm text-gray-800">
                        {student.lesson_day || 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      <div className="text-sm text-gray-800 font-medium">
                        {formatLessonTime(student.lesson_time)}
                      </div>
                    </td>
                    <td className="px-6 py-2">
                      {getStatusBadge(student.status)}
                    </td>
                    <td className="px-6 py-2">
                      <div className="text-sm text-gray-600">
                        {student.enrollment_date
                          ? format(new Date(student.enrollment_date), 'MMM d, yyyy')
                          : format(new Date(student.created_at), 'MMM d, yyyy')}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Empty State
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiUsers} className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No students found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'All'
                ? "No students match your current search or filter criteria."
                : "You haven't added any students yet."}
            </p>
            {(searchTerm || statusFilter !== 'All') ? (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('All')
                }}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
              >
                Clear Filters
              </button>
            ) : userIsAdmin ? (
              <button
                onClick={createNewStudent}
                disabled={creatingStudent}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 mx-auto"
              >
                <SafeIcon icon={FiPlus} />
                <span>{creatingStudent ? 'Creating...' : 'Add Your First Student'}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredStudents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-600">
              {filteredStudents.filter(s => s.status === 'Current').length}
            </div>
            <div className="text-sm text-gray-600">Current Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredStudents.filter(s => s.status === 'Paused').length}
            </div>
            <div className="text-sm text-gray-600">Paused Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-gray-600">
              {filteredStudents.filter(s => s.status === 'Discontinued').length}
            </div>
            <div className="text-sm text-gray-600">Discontinued</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(filteredStudents.map(s => s.instrument).filter(Boolean)).size}
            </div>
            <div className="text-sm text-gray-600">Instruments Taught</div>
          </div>
        </div>
      )}

      {/* Missing Emails Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <SafeIcon icon={FiAlertCircle} className="text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Missing Email Addresses</h2>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <SafeIcon icon={FiX} className="text-gray-500" />
              </button>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                The following {missingEmails.length} {missingEmails.length === 1 ? 'person has' : 'people have'} missing email addresses:
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {missingEmails.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2 text-amber-800">
                      <SafeIcon icon={FiX} className="text-amber-500 mt-1 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.type === 'parent' && (
                          <span className="text-amber-700"> (Parent of {item.studentName})</span>
                        )}
                        <span className="block text-sm text-amber-700">No email address</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  // Continue with available emails only
                  createMailtoLink(emailTarget)
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Continue with Available Emails
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentManagement