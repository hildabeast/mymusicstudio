import React from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiMusic } from 'react-icons/fi'

const StudentCard = ({ student }) => {
  // Function to navigate to student detail page when clicked
  const handleStudentClick = () => {
    window.location.hash = `#view-student-${student.id}`;
  }

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleStudentClick}
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl flex items-center justify-center">
          <SafeIcon icon={FiMusic} className="text-white text-lg" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 hover:text-teal-600 transition-colors">{student.name}</h3>
          <p className="text-sm text-gray-600 capitalize">{student.instrument}</p>
        </div>
      </div>
    </div>
  )
}

export default StudentCard