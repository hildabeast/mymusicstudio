import React, { useState, useEffect, useRef } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { 
  FiCalendar, FiClock, FiUsers, FiEdit2, FiSave, FiPlay, FiAlertCircle, 
  FiInfo, FiAlertTriangle, FiList, FiGrid, FiMusic, FiX, FiCheck, FiPlus
} from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import { format, addDays } from 'date-fns'
import ScheduleLessonsModal from './ScheduleLessonsModal'
import StudentCard from './StudentCard'
import FullCalendarView from './FullCalendarView'
import LessonEditModal from './LessonEditModal'

const TimetablePage = () => {
  const { currentUserID, currentSchoolID, userIsAdmin } = useUser()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [draggedStudent, setDraggedStudent] = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)
  const [timeClashes, setTimeClashes] = useState([])
  const [viewMode, setViewMode] = useState('compact') // 'compact' or 'calendar'
  const [calendarSettings, setCalendarSettings] = useState({
    timeGridInterval: 30, // minutes
    startHour: 7,
    endHour: 23
  })
  const [lessonTypes, setLessonTypes] = useState([])

  // Edit modal state
  const [editingStudent, setEditingStudent] = useState(null)
  const [editModalAnchor, setEditModalAnchor] = useState(null)

  // Results summary state
  const [schedulingResults, setSchedulingResults] = useState(null)
  const [showResults, setShowResults] = useState(false)

  // Detailed lesson results
  const [addedLessons, setAddedLessons] = useState([])
  const [deletedLessons, setDeletedLessons] = useState([])
  const [skippedLessons, setSkippedLessons] = useState([])

  // Ref for results section to scroll to
  const resultsRef = useRef(null)

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ]

  // Enhanced time slots with 5-minute intervals from 7 AM to 11 PM
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 7; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Enhanced duration options with 5-minute intervals
  const generateDurationOptions = () => {
    const options = []
    for (let duration = 15; duration <= 120; duration += 5) {
      options.push(duration)
    }
    return options
  }

  const durationOptions = generateDurationOptions()

  useEffect(() => {
    if (currentUserID) {
      fetchStudents()
      fetchLessonTypes()
    }
  }, [currentUserID])

  useEffect(() => {
    // Detect time clashes whenever students data changes
    detectTimeClashes()
  }, [students])

  // Scroll to results when they become visible
  useEffect(() => {
    if (showResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showResults])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('📅 Fetching students for timetable:', currentUserID)

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, name, first_name, last_name, instrument, status, lesson_day, lesson_time, lesson_time_end, lesson_duration, teacher_id, school_id, lesson_type_id')
        .eq('teacher_id', currentUserID)
        .eq('status', 'Current')
        .order('name')

      if (studentsError) {
        throw new Error(`Error fetching students: ${studentsError.message}`)
      }

      console.log('📅 Students fetched:', studentsData?.length || 0)
      setStudents(studentsData || [])
    } catch (error) {
      console.error('❌ Error fetching students:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchLessonTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .eq('school_id', currentSchoolID)
        .order('name')

      if (error) {
        console.error('Error fetching lesson types:', error)
        return
      }

      setLessonTypes(data || [])
    } catch (error) {
      console.error('Error fetching lesson types:', error)
    }
  }

  const detectTimeClashes = () => {
    const clashes = []
    const scheduledStudents = getScheduledStudents().filter(s => s.lesson_duration)

    // Group by day
    const studentsByDay = {}
    scheduledStudents.forEach(student => {
      if (!studentsByDay[student.lesson_day]) {
        studentsByDay[student.lesson_day] = []
      }
      studentsByDay[student.lesson_day].push(student)
    })

    // Check for clashes within each day
    Object.keys(studentsByDay).forEach(day => {
      const dayStudents = studentsByDay[day]
      for (let i = 0; i < dayStudents.length; i++) {
        for (let j = i + 1; j < dayStudents.length; j++) {
          const student1 = dayStudents[i]
          const student2 = dayStudents[j]
          if (hasTimeClash(student1, student2)) {
            clashes.push([student1.id, student2.id])
          }
        }
      }
    })

    setTimeClashes(clashes)
  }

  const hasTimeClash = (student1, student2) => {
    if (!student1.lesson_time || !student2.lesson_time || !student1.lesson_duration || !student2.lesson_duration) {
      return false
    }

    // Convert time strings to minutes since midnight
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours * 60 + minutes
    }

    const start1 = timeToMinutes(student1.lesson_time)
    const end1 = start1 + student1.lesson_duration
    const start2 = timeToMinutes(student2.lesson_time)
    const end2 = start2 + student2.lesson_duration

    // Check for overlap: start1 < end2 AND start2 < end1
    return start1 < end2 && start2 < end1
  }

  const isStudentInClash = (studentId) => {
    return timeClashes.some(clash => clash.includes(studentId))
  }

  const getStudentClashPartners = (studentId) => {
    const clashingIds = []
    timeClashes.forEach(clash => {
      if (clash.includes(studentId)) {
        clashingIds.push(...clash.filter(id => id !== studentId))
      }
    })
    return clashingIds
  }

  const handleUpdateStudent = async (studentId, field, value) => {
    if (!userIsAdmin) return
    try {
      setSaving(studentId)
      console.log('📅 Updating student schedule:', { studentId, field, value })

      // Create update object with field to update
      const updates = { [field]: value || null }
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', studentId)
        .eq('teacher_id', currentUserID)

      if (error) {
        throw new Error(`Error updating ${field}: ${error.message}`)
      }

      // Re-fetch the student to get the updated lesson_time_end (calculated by DB trigger)
      const { data: updatedStudent, error: fetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (fetchError) {
        console.error('Error fetching updated student data:', fetchError)
      }

      // Update local state with the full updated student data
      if (updatedStudent) {
        setStudents(prev =>
          prev.map(student => (student.id === studentId ? updatedStudent : student))
        )
      } else {
        // Fallback if fetch failed - update only the specific field
        setStudents(prev =>
          prev.map(student => (student.id === studentId ? { ...student, ...updates } : student))
        )
      }

      console.log('✅ Student schedule updated successfully')
    } catch (error) {
      console.error('❌ Error updating student schedule:', error)
      setError(error.message)
    } finally {
      setSaving(null)
    }
  }

  const handleClearStudent = async (studentId) => {
    if (!userIsAdmin) return
    try {
      setSaving(studentId)
      console.log('🗑️ Clearing student schedule:', studentId)

      const { error } = await supabase
        .from('students')
        .update({
          lesson_day: null,
          lesson_time: null,
          lesson_time_end: null,
          lesson_duration: null
        })
        .eq('id', studentId)
        .eq('teacher_id', currentUserID)

      if (error) {
        throw new Error(`Error clearing schedule: ${error.message}`)
      }

      // Update local state
      setStudents(prev =>
        prev.map(student =>
          student.id === studentId
            ? {
                ...student,
                lesson_day: null,
                lesson_time: null,
                lesson_time_end: null,
                lesson_duration: null
              }
            : student
        )
      )

      console.log('✅ Student schedule cleared successfully')
    } catch (error) {
      console.error('❌ Error clearing student schedule:', error)
      setError(error.message)
    } finally {
      setSaving(null)
    }
  }

  // Handle student card click for editing
  const handleStudentClick = (student, anchorElement) => {
    if (!userIsAdmin) return
    setEditingStudent(student)
    setEditModalAnchor(anchorElement)
  }

  // Handle edit modal save
  const handleEditSave = async (updates) => {
    if (!editingStudent || !userIsAdmin) return
    try {
      setSaving(editingStudent.id)
      
      // Update lesson day field if provided
      if (updates.lesson_day !== undefined) {
        await handleUpdateStudent(editingStudent.id, 'lesson_day', updates.lesson_day)
      }
      
      // Update lesson time field if provided
      if (updates.lesson_time !== undefined) {
        await handleUpdateStudent(editingStudent.id, 'lesson_time', updates.lesson_time)
      }
      
      // Close modal
      setEditingStudent(null)
      setEditModalAnchor(null)
    } catch (error) {
      console.error('❌ Error saving lesson updates:', error)
    }
  }

  const handleDragStart = (e, student) => {
    if (!userIsAdmin) return
    setDraggedStudent(student)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for some browsers
  }

  const handleDragOver = (e, day) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(day)
  }

  const handleDragLeave = (e) => {
    // Only clear if leaving the day column entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverDay(null)
    }
  }

  const handleDrop = async (e, day) => {
    e.preventDefault()
    setDragOverDay(null)

    if (!draggedStudent || !userIsAdmin) return

    // Don't do anything if dropping on the same day
    if (draggedStudent.lesson_day === day) {
      setDraggedStudent(null)
      return
    }

    try {
      await handleUpdateStudent(draggedStudent.id, 'lesson_day', day)
      setDraggedStudent(null)
    } catch (error) {
      console.error('❌ Error moving student:', error)
      setDraggedStudent(null)
    }
  }

  const formatTimeSlot = (time) => {
    if (!time) return 'Not set'

    const [hours, minutes] = time.split(':')
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
  }

  const getScheduledStudents = () => {
    return students.filter(student => student.lesson_day && student.lesson_time)
  }

  const getUnscheduledStudents = () => {
    return students.filter(student => !student.lesson_day || !student.lesson_time)
  }

  const getStudentsForDay = (day) => {
    return getScheduledStudents()
      .filter(student => student.lesson_day === day)
      .sort((a, b) => {
        if (!a.lesson_time) return 1
        if (!b.lesson_time) return -1
        return a.lesson_time.localeCompare(b.lesson_time)
      })
  }

  const isStudentIncomplete = (student) => {
    return !student.lesson_time || !student.lesson_duration
  }

  const setQuickRange = (weeks) => {
    // If start date is already set, use it as the base for calculation
    // Otherwise use today as the start date
    const startDate = selectedDateRange.startDate ? new Date(selectedDateRange.startDate) : new Date()
    const endDate = addDays(startDate, weeks * 7)

    setSelectedDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    })
  }

  const handleScheduleLessons = () => {
    if (!selectedDateRange.startDate || !selectedDateRange.endDate) {
      setError('Please select a date range first')
      return
    }

    const scheduledStudents = getScheduledStudents().filter(s => s.lesson_duration)
    if (scheduledStudents.length === 0) {
      setError('No students have complete schedule information (day, time, and duration)')
      return
    }

    if (!currentUserID || !currentSchoolID) {
      setError('Missing user or school context. Please refresh the page and try again.')
      return
    }

    setShowScheduleModal(true)
  }

  const handleScheduleSuccess = (results) => {
    // Store the scheduling results summary
    setSchedulingResults(results)

    // Store the detailed lesson lists
    setAddedLessons(results.addedLessons || [])
    setDeletedLessons(results.deletedLessons || [])
    setSkippedLessons(results.skippedLessons || [])

    // Show the results summary
    setShowResults(true)

    // Close the modal
    setShowScheduleModal(false)
  }

  const calculateWeeks = () => {
    if (!selectedDateRange.startDate || !selectedDateRange.endDate) return 0

    const start = new Date(selectedDateRange.startDate)
    const end = new Date(selectedDateRange.endDate)
    const diffTime = Math.abs(end - start)
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks
  }

  // Get lesson type name for a student
  const getLessonTypeName = (lessonTypeId) => {
    const lessonType = lessonTypes.find(lt => lt.id === lessonTypeId)
    return lessonType ? lessonType.name : 'Not set'
  }

  // Get lesson duration from lesson type
  const getLessonDuration = (lessonTypeId) => {
    const lessonType = lessonTypes.find(lt => lt.id === lessonTypeId)
    return lessonType ? `${lessonType.duration_min} minute lesson` : 'Not set'
  }

  // Handle calendar grid interval change
  const handleGridIntervalChange = (interval) => {
    setCalendarSettings(prev => ({ ...prev, timeGridInterval: parseInt(interval) }))
  }

  // Clear the results summary
  const clearResultsSummary = () => {
    setShowResults(false)
    setSchedulingResults(null)
    setAddedLessons([])
    setDeletedLessons([])
    setSkippedLessons([])
  }

  // Format date for display in results
  const formatResultDate = (dateString) => {
    const date = new Date(dateString)
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-7 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Timetable Planning</h1>
        <p className="text-gray-600 mt-1">Organize your weekly lesson schedule and generate lesson records</p>
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

      {/* Time Clash Warning */}
      {timeClashes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertTriangle} className="text-amber-500 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-amber-800">Time Conflicts Detected</h3>
              <p className="text-sm text-amber-700 mt-1">
                {timeClashes.length} lesson time conflict{timeClashes.length !== 1 ? 's' : ''} found. Conflicting students
                are highlighted in red.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary - Only shown after scheduling */}
      {showResults && schedulingResults && (
        <div ref={resultsRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <SafeIcon icon={FiInfo} className="text-green-600 mr-2" /> Lesson Scheduling Results
            </h2>
            <button onClick={clearResultsSummary} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <SafeIcon icon={FiX} className="text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Added Lessons */}
            {addedLessons.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <SafeIcon icon={FiPlus} className="text-green-600 mr-2" /> The following lessons were added:
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-green-100">
                        <th className="py-2 pr-4 text-left">Date</th>
                        <th className="py-2 pr-4 text-left">Time</th>
                        <th className="py-2 text-left">Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addedLessons
                        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                        .map(lesson => (
                          <tr key={lesson.id} className="border-b border-green-100 last:border-0">
                            <td className="py-2 pr-4">{formatResultDate(lesson.scheduled_time)}</td>
                            <td className="py-2 pr-4 font-medium">{lesson.lesson_time_display}</td>
                            <td className="py-2">{lesson.student_name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Deleted Lessons */}
            {deletedLessons.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <SafeIcon icon={FiTrash2} className="text-red-600 mr-2" /> The following lessons were deleted:
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-red-100">
                        <th className="py-2 pr-4 text-left">Date</th>
                        <th className="py-2 pr-4 text-left">Time</th>
                        <th className="py-2 text-left">Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deletedLessons
                        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                        .map(lesson => (
                          <tr key={lesson.id} className="border-b border-red-100 last:border-0">
                            <td className="py-2 pr-4">{formatResultDate(lesson.scheduled_time)}</td>
                            <td className="py-2 pr-4 font-medium">
                              {format(new Date(lesson.scheduled_time), 'h:mm a')}
                            </td>
                            <td className="py-2">{lesson.student_name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Skipped Lessons */}
            {skippedLessons.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <SafeIcon icon={FiInfo} className="text-blue-600 mr-2" /> The following lessons already existed and
                  were left as they were:
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-blue-100">
                        <th className="py-2 pr-4 text-left">Date</th>
                        <th className="py-2 pr-4 text-left">Time</th>
                        <th className="py-2 text-left">Student</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skippedLessons
                        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                        .map(lesson => (
                          <tr
                            key={lesson.id || lesson.student_id + lesson.scheduled_time}
                            className="border-b border-blue-100 last:border-0"
                          >
                            <td className="py-2 pr-4">{formatResultDate(lesson.scheduled_time)}</td>
                            <td className="py-2 pr-4 font-medium">
                              {lesson.lesson_time_display || format(new Date(lesson.scheduled_time), 'h:mm a')}
                            </td>
                            <td className="py-2">{lesson.student_name}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Counts */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">{schedulingResults.created}</div>
                  <div className="text-sm text-gray-600">Added</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{schedulingResults.replaced}</div>
                  <div className="text-sm text-gray-600">Deleted</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{schedulingResults.skipped}</div>
                  <div className="text-sm text-gray-600">Skipped</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-800">Timetable View</h2>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('compact')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'compact' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <SafeIcon icon={FiList} />
                <span className="font-medium">Compact List</span>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'calendar' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <SafeIcon icon={FiGrid} />
                <span className="font-medium">Calendar View</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timetable Display */}
      {viewMode === 'compact' ? (
        // Compact List View
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <SafeIcon icon={FiCalendar} className="text-teal-600 mr-2" /> Weekly Timetable
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              {userIsAdmin ? 'Click edit icon to modify • Hover for clear button' : 'View your weekly lesson schedule'}
            </p>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {daysOfWeek.map(day => {
              const dayStudents = getStudentsForDay(day)
              const isDragOver = dragOverDay === day

              return (
                <div
                  key={day}
                  className={`border-2 rounded-xl transition-all duration-200 ${
                    isDragOver ? 'border-teal-400 bg-teal-50 scale-105 shadow-lg' : 'border-gray-200'
                  }`}
                  onDragOver={e => handleDragOver(e, day)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, day)}
                >
                  {/* Day Header */}
                  <div
                    className={`border-b p-3 rounded-t-xl transition-colors ${
                      isDragOver ? 'bg-teal-100 border-teal-200' : 'bg-teal-50 border-teal-100'
                    }`}
                  >
                    <h3 className="font-semibold text-teal-800 text-center text-sm">{day}</h3>
                    <p className="text-xs text-teal-600 text-center mt-1">
                      {dayStudents.length} student{dayStudents.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Students List */}
                  <div className="p-2 space-y-1 min-h-[350px]">
                    {dayStudents.map(student => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onUpdateStudent={handleUpdateStudent}
                        onClearStudent={handleClearStudent}
                        onDragStart={handleDragStart}
                        onStudentClick={handleStudentClick}
                        userIsAdmin={userIsAdmin}
                        formatTimeSlot={formatTimeSlot}
                        timeSlots={timeSlots}
                        durationOptions={durationOptions}
                        saving={saving === student.id}
                        isIncomplete={isStudentIncomplete(student)}
                        hasClash={isStudentInClash(student.id)}
                        clashPartners={getStudentClashPartners(student.id)}
                        showInlineEditing={false}
                      />
                    ))}

                    {dayStudents.length === 0 && (
                      <div
                        className={`flex items-center justify-center h-32 text-gray-400 text-sm transition-all ${
                          isDragOver ? 'text-teal-500' : ''
                        }`}
                      >
                        {isDragOver ? 'Drop here' : 'No lessons'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        // Full Calendar View
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                  <SafeIcon icon={FiCalendar} className="text-teal-600 mr-2" /> Calendar View
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {userIsAdmin ? 'Click edit icon for details • Hover for clear button' : 'Visual weekly lesson calendar'}
                </p>
              </div>
              
              {/* Grid Interval selector - moved inside the calendar view */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Grid Interval:</label>
                <select
                  value={calendarSettings.timeGridInterval}
                  onChange={(e) => handleGridIntervalChange(e.target.value)}
                  className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>
            </div>
          </div>
          
          <FullCalendarView
            students={students}
            daysOfWeek={daysOfWeek}
            onUpdateStudent={handleUpdateStudent}
            onClearStudent={handleClearStudent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onStudentClick={handleStudentClick}
            userIsAdmin={userIsAdmin}
            formatTimeSlot={formatTimeSlot}
            timeSlots={timeSlots}
            durationOptions={durationOptions}
            saving={saving}
            getStudentsForDay={getStudentsForDay}
            isStudentIncomplete={isStudentIncomplete}
            isStudentInClash={isStudentInClash}
            getStudentClashPartners={getStudentClashPartners}
            dragOverDay={dragOverDay}
            calendarSettings={calendarSettings}
          />
        </div>
      )}

      {/* Unscheduled Students - Updated View */}
      {getUnscheduledStudents().length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <SafeIcon icon={FiUsers} className="text-amber-600 mr-2" /> Unscheduled Students
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Students missing lesson day or time information - complete their schedule to move them to the timetable
            </p>
          </div>

          <div className="space-y-2">
            {getUnscheduledStudents().map(student => (
              <div key={student.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                  {/* Student Name */}
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-xs">
                          {student.name ? student.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-sm">{student.name || 'Unnamed Student'}</div>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500 capitalize">{student.instrument}</div>

                          {/* Lesson Type (read-only) - Simplified */}
                          {student.lesson_type_id && (
                            <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              <SafeIcon icon={FiMusic} className="inline-block mr-1 text-xs" />
                              {getLessonTypeName(student.lesson_type_id)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lesson Day */}
                  <div>
                    <select
                      value={student.lesson_day || ''}
                      onChange={e => handleUpdateStudent(student.id, 'lesson_day', e.target.value)}
                      disabled={!userIsAdmin || saving === student.id}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                    >
                      <option value="">Day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day.slice(0, 3)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lesson Time */}
                  <div>
                    <select
                      value={student.lesson_time || ''}
                      onChange={e => handleUpdateStudent(student.id, 'lesson_time', e.target.value)}
                      disabled={!userIsAdmin || saving === student.id}
                      className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                    >
                      <option value="">Time</option>
                      {timeSlots.map(time => (
                        <option key={time} value={time}>
                          {formatTimeSlot(time)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="flex justify-end">
                    {saving === student.id ? (
                      <div className="flex items-center space-x-1 text-amber-600">
                        <SafeIcon icon={FiSave} className="animate-pulse text-xs" />
                        <span className="text-xs">Saving...</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {student.lesson_day && student.lesson_time && student.lesson_type_id ? (
                          <span className="text-green-600 font-medium">Complete</span>
                        ) : (
                          <span className="text-amber-600">Incomplete</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Lessons Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <SafeIcon icon={FiPlay} className="text-green-600 mr-2" /> Generate Lessons
          </h2>
          <p className="text-gray-600 text-sm mt-1">Create lesson records for your scheduled students over a date range</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Select Date Range</h3>

            {/* Quick Range Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setQuickRange(4)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                4 Weeks
              </button>
              <button
                onClick={() => setQuickRange(8)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                8 Weeks
              </button>
              <button
                onClick={() => setQuickRange(12)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                12 Weeks
              </button>
              <button
                onClick={() => setQuickRange(16)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                16 Weeks
              </button>
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={selectedDateRange.startDate}
                  onChange={e => setSelectedDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={selectedDateRange.endDate}
                  onChange={e => setSelectedDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  min={selectedDateRange.startDate}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Range Summary */}
            {selectedDateRange.startDate && selectedDateRange.endDate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-800">
                  <p className="font-medium">Selected Range:</p>
                  <p>
                    {format(new Date(selectedDateRange.startDate), 'MMM d, yyyy')} -{' '}
                    {format(new Date(selectedDateRange.endDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-green-600 mt-1">{calculateWeeks()} weeks total</p>
                </div>
              </div>
            )}
          </div>

          {/* Schedule Summary and Action */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-800">Schedule Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Students:</span>
                <span className="font-medium">{students.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fully Scheduled:</span>
                <span className="font-medium text-teal-600">
                  {getScheduledStudents().filter(s => s.lesson_duration).length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Unscheduled:</span>
                <span className="font-medium text-amber-600">{getUnscheduledStudents().length}</span>
              </div>
              {timeClashes.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time Conflicts:</span>
                  <span className="font-medium text-red-600">{timeClashes.length}</span>
                </div>
              )}
              {selectedDateRange.startDate && selectedDateRange.endDate && (
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Estimated Lessons:</span>
                  <span className="font-medium text-green-600">
                    {getScheduledStudents().filter(s => s.lesson_duration).length * calculateWeeks()}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleScheduleLessons}
              disabled={
                !userIsAdmin ||
                !selectedDateRange.startDate ||
                !selectedDateRange.endDate ||
                getScheduledStudents().filter(s => s.lesson_duration).length === 0 ||
                !currentUserID ||
                !currentSchoolID ||
                timeClashes.length > 0
              }
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SafeIcon icon={FiPlay} />
              <span>Schedule Lessons</span>
            </button>

            {timeClashes.length > 0 && (
              <p className="text-xs text-red-600 text-center">Resolve time conflicts before scheduling lessons</p>
            )}

            {!userIsAdmin && (
              <p className="text-xs text-amber-600 text-center">Admin access required to schedule lessons</p>
            )}

            {(!currentUserID || !currentSchoolID) && (
              <p className="text-xs text-red-600 text-center">Missing context - please refresh page</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStudent && editModalAnchor && (
        <LessonEditModal
          student={editingStudent}
          anchorElement={editModalAnchor}
          onClose={() => {
            setEditingStudent(null)
            setEditModalAnchor(null)
          }}
          onSave={handleEditSave}
          timeSlots={timeSlots}
          daysOfWeek={daysOfWeek}
          formatTimeSlot={formatTimeSlot}
          saving={saving === editingStudent.id}
        />
      )}

      {/* Schedule Lessons Modal */}
      {showScheduleModal && (
        <ScheduleLessonsModal
          students={getScheduledStudents().filter(s => s.lesson_duration)}
          dateRange={selectedDateRange}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleScheduleSuccess}
        />
      )}
    </div>
  )
}

export default TimetablePage