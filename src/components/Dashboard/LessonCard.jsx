import React from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiClock, FiUser, FiFileText, FiLoader } from 'react-icons/fi'
import { format } from 'date-fns'

const LessonCard = ({ lesson, isLoading }) => {
  const lessonDate = new Date(lesson.scheduled_time)
  const isToday = format(lessonDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border transition-all duration-200 hover:shadow-md cursor-pointer ${isToday ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiUser} className="text-gray-500" />
          <span className="font-semibold text-gray-800">{lesson.student_name}</span>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-medium ${isToday ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
          {isToday ? 'Today' : format(lessonDate, 'EEEE, MMM d')}
        </div>
      </div>
      <div className="flex items-center space-x-4 text-sm text-gray-600">
        <div className="flex items-center space-x-1">
          <SafeIcon icon={FiClock} className="text-xs" />
          <span>{format(lessonDate, 'h:mm a')}</span>
        </div>
        <span className="capitalize">{lesson.instrument}</span>
        <span>{lesson.duration_min} min</span>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-end">
        {isLoading ? (
          <div className="text-xs text-blue-600 flex items-center space-x-1">
            <SafeIcon icon={FiLoader} className="animate-spin" />
            <span>Opening...</span>
          </div>
        ) : (
          <div className="text-xs text-blue-600 flex items-center space-x-1">
            <SafeIcon icon={FiFileText} />
            <span>View/Edit Notes</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default LessonCard