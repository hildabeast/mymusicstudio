import React, { useState, useRef, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiCalendar, FiClock } from 'react-icons/fi'
import StudentCard from './StudentCard'

const FullCalendarView = ({
  students,
  daysOfWeek,
  onUpdateStudent,
  onClearStudent,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  userIsAdmin,
  formatTimeSlot,
  timeSlots,
  durationOptions,
  saving,
  getStudentsForDay,
  isStudentIncomplete,
  isStudentInClash,
  getStudentClashPartners,
  dragOverDay,
  calendarSettings,
  onStudentClick
}) => {
  const scrollContainerRef = useRef(null)
  const [draggedStudent, setDraggedStudent] = useState(null)
  const [dragOverTime, setDragOverTime] = useState(null)
  const [localDragOverDay, setLocalDragOverDay] = useState(null)

  // Generate time grid based on settings with configurable intervals for snapping
  const generateTimeGrid = () => {
    const { startHour, endHour, timeGridInterval } = calendarSettings
    const slots = []

    // Use the selected interval (15, 30, or 60 minutes)
    const interval = timeGridInterval || 30

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }

    return slots
  }

  const timeGrid = generateTimeGrid()

  // Convert time to pixels for positioning
  const timeToPixels = (timeString) => {
    if (!timeString) return 0

    const [hours, minutes] = timeString.split(':').map(Number)
    const totalMinutes = (hours - calendarSettings.startHour) * 60 + minutes

    // Calculate pixels based on the selected grid interval
    const pixelsPerInterval = 60 // 60px per interval
    const interval = calendarSettings.timeGridInterval || 30
    return (totalMinutes / interval) * pixelsPerInterval
  }

  // Convert duration to pixels for height
  const durationToPixels = (duration) => {
    if (!duration) return 60 // Default minimum height

    // Adjust pixel calculation based on the selected grid interval
    const interval = calendarSettings.timeGridInterval || 30
    const pixelsPerMinute = 60 / interval // 60px per interval
    return Math.max(60, duration * (pixelsPerMinute / 60))
  }

  // Convert pixels back to time for drop calculations
  const pixelsToTime = (pixels) => {
    const interval = calendarSettings.timeGridInterval || 30
    const totalMinutes = (pixels / 60) * interval
    const hour = Math.floor(totalMinutes / 60) + calendarSettings.startHour
    const minute = Math.floor((totalMinutes % 60) / interval) * interval
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Handle drag start for vertical dragging
  const handleVerticalDragStart = (e, student) => {
    if (!userIsAdmin) return
    setDraggedStudent(student)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '')
  }

  // Handle drag over for time slots
  const handleTimeDragOver = (e, day, timeIndex) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setLocalDragOverDay(day)
    setDragOverTime(timeIndex)
  }

  // Handle drop for time change
  const handleTimeDrop = async (e, day, timeIndex) => {
    e.preventDefault()
    setLocalDragOverDay(null)
    setDragOverTime(null)

    if (!draggedStudent || !userIsAdmin) return

    const newTime = timeGrid[timeIndex]

    // Don't do anything if dropping on the same time and day
    if (draggedStudent.lesson_day === day && draggedStudent.lesson_time === newTime) {
      setDraggedStudent(null)
      return
    }

    try {
      // Update both day and time if needed
      if (draggedStudent.lesson_day !== day) {
        await onUpdateStudent(draggedStudent.id, 'lesson_day', day)
      }

      if (draggedStudent.lesson_time !== newTime) {
        await onUpdateStudent(draggedStudent.id, 'lesson_time', newTime)
      }

      setDraggedStudent(null)
    } catch (error) {
      console.error('❌ Error moving student:', error)
      setDraggedStudent(null)
    }
  }

  // Calculate grid height based on the selected interval
  const calculateGridHeight = () => {
    const interval = calendarSettings.timeGridInterval || 30
    const hoursInDay = calendarSettings.endHour - calendarSettings.startHour + 1
    const slotsPerHour = 60 / interval
    const totalSlots = hoursInDay * slotsPerHour
    return totalSlots * 60 // 60px per slot
  }

  const gridHeight = calculateGridHeight()

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime, durationMin) => {
    if (!startTime || !durationMin) return null

    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMin
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  return (
    <div>
      {/* Calendar Container */}
      <div className="relative">
        {/* Sticky Day Headers - Fixed positioning */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="grid grid-cols-8">
            {/* Time column header */}
            <div className="p-4 text-center font-medium text-gray-500 bg-gray-50 border-r border-gray-200">
              <SafeIcon icon={FiClock} className="mx-auto text-gray-400" />
            </div>

            {/* Day headers */}
            {daysOfWeek.map(day => {
              const dayStudents = getStudentsForDay(day)
              const isDragOver = dragOverDay === day || localDragOverDay === day

              return (
                <div
                  key={day}
                  className={`p-4 text-center font-medium border-r border-gray-200 transition-all duration-200 ${
                    isDragOver ? 'bg-teal-100 text-teal-700' : 'bg-teal-50 text-teal-800'
                  }`}
                >
                  <div className="text-sm font-semibold">{day}</div>
                  <div className="text-xs text-teal-600 mt-1">
                    {dayStudents.length} lesson{dayStudents.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Scrollable Calendar Grid */}
        <div ref={scrollContainerRef} className="overflow-y-auto max-h-[600px] relative">
          <div className="grid grid-cols-8" style={{ height: `${gridHeight}px` }}>
            {/* Time Column - Fixed */}
            <div className="border-r border-gray-200 bg-gray-50 sticky left-0 z-20">
              {timeGrid.map((time, index) => (
                <div
                  key={time}
                  className="h-15 border-b border-gray-100 flex items-center justify-center text-xs text-gray-600 font-medium"
                  style={{ height: '60px' }}
                >
                  {formatTimeSlot(time)}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {daysOfWeek.map(day => {
              const dayStudents = getStudentsForDay(day)

              return (
                <div key={day} className="relative border-r border-gray-200">
                  {/* Time Grid Lines with Drop Zones */}
                  {timeGrid.map((time, timeIndex) => {
                    const isDragOverSlot = localDragOverDay === day && dragOverTime === timeIndex

                    return (
                      <div
                        key={time}
                        className={`absolute w-full border-b border-gray-100 transition-all duration-200 ${
                          isDragOverSlot ? 'bg-teal-100 border-teal-300' : ''
                        }`}
                        style={{ top: `${timeIndex * 60}px`, height: '60px' }}
                        onDragOver={e => handleTimeDragOver(e, day, timeIndex)}
                        onDrop={e => handleTimeDrop(e, day, timeIndex)}
                      />
                    )
                  })}

                  {/* Student Lesson Cards */}
                  {dayStudents.map(student => {
                    if (!student.lesson_time || !student.lesson_duration) return null

                    const topPosition = timeToPixels(student.lesson_time)
                    const height = durationToPixels(student.lesson_duration)
                    const isDragging = draggedStudent?.id === student.id
                    const endTime = calculateEndTime(student.lesson_time, student.lesson_duration)

                    // Add end time to student data for tooltip
                    const enhancedStudent = {
                      ...student,
                      lesson_time_end_formatted: endTime ? formatTimeSlot(endTime) : null
                    }

                    return (
                      <div
                        key={student.id}
                        className={`absolute left-1 right-1 z-10 transition-all duration-200 ${
                          isDragging ? 'opacity-50 scale-105' : ''
                        }`}
                        style={{ top: `${topPosition}px`, height: `${height}px` }}
                      >
                        <StudentCard
                          student={enhancedStudent}
                          onUpdateStudent={onUpdateStudent}
                          onClearStudent={onClearStudent}
                          onDragStart={handleVerticalDragStart}
                          onStudentClick={onStudentClick}
                          userIsAdmin={userIsAdmin}
                          formatTimeSlot={formatTimeSlot}
                          timeSlots={timeSlots}
                          durationOptions={durationOptions}
                          saving={saving === student.id}
                          isIncomplete={isStudentIncomplete(student)}
                          hasClash={isStudentInClash(student.id)}
                          clashPartners={getStudentClashPartners(student.id)}
                          isCalendarView={true}
                          showInlineEditing={false}
                          style={{ height: '100%', minHeight: '60px' }}
                        />
                      </div>
                    )
                  })}

                  {/* Drop Zone Indicator for Day Changes */}
                  {dragOverDay === day && !localDragOverDay && (
                    <div className="absolute inset-0 bg-teal-100 bg-opacity-50 border-2 border-dashed border-teal-400 rounded-lg flex items-center justify-center z-20">
                      <div className="text-teal-600 font-medium text-sm">Drop here</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-teal-50 border border-teal-200 rounded"></div>
              <span className="text-gray-600">Scheduled Lesson</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
              <span className="text-gray-600">Time Conflict</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-50 border border-amber-300 rounded"></div>
              <span className="text-gray-600">Incomplete Schedule</span>
            </div>
          </div>
          <div className="text-gray-500">
            {calendarSettings.timeGridInterval}-minute snap grid • Time range: {calendarSettings.startHour}:00 -{' '}
            {calendarSettings.endHour}:00
          </div>
        </div>
      </div>
    </div>
  )
}

export default FullCalendarView