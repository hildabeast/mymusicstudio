import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiClock, FiEdit2, FiSave, FiInfo, FiAlertTriangle, FiAlertCircle, FiX } from 'react-icons/fi'

const StudentCard = ({
  student,
  onUpdateStudent,
  onClearStudent,
  onDragStart,
  onStudentClick,
  userIsAdmin,
  formatTimeSlot,
  timeSlots,
  durationOptions,
  saving,
  isIncomplete = false,
  hasClash = false,
  clashPartners = [],
  isCalendarView = false,
  showInlineEditing = true,
  style = {}
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [showClearButton, setShowClearButton] = useState(false)
  const [showClearTooltip, setShowClearTooltip] = useState(false)
  const [showEditIcon, setShowEditIcon] = useState(false)

  const handleClear = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onClearStudent && userIsAdmin) {
      onClearStudent(student.id)
    }
  }

  const handleEditClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (onStudentClick && userIsAdmin) {
      onStudentClick(student, e.currentTarget.closest('.student-card'))
    }
  }

  const handleDragStart = (e) => {
    if (onDragStart && userIsAdmin) {
      onDragStart(e, student)
    }
  }

  // Prevent drag when clicking on buttons
  const handleButtonMouseDown = (e) => {
    e.stopPropagation()
  }

  // Determine card styling based on status
  const getCardStyling = () => {
    if (hasClash) {
      return 'bg-red-50 border-2 border-red-300 hover:bg-red-100'
    } else if (isIncomplete) {
      return 'bg-amber-50 border-2 border-amber-300 hover:bg-amber-100'
    } else {
      return 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
    }
  }

  const getTooltipContent = () => {
    if (hasClash) {
      return {
        icon: FiAlertTriangle,
        iconColor: 'text-red-500',
        title: 'Time Conflict!',
        content: `Lesson time overlaps with other students. Check schedule conflicts.`
      }
    } else if (isIncomplete) {
      const missing = []
      if (!student.lesson_time) missing.push('time')
      if (!student.lesson_duration) missing.push('duration')
      return {
        icon: FiAlertCircle,
        iconColor: 'text-amber-500',
        title: 'Incomplete Schedule',
        content: `Missing: ${missing.join(', ')}`
      }
    } else if (student.instrument) {
      // Enhanced tooltip content for calendar view - simplified to show just instrument and duration
      if (isCalendarView) {
        return {
          icon: FiInfo,
          iconColor: 'text-blue-400',
          title: '',
          content: `${student.instrument}, ${student.lesson_duration} mins`
        }
      }
      return {
        icon: FiInfo,
        iconColor: 'text-blue-400',
        title: '',
        content: student.instrument
      }
    }
    return null
  }

  // Modified tooltip positioning for calendar view - always to the right
  const getTooltipPosition = () => {
    if (isCalendarView) {
      return 'right-0 top-1/2 transform translate-x-full -translate-y-1/2 ml-2'
    }
    return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
  }

  // Modified arrow positioning for calendar view
  const getArrowPosition = () => {
    if (isCalendarView) {
      return 'absolute top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2 rotate-90'
    }
    return 'absolute top-full left-1/2 transform -translate-x-1/2'
  }

  return (
    <div
      className={`student-card group relative rounded-lg p-2 transition-all duration-200 select-none ${
        userIsAdmin && onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${getCardStyling()} ${isCalendarView ? 'min-h-0' : ''}`}
      style={style}
      draggable={userIsAdmin && !saving && onDragStart}
      onDragStart={handleDragStart}
      onMouseEnter={() => {
        setShowTooltip(true)
        setShowClearButton(true)
        setShowEditIcon(true)
      }}
      onMouseLeave={() => {
        setShowTooltip(false)
        setShowClearButton(false)
        setShowEditIcon(false)
        setShowClearTooltip(false)
      }}
    >
      {/* Status Indicators */}
      {(hasClash || isIncomplete) && (
        <div className="absolute -top-1 -right-1 z-10">
          {hasClash && (
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiAlertTriangle} className="text-white text-xs" />
            </div>
          )}
          {!hasClash && isIncomplete && (
            <div className="w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiAlertCircle} className="text-white text-xs" />
            </div>
          )}
        </div>
      )}

      {/* Clear Button with Tooltip */}
      {showClearButton && userIsAdmin && onClearStudent && (
        <button
          onClick={handleClear}
          onMouseDown={handleButtonMouseDown}
          onMouseEnter={() => setShowClearTooltip(true)}
          onMouseLeave={() => setShowClearTooltip(false)}
          className="absolute -top-1 -left-1 z-30 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="Remove from timetable"
          aria-label="Remove from timetable"
        >
          <SafeIcon icon={FiX} className="text-xs" />
          <span className="sr-only">Remove from timetable</span>
          {/* Tooltip - Only shows when button is directly hovered */}
          {showClearTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-40 whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none">
              Remove from timetable
            </div>
          )}
        </button>
      )}

      {/* Edit Button - Only show on hover and only trigger modal */}
      {showEditIcon && userIsAdmin && onStudentClick && (
        <button
          onClick={handleEditClick}
          onMouseDown={handleButtonMouseDown}
          className="absolute -top-1 -right-1 z-30 w-5 h-5 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
          title="Edit lesson details"
        >
          <SafeIcon icon={FiEdit2} className="text-xs" />
        </button>
      )}

      {/* Student Info - Simplified for Calendar View */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex-1 min-w-0">
          {/* Student name first for Calendar View */}
          <div className="font-medium text-gray-800 truncate">
            {student.name || 'Unnamed Student'}
          </div>

          {/* Calendar view shows only time on second line */}
          {isCalendarView && (
            <div className="text-xs text-gray-600 truncate">
              {student.lesson_time && formatTimeSlot(student.lesson_time)}
              {student.lesson_time && student.lesson_time_end_formatted && '–'}
              {student.lesson_time_end_formatted && student.lesson_time_end_formatted}
            </div>
          )}

          {/* Standard view shows more details */}
          {!isCalendarView && (
            <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1 truncate">
              {/* Time Display */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <span className={`${!student.lesson_time ? 'text-gray-400 italic' : 'text-gray-700 font-medium'}`}>
                  {formatTimeSlot(student.lesson_time)}
                </span>
              </div>
              <span className="text-gray-400 flex-shrink-0">•</span>
              {/* Duration Display - Without "min" */}
              <div className="flex items-center space-x-1 flex-shrink-0">
                <span className={`${!student.lesson_duration ? 'text-gray-400 italic' : 'text-gray-700 font-medium'}`}>
                  {student.lesson_duration ? `${student.lesson_duration}` : 'No duration'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Saving Indicator */}
        {saving && (
          <div className="flex items-center space-x-1 text-teal-600">
            <SafeIcon icon={FiSave} className="animate-pulse text-xs" />
          </div>
        )}
      </div>

      {/* Enhanced Hover Tooltip with different positioning for calendar view */}
      {showTooltip && getTooltipContent() && (
        <div className={`absolute z-40 ${getTooltipPosition()}`}>
          <div
            className={`text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg ${
              hasClash ? 'bg-red-600' : isIncomplete ? 'bg-amber-600' : 'bg-gray-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              <SafeIcon icon={getTooltipContent().icon} className={getTooltipContent().iconColor} />
              <div>
                {getTooltipContent().title && (
                  <div className="font-medium">{getTooltipContent().title}</div>
                )}
                <div className="text-xs opacity-90">{getTooltipContent().content}</div>
              </div>
            </div>
            {/* Arrow */}
            <div
              className={`w-2 h-2 rotate-45 ${
                hasClash ? 'bg-red-600' : isIncomplete ? 'bg-amber-600' : 'bg-gray-800'
              } ${getArrowPosition()}`}
            ></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentCard