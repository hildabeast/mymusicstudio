import React from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi'

const WeeklyTimetableView = ({ students, timeSlots, daysOfWeek, formatTimeSlot }) => {
  // Create a map of scheduled students by day and time
  const timetableMap = {}
  
  students.forEach(student => {
    if (student.lesson_day && student.lesson_time) {
      const key = `${student.lesson_day}-${student.lesson_time}`
      if (!timetableMap[key]) {
        timetableMap[key] = []
      }
      timetableMap[key].push(student)
    }
  })

  // Get students for a specific day and time
  const getStudentsForSlot = (day, time) => {
    const key = `${day}-${time}`
    return timetableMap[key] || []
  }

  // Generate time slots for display (every 30 minutes from 9 AM to 8 PM)
  const displayTimeSlots = timeSlots.filter(time => {
    const hour = parseInt(time.split(':')[0])
    return hour >= 9 && hour <= 20
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <SafeIcon icon={FiCalendar} className="text-teal-600 mr-2" />
          Weekly Timetable View
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Visual overview of your weekly lesson schedule
        </p>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header with days */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="p-3 text-center font-medium text-gray-500 text-sm">
                Time
              </div>
              {daysOfWeek.map(day => (
                <div key={day} className="p-3 text-center font-medium text-gray-700 bg-gray-50 rounded-lg">
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Time slots and lessons */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {displayTimeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 gap-2">
                  {/* Time column */}
                  <div className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-lg flex items-center justify-center">
                    <SafeIcon icon={FiClock} className="mr-1 text-gray-400" />
                    {formatTimeSlot(time)}
                  </div>

                  {/* Day columns */}
                  {daysOfWeek.map(day => {
                    const studentsInSlot = getStudentsForSlot(day, time)
                    
                    return (
                      <div key={`${day}-${time}`} className="min-h-[60px] border border-gray-200 rounded-lg p-2">
                        {studentsInSlot.length > 0 ? (
                          <div className="space-y-1">
                            {studentsInSlot.map(student => (
                              <div 
                                key={student.id}
                                className="bg-teal-50 border border-teal-200 rounded-lg p-2 text-xs"
                              >
                                <div className="flex items-center space-x-1">
                                  <SafeIcon icon={FiUser} className="text-teal-600" />
                                  <span className="font-medium text-teal-800 truncate">
                                    {student.name || 'Unnamed'}
                                  </span>
                                </div>
                                <div className="text-teal-600 mt-1 flex items-center space-x-1">
                                  <span className="capitalize">{student.instrument}</span>
                                  {student.lesson_duration && (
                                    <>
                                      <span>•</span>
                                      <span>{student.lesson_duration}min</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-300">
                            <span className="text-xs">—</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-teal-50 border border-teal-200 rounded"></div>
                <span>Scheduled Lesson</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border border-gray-200 rounded"></div>
                <span>Available Slot</span>
              </div>
            </div>
            <div className="text-gray-500">
              {Object.values(timetableMap).flat().length} lessons scheduled
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WeeklyTimetableView