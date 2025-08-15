import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiX, FiCalendar, FiPlay, FiCheck, FiAlertCircle, FiClock, FiUsers, FiTrash2, FiInfo, FiFilter } from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import { format, addDays, eachWeekOfInterval, parseISO } from 'date-fns'

const ScheduleLessonsModal = ({ students, dateRange, onClose, onSuccess }) => {
  const { currentUserID, currentSchoolID } = useUser()
  const [scheduling, setScheduling] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  // State for conflicting lessons (same day, different time)
  const [conflictingLessons, setConflictingLessons] = useState([])
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [showConflictingLessons, setShowConflictingLessons] = useState(false)
  const [selectedAction, setSelectedAction] = useState('keep') // 'keep' or 'replace'
  const [conflictsByStudent, setConflictsByStudent] = useState({})

  // Detailed tracking of lessons
  const [addedLessons, setAddedLessons] = useState([])
  const [deletedLessons, setDeletedLessons] = useState([])
  const [skippedLessons, setSkippedLessons] = useState([])

  const calculateLessonDates = () => {
    const startDate = new Date(dateRange.startDate)
    const endDate = new Date(dateRange.endDate)
    const lessons = []

    // Get all weeks in the date range
    const weeks = eachWeekOfInterval(
      { start: startDate, end: endDate },
      { weekStartsOn: 1 } // Start week on Monday
    )

    students.forEach(student => {
      if (!student.lesson_day || !student.lesson_time || !student.lesson_duration) return

      // Convert lesson_day to day index (Monday=1, Sunday=0)
      const dayMap = {
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6,
        'Sunday': 0
      }
      const dayIndex = dayMap[student.lesson_day]
      if (dayIndex === undefined) return

      weeks.forEach(weekStart => {
        // Calculate the specific date for this lesson
        const lessonDate = addDays(weekStart, dayIndex === 0 ? 6 : dayIndex - 1)

        // Skip if lesson date is outside our range
        if (lessonDate < startDate || lessonDate > endDate) return

        // Create scheduled_time by combining date and time
        const [hours, minutes] = student.lesson_time.split(':')
        const scheduledTime = new Date(lessonDate)
        scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Calculate end time by adding duration
        const endTime = new Date(scheduledTime)
        endTime.setMinutes(endTime.getMinutes() + student.lesson_duration)

        lessons.push({
          student_id: student.id,
          teacher_id: currentUserID,
          school_id: currentSchoolID,
          scheduled_time: scheduledTime.toISOString(),
          end_time: endTime.toISOString(), // Add end time for calendar events
          duration_min: student.lesson_duration,
          status: 'scheduled',
          student_name: student.name,
          lesson_date: format(lessonDate, 'yyyy-MM-dd'),
          lesson_day: student.lesson_day,
          lesson_time_display: format(scheduledTime, 'h:mm a')
        })
      })
    })

    return lessons
  }

  // Check for existing lessons that are on the same day but at a different time
  const checkForConflictingLessons = async () => {
    try {
      setCheckingExisting(true)
      setError(null)
      console.log('🔍 Checking for existing lessons in date range...')

      // Calculate planned lessons
      const plannedLessons = calculateLessonDates()

      // Get all student IDs
      const studentIds = students.map(s => s.id)

      // Query for existing lessons in the date range for these students
      const { data: existingLessonsData, error: existingLessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          student_id,
          scheduled_time,
          duration_min,
          status,
          students (
            name
          )
        `)
        .in('student_id', studentIds)
        .eq('teacher_id', currentUserID)
        .gte('scheduled_time', dateRange.startDate)
        .lte('scheduled_time', dateRange.endDate)
        .order('scheduled_time')

      if (existingLessonsError) {
        throw existingLessonsError
      }

      // No existing lessons found - proceed with scheduling
      if (!existingLessonsData || existingLessonsData.length === 0) {
        console.log('🔍 No existing lessons found in date range')
        await scheduleAllLessons(plannedLessons, [])
        return
      }

      // Add display info to existing lessons
      const enhancedExistingLessons = existingLessonsData.map(lesson => ({
        ...lesson,
        student_name: lesson.students?.name || 'Unknown Student',
        lesson_date: format(new Date(lesson.scheduled_time), 'yyyy-MM-dd'),
        lesson_day: format(new Date(lesson.scheduled_time), 'EEEE'),
        lesson_time_display: format(new Date(lesson.scheduled_time), 'h:mm a')
      }))

      // Find conflicts (same day but different time)
      const conflicts = []
      const conflictingByStudent = {}

      // Create a map of existing lessons by date and student ID
      const existingLessonMap = {}
      enhancedExistingLessons.forEach(lesson => {
        const lessonDate = format(new Date(lesson.scheduled_time), 'yyyy-MM-dd')
        const lessonTime = format(new Date(lesson.scheduled_time), 'HH:mm')
        const key = `${lesson.student_id}_${lessonDate}`

        if (!existingLessonMap[key]) {
          existingLessonMap[key] = []
        }
        existingLessonMap[key].push({
          ...lesson,
          lessonDate,
          lessonTime,
          formattedDate: format(new Date(lesson.scheduled_time), 'MMM d, yyyy'),
          formattedTime: format(new Date(lesson.scheduled_time), 'h:mm a')
        })
      })

      // Check each planned lesson against the map
      plannedLessons.forEach(plannedLesson => {
        const plannedDate = plannedLesson.lesson_date
        const plannedTime = format(new Date(plannedLesson.scheduled_time), 'HH:mm')
        const key = `${plannedLesson.student_id}_${plannedDate}`

        // If there are existing lessons for this student on this date
        if (existingLessonMap[key]) {
          const existingLessonsForDay = existingLessonMap[key]

          // Check if there's a time match (exact same time)
          const exactTimeMatch = existingLessonsForDay.some(
            existing => format(new Date(existing.scheduled_time), 'HH:mm') === plannedTime
          )

          // If there's no exact time match but there are lessons on the same day,
          // this is a conflict (same day, different time)
          if (!exactTimeMatch) {
            existingLessonsForDay.forEach(existing => {
              // Add to conflicts if not already included
              if (!conflicts.some(c => c.id === existing.id)) {
                conflicts.push(existing)

                // Group by student for display
                if (!conflictingByStudent[existing.student_id]) {
                  conflictingByStudent[existing.student_id] = {
                    studentName: existing.students?.name || 'Unknown Student',
                    lessons: []
                  }
                }
                if (!conflictingByStudent[existing.student_id].lessons.some(l => l.id === existing.id)) {
                  conflictingByStudent[existing.student_id].lessons.push(existing)
                }
              }
            })
          }
        }
      })

      setConflictingLessons(conflicts)
      setConflictsByStudent(conflictingByStudent)

      // If there are conflicts (same day, different time), show the conflict UI
      if (conflicts.length > 0) {
        console.log(`🔍 Found ${conflicts.length} lessons with day conflicts (different time)`)
        setShowConflictingLessons(true)
        return
      }

      console.log('🔍 No time conflicts found, proceeding with scheduling')
      // No conflicts, proceed with scheduling
      await scheduleAllLessons(plannedLessons, enhancedExistingLessons)

    } catch (error) {
      console.error('Error checking for conflicting lessons:', error)
      setError(`Failed to check for existing lessons: ${error.message}`)
    } finally {
      setCheckingExisting(false)
    }
  }

  const handleProceedWithScheduling = async () => {
    try {
      setScheduling(true)
      setError(null)

      // Calculate planned lessons
      const plannedLessons = calculateLessonDates()

      // If action is 'replace', delete conflicting lessons first
      if (selectedAction === 'replace' && conflictingLessons.length > 0) {
        console.log('🗑️ Deleting conflicting lessons before scheduling new ones...')
        const conflictingLessonIds = conflictingLessons.map(lesson => lesson.id)
        
        // Store deleted lessons for reporting
        setDeletedLessons([...conflictingLessons])

        // Delete corresponding calendar events first
        await deleteCalendarEventsForLessons(conflictingLessonIds);

        const { error: deleteError } = await supabase
          .from('lessons')
          .delete()
          .in('id', conflictingLessonIds)
          .eq('teacher_id', currentUserID) // Security check

        if (deleteError) {
          throw new Error(`Failed to delete conflicting lessons: ${deleteError.message}`)
        }

        console.log(`✅ Successfully deleted ${conflictingLessons.length} conflicting lessons`)
      } else {
        // If keeping existing lessons, set deletedLessons to empty array
        setDeletedLessons([])
      }

      // Get ALL existing lessons for filtering exact duplicates
      const { data: allExistingLessons, error: allLessonsError } = await supabase
        .from('lessons')
        .select('id, student_id, scheduled_time, students(name)')
        .in('student_id', students.map(s => s.id))
        .eq('teacher_id', currentUserID)
        .gte('scheduled_time', dateRange.startDate)
        .lte('scheduled_time', dateRange.endDate)

      if (allLessonsError) {
        throw new Error(`Failed to check all existing lessons: ${allLessonsError.message}`)
      }

      // Add display info to existing lessons
      const enhancedExistingLessons = allExistingLessons?.map(lesson => ({
        ...lesson,
        student_name: lesson.students?.name || 'Unknown Student',
        lesson_date: format(new Date(lesson.scheduled_time), 'yyyy-MM-dd'),
        lesson_day: format(new Date(lesson.scheduled_time), 'EEEE'),
        lesson_time_display: format(new Date(lesson.scheduled_time), 'h:mm a')
      })) || []

      // Proceed with scheduling new lessons, passing ALL existing lessons for duplicate checking
      await scheduleAllLessons(plannedLessons, enhancedExistingLessons)

      // Only now hide the conflict UI after scheduling is complete
      setShowConflictingLessons(false)

    } catch (error) {
      console.error('❌ Error processing lessons:', error)
      setError(error.message)
    } finally {
      setScheduling(false)
    }
  }

  // New function to delete calendar events for given lesson IDs
  const deleteCalendarEventsForLessons = async (lessonIds) => {
    if (!lessonIds || lessonIds.length === 0) return;
    try {
      console.log(`🗑️ Deleting calendar events for ${lessonIds.length} lessons...`);
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .in('linked_id', lessonIds)
        .eq('linked_table', 'lessons');
      
      if (error) {
        console.error('Error deleting calendar events:', error);
        throw new Error(`Failed to delete calendar events: ${error.message}`);
      }
      console.log('✅ Successfully deleted corresponding calendar events');
    } catch (error) {
      console.error('Error in deleteCalendarEventsForLessons:', error);
      // Don't throw here - we want the main flow to continue even if calendar event deletion fails
    }
  }

  // New function to create calendar events for given lessons
  const createCalendarEventsForLessons = async (lessonData) => {
    if (!lessonData || lessonData.length === 0) return [];
    try {
      console.log(`📅 Creating ${lessonData.length} calendar events...`);
      
      // First, delete any existing calendar events for these lessons to prevent duplicates
      const lessonIds = lessonData.map(lesson => lesson.id);
      await deleteCalendarEventsForLessons(lessonIds);
      
      // Map lesson data to calendar events
      const calendarEvents = lessonData.map(lesson => ({
        title: `Lesson with ${lesson.student_name}`,
        event_type: 'lesson',
        start_time: lesson.scheduled_time,
        end_time: lesson.end_time,
        teacher_id: lesson.teacher_id,
        school_id: lesson.school_id,
        linked_id: lesson.id,
        linked_table: 'lessons',
        location: 'Online', // Default location
        notes: '', // Leave blank as requested
      }));
      
      // Insert calendar events
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(calendarEvents)
        .select();
        
      if (error) {
        console.error('Error creating calendar events:', error);
        throw new Error(`Failed to create calendar events: ${error.message}`);
      }
      console.log(`✅ Successfully created ${data.length} calendar events`);
      return data;
    } catch (error) {
      console.error('Error in createCalendarEventsForLessons:', error);
      return []; // Return empty array on error
    }
  }

  const scheduleAllLessons = async (plannedLessons, existingLessons) => {
    try {
      setScheduling(true)
      setError(null)
      setResults(null)

      console.log('🗓️ Starting lesson scheduling process...')

      // Validate context values first
      if (!currentUserID || !currentSchoolID) {
        throw new Error('Missing user or school context. Please refresh the page and try again.')
      }

      console.log('🗓️ Planned lessons:', plannedLessons.length)
      if (plannedLessons.length === 0) {
        throw new Error('No lessons to schedule. Please check student schedules and date range.')
      }

      setProgress({ current: 0, total: plannedLessons.length })

      // Filter out exact duplicates (same student, same day, same time)
      let newLessons = plannedLessons
      let skipped = []
      let duplicates = [] // Initialize duplicates array here

      if (existingLessons && existingLessons.length > 0) {
        console.log('🔍 Filtering out exact duplicates...')
        // Create a set of keys for existing lessons in format "studentId_date_time"
        const existingLessonKeys = new Set()
        const existingLessonMap = {}

        existingLessons.forEach(lesson => {
          const lessonDate = format(new Date(lesson.scheduled_time), 'yyyy-MM-dd')
          const lessonTime = format(new Date(lesson.scheduled_time), 'HH:mm')
          const key = `${lesson.student_id}_${lessonDate}_${lessonTime}`
          existingLessonKeys.add(key)
          existingLessonMap[key] = lesson
        })

        // Filter planned lessons to remove duplicates
        duplicates = [] // Clear and re-initialize duplicates
        newLessons = plannedLessons.filter(lesson => {
          const lessonDate = format(new Date(lesson.scheduled_time), 'yyyy-MM-dd')
          const lessonTime = format(new Date(lesson.scheduled_time), 'HH:mm')
          const key = `${lesson.student_id}_${lessonDate}_${lessonTime}`

          // If this key exists in our set of existing lessons, filter it out
          const isDuplicate = existingLessonKeys.has(key)
          if (isDuplicate) {
            console.log(`🔍 Skipping duplicate lesson: ${key}`)
            duplicates.push({ ...lesson, ...existingLessonMap[key] })
          }
          return !isDuplicate
        })

        // Store skipped lessons for reporting
        setSkippedLessons(duplicates)

        console.log(`➕ After filtering: ${newLessons.length} new lessons to create`)
        console.log(`🔄 Skipped ${plannedLessons.length - newLessons.length} existing lessons`)
      }

      if (newLessons.length === 0) {
        setResults({
          created: 0,
          skipped: plannedLessons.length,
          replaced: selectedAction === 'replace' ? conflictingLessons.length : 0,
          total: plannedLessons.length,
          message: 'All lessons already exist for the selected date range.'
        })
        return
      }

      // Insert lessons in smaller batches to avoid subquery issues
      const batchSize = 50 // Smaller batch size for safety
      let createdCount = 0
      const createdLessons = []

      for (let i = 0; i < newLessons.length; i += batchSize) {
        const batch = newLessons.slice(i, i + batchSize)

        // Remove non-database fields and ensure clean data
        const lessonsToInsert = batch.map(({ student_name, lesson_date, lesson_day, lesson_time_display, end_time, ...lesson }) => ({
          student_id: lesson.student_id,
          teacher_id: lesson.teacher_id,
          school_id: lesson.school_id,
          scheduled_time: lesson.scheduled_time,
          duration_min: lesson.duration_min,
          status: lesson.status
        }))

        console.log(`📝 Inserting batch ${Math.floor(i/batchSize) + 1}:`, lessonsToInsert.length, 'lessons')

        const { data: createdBatch, error: insertError } = await supabase
          .from('lessons')
          .insert(lessonsToInsert)
          .select('id, student_id, scheduled_time')

        if (insertError) {
          console.error('❌ Error inserting lesson batch:', insertError)
          throw new Error(`Failed to create lessons: ${insertError.message}`)
        }

        // Match created lessons back to their original data for display
        if (createdBatch) {
          const enhancedBatch = createdBatch.map((created, idx) => {
            // Find the corresponding original lesson with full data
            const originalLesson = batch[idx];
            return {
              ...created,
              ...originalLesson,
              end_time: originalLesson.end_time, // Make sure end_time is included
              student_name: originalLesson.student_name
            };
          });
          
          // Add created lessons to our tracking array
          createdLessons.push(...enhancedBatch);
          
          // Create calendar events for this batch of lessons
          await createCalendarEventsForLessons(enhancedBatch);
        }

        createdCount += batch.length
        setProgress({ current: createdCount, total: newLessons.length })
      }

      // Store added lessons for reporting
      setAddedLessons(createdLessons)

      console.log('✅ Lesson scheduling completed successfully')
      setResults({
        created: createdCount,
        skipped: plannedLessons.length - newLessons.length,
        replaced: selectedAction === 'replace' ? conflictingLessons.length : 0,
        total: createdCount + (plannedLessons.length - newLessons.length),
        message: `Successfully scheduled ${createdCount} new lessons.`
      })

      // If onSuccess callback provided, call it with results and detailed lesson lists
      if (onSuccess) {
        onSuccess({
          created: createdCount,
          skipped: plannedLessons.length - newLessons.length,
          replaced: selectedAction === 'replace' ? conflictingLessons.length : 0,
          addedLessons: createdLessons,
          deletedLessons: deletedLessons,
          skippedLessons: duplicates // Use the duplicates array we created in this function
        })
      }

    } catch (error) {
      console.error('❌ Error scheduling lessons:', error)
      setError(error.message)
    } finally {
      setScheduling(false)
    }
  }

  const startProcess = async () => {
    await checkForConflictingLessons()
  }

  const plannedLessons = calculateLessonDates()
  const weekCount = Math.ceil((new Date(dateRange.endDate) - new Date(dateRange.startDate)) / (7 * 24 * 60 * 60 * 1000))

  // Calculate how many lessons we're planning to create per student
  const lessonsByStudent = {}
  plannedLessons.forEach(lesson => {
    if (!lessonsByStudent[lesson.student_id]) {
      lessonsByStudent[lesson.student_id] = 0
    }
    lessonsByStudent[lesson.student_id]++
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiCalendar} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Schedule Lessons</h2>
          </div>
          <button
            onClick={onClose}
            disabled={scheduling || checkingExisting}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
              <div>
                <h4 className="text-red-800 font-medium">Error</h4>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Conflicting Lessons View - Only show when there are lessons on the same day but different time */}
        {showConflictingLessons && conflictingLessons.length > 0 ? (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <SafeIcon icon={FiInfo} className="text-amber-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-amber-800 font-medium">Time Conflicts Found</h4>
                  <p className="text-amber-700 text-sm mt-1">
                    {conflictingLessons.length} lesson{conflictingLessons.length !== 1 ? 's' : ''} already exist on the same day but at a different time for {Object.keys(conflictsByStudent).length} student{Object.keys(conflictsByStudent).length !== 1 ? 's' : ''}.
                  </p>
                  <p className="text-amber-700 text-sm mt-2">
                    Please choose how you want to handle these conflicts:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedAction === 'keep' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setSelectedAction('keep')}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${selectedAction === 'keep' ? 'border-teal-500 bg-teal-500' : 'border-gray-300'}`}>
                    {selectedAction === 'keep' && <SafeIcon icon={FiCheck} className="text-white text-xs" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Keep existing lessons</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Keep the existing lessons and add new lessons at the times in your timetable.
                    </p>
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedAction === 'replace' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                onClick={() => setSelectedAction('replace')}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${selectedAction === 'replace' ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                    {selectedAction === 'replace' && <SafeIcon icon={FiCheck} className="text-white text-xs" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Replace conflicting lessons</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Delete the conflicting lessons and create new ones at the times in your timetable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 max-h-60 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800">Conflicting Lessons</h4>
                <span className="text-sm text-gray-500">{conflictingLessons.length} total</span>
              </div>

              {Object.keys(conflictsByStudent).map(studentId => (
                <div key={studentId} className="mb-4 last:mb-0">
                  <div className="font-medium text-gray-700 mb-1 flex items-center justify-between">
                    <span>{conflictsByStudent[studentId].studentName}</span>
                    <span className="text-sm text-gray-500">
                      {conflictsByStudent[studentId].lessons.length} lesson{conflictsByStudent[studentId].lessons.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-sm">
                    {conflictsByStudent[studentId].lessons.map((lesson, idx) => (
                      <div key={lesson.id} className={idx > 0 ? 'mt-1 pt-1 border-t border-gray-200' : ''}>
                        <div className="flex justify-between">
                          <span>{lesson.formattedDate}</span>
                          <span>{lesson.formattedTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={scheduling}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedWithScheduling}
                disabled={scheduling}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={scheduling ? FiClock : FiPlay} className={scheduling ? 'animate-pulse' : ''} />
                <span>{scheduling ? 'Processing...' : 'Continue'}</span>
              </button>
            </div>
          </>
        ) : (
          // Standard scheduling view (no conflicts or user already made a decision)
          <>
            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Scheduling Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-teal-600">{students.length}</div>
                  <div className="text-sm text-gray-600">Students</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{weekCount}</div>
                  <div className="text-sm text-gray-600">Weeks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{plannedLessons.length}</div>
                  <div className="text-sm text-gray-600">Total Lessons</div>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <SafeIcon icon={FiCalendar} className="text-blue-600" />
                <span className="font-medium text-blue-800">Date Range</span>
              </div>
              <p className="text-blue-700">
                {format(new Date(dateRange.startDate), 'MMMM d, yyyy')} - {format(new Date(dateRange.endDate), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Context Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-2">Scheduling Context</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Teacher ID:</strong> {currentUserID}</p>
                <p><strong>School ID:</strong> {currentSchoolID}</p>
                <p><strong>Students Ready:</strong> {students.length}</p>
              </div>
            </div>

            {/* Student List */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                <SafeIcon icon={FiUsers} className="text-gray-600 mr-2" />
                Students to Schedule ({students.length})
              </h4>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                <div className="space-y-2">
                  {students.map(student => (
                    <div key={student.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{student.name}</span>
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span>{student.lesson_day}</span>
                        <span>•</span>
                        <span>{student.lesson_time}</span>
                        <span>•</span>
                        <span>{student.lesson_duration}min</span>
                        <span>•</span>
                        <span className="text-blue-600">
                          {lessonsByStudent[student.id] || 0} lessons
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress */}
            {(scheduling || checkingExisting) && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {checkingExisting ? 'Checking existing lessons...' : 'Creating lessons...'}
                  </span>
                  {scheduling && (
                    <span className="text-sm text-gray-600">{progress.current} / {progress.total}</span>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  {scheduling ? (
                    <div
                      className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    ></div>
                  ) : (
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse w-1/3"></div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-3">
                  <SafeIcon icon={FiCheck} className="text-green-500 mr-2" />
                  <h4 className="text-green-800 font-medium">Scheduling Complete</h4>
                </div>
                <div className="text-green-700 text-sm space-y-1">
                  <p>{results.message}</p>
                  <p><strong>Created:</strong> {results.created} new lessons</p>
                  {results.skipped > 0 && (
                    <p><strong>Skipped (already exist):</strong> {results.skipped} lessons</p>
                  )}
                  {results.replaced > 0 && (
                    <p><strong>Replaced:</strong> {results.replaced} conflicting lessons</p>
                  )}
                  <p><strong>Total:</strong> {results.total} lessons processed</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={scheduling || checkingExisting}
                className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              >
                {results ? 'Close' : 'Cancel'}
              </button>
              {!results && (
                <button
                  onClick={startProcess}
                  disabled={scheduling || checkingExisting || plannedLessons.length === 0 || !currentUserID || !currentSchoolID}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SafeIcon icon={(scheduling || checkingExisting) ? FiClock : FiPlay} className={(scheduling || checkingExisting) ? 'animate-pulse' : ''} />
                  <span>
                    {scheduling ? 'Scheduling...' : checkingExisting ? 'Checking...' : 'Schedule Lessons'}
                  </span>
                </button>
              )}
            </div>

            {/* Warning */}
            {!results && !showConflictingLessons && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <SafeIcon icon={FiAlertCircle} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="text-yellow-700 text-sm">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Duplicate lessons (same student, day, and time) will be automatically skipped</li>
                      <li>• You'll be prompted only if a student has a lesson on the same day but at a different time</li>
                      <li>• Make sure your date range and student schedules are correct</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ScheduleLessonsModal