import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiChevronRight, FiUser, FiShield } from 'react-icons/fi'

const SchoolSelector = ({ availableSchools, onSelectSchool }) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedSchoolId) {
      onSelectSchool(selectedSchoolId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-auto h-auto mx-auto mb-6">
            <img 
              src="https://vdjxrusqywiraonfwujq.supabase.co/storage/v1/object/public/mmsmedia/icons/MyMusicStudioLogo.png" 
              alt="My Music Studio Logo" 
              className="max-w-[250px] h-auto mx-auto object-contain"
              onError={(e) => {
                // Fallback to gradient background with icon if image fails to load
                e.target.onerror = null;
                e.target.parentElement.className = "w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4";
                e.target.remove();
                const iconDiv = document.createElement('div');
                iconDiv.innerHTML = '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="text-white text-2xl" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
                e.target.parentElement.appendChild(iconDiv);
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Select Your School</h1>
          <p className="text-gray-600 mt-2">Choose which school you'd like to access</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Available Schools
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {availableSchools.map((school) => (
                <label
                  key={school.schoolId}
                  className={`block w-full p-4 border rounded-xl cursor-pointer transition-all duration-200 ${
                    selectedSchoolId === school.schoolId
                      ? 'border-orange-400 bg-orange-50 shadow-md'
                      : 'border-gray-200 hover:border-orange-200 hover:bg-orange-25'
                  }`}
                >
                  <input
                    type="radio"
                    name="school"
                    value={school.schoolId}
                    checked={selectedSchoolId === school.schoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl flex items-center justify-center">
                        <SafeIcon icon={FiUser} className="text-white text-lg" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{school.schoolName}</div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <SafeIcon icon={FiUser} className="text-xs" />
                          <span>Teacher</span>
                          {school.isAdmin && (
                            <>
                              <span>•</span>
                              <SafeIcon icon={FiShield} className="text-xs text-amber-600" />
                              <span className="text-amber-600">Admin</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <SafeIcon
                      icon={FiChevronRight}
                      className={`text-gray-400 transition-colors ${
                        selectedSchoolId === school.schoolId ? 'text-orange-500' : ''
                      }`}
                    />
                  </div>
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={!selectedSchoolId}
              className="w-full bg-gradient-to-r from-orange-400 to-red-400 text-white py-3 rounded-xl font-medium hover:from-orange-500 hover:to-red-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              Access School Dashboard
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't see your school? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SchoolSelector