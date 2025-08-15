import React, { useState } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiUser, FiShield, FiMail, FiHome, FiDatabase, FiClock, FiSettings, FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { useUser } from '../../contexts/UserContext'
import { format } from 'date-fns'
import LessonTypesManager from '../SchoolSettings/LessonTypesManager'

const ProfilePage = ({ onBack }) => {
  const { user, currentUserID, currentSchoolID, userIsAdmin, availableSchools, selectSchool, debugInfo } = useUser()
  const [activeTab, setActiveTab] = useState('profile')
  const [showSchoolSelector, setShowSchoolSelector] = useState(false)

  const handleChangeSchool = () => {
    if (availableSchools.length > 1) {
      setShowSchoolSelector(true)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Profile</h1>
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors mt-2">
          <SafeIcon icon={FiArrowLeft} className="text-sm" />
          <span className="text-sm font-medium">Return to Dashboard</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'profile'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <SafeIcon icon={FiUser} className="text-sm" />
          <span className="font-medium">Profile</span>
        </button>
        {userIsAdmin && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <SafeIcon icon={FiSettings} className="text-sm" />
            <span className="font-medium">School Settings</span>
          </button>
        )}
      </div>

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiUser} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">User Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email Address</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <SafeIcon icon={FiMail} className="text-gray-400" />
                  <p className="text-gray-800">{user?.email || 'Not available'}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <SafeIcon
                    icon={userIsAdmin ? FiShield : FiUser}
                    className={userIsAdmin ? "text-amber-500" : "text-gray-400"}
                  />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    userIsAdmin
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {userIsAdmin ? 'Administrator' : 'Teacher'}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Member Since</h3>
                <p className="text-gray-800 mt-1">
                  {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'Not available'}
                </p>
              </div>
            </div>
          </div>

          {/* School Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiHome} className="text-teal-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">School Information</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Current School</h3>
                  <p className="text-gray-800 mt-1">
                    {availableSchools?.find(s => s.schoolId === currentSchoolID)?.schoolName || 'Not available'}
                  </p>
                </div>
                {/* Change School Button */}
                {availableSchools?.length > 1 && (
                  <button
                    onClick={handleChangeSchool}
                    className="px-3 py-1.5 text-sm bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <SafeIcon icon={FiRefreshCw} className="text-sm" />
                    <span>Change school</span>
                  </button>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">School ID</h3>
                <p className="text-gray-800 mt-1 font-mono text-sm">{currentSchoolID || 'Not available'}</p>
              </div>
              {availableSchools && availableSchools.length > 1 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Available Schools</h3>
                  <div className="mt-2 space-y-2">
                    {availableSchools.map((school) => (
                      <div key={school.schoolId} className="flex items-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          school.schoolId === currentSchoolID ? 'bg-teal-500' : 'bg-gray-300'
                        }`}></div>
                        <span className={school.schoolId === currentSchoolID ? 'font-medium' : ''}>
                          {school.schoolName}
                        </span>
                        {school.isAdmin && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Admin</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiDatabase} className="text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">System Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Internal User ID</h3>
                <p className="text-gray-800 mt-1 font-mono text-sm">{currentUserID || 'Not available'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Authentication User ID</h3>
                <p className="text-gray-800 mt-1 font-mono text-sm break-all">{user?.id || 'Not available'}</p>
              </div>
              {debugInfo && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Last Query</h3>
                  <div className="mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiClock} className="text-gray-400" />
                      <span>{format(new Date(debugInfo.timestamp), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                    <p className="mt-1">Records found: {debugInfo.recordCount}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiShield} className="text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Permissions</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">View Students</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">View Lessons</span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Create/Edit Students</span>
                <div className={`w-2 h-2 rounded-full ${userIsAdmin ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Manage Parents</span>
                <div className={`w-2 h-2 rounded-full ${userIsAdmin ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">System Administration</span>
                <div className={`w-2 h-2 rounded-full ${userIsAdmin ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
            </div>
            {!userIsAdmin && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> You have read-only access. Contact your administrator for additional permissions.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // School Settings Tab (only visible to admins)
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiClock} className="text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Lesson Types</h2>
                <p className="text-gray-600 text-sm">Manage lesson types, durations, and pricing</p>
              </div>
            </div>
            <LessonTypesManager />
          </div>

          {/* School Info Section - Placeholder for future expansion */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiSettings} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">General Settings</h2>
                <p className="text-gray-600 text-sm">School information and preferences</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center">
                <SafeIcon icon={FiDatabase} className="text-blue-500 mr-2" />
                <p className="text-blue-700 text-sm">
                  Additional school settings will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Information (if available) */}
      {debugInfo && activeTab === 'profile' && (
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Debug Information</h3>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Raw System Data (Click to expand)
            </summary>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs text-gray-600">
              {JSON.stringify({
                authUser: {
                  id: user?.id,
                  email: user?.email,
                  created_at: user?.created_at
                },
                context: {
                  currentUserID,
                  currentSchoolID,
                  userIsAdmin
                },
                debugInfo
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* School Selector Modal */}
      {showSchoolSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Change School</h2>
            <p className="text-gray-600 mb-6">Select which school you'd like to access</p>
            <div className="space-y-3">
              {availableSchools.map((school) => (
                <button
                  key={school.schoolId}
                  onClick={() => {
                    selectSchool(school.schoolId);
                    setShowSchoolSelector(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 border rounded-xl transition-all duration-200 ${
                    school.schoolId === currentSchoolID
                      ? 'border-teal-400 bg-teal-50 shadow-md'
                      : 'border-gray-200 hover:border-teal-200 hover:bg-teal-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl flex items-center justify-center">
                      <SafeIcon icon={FiHome} className="text-white text-lg" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{school.schoolName}</div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
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
                  {school.schoolId === currentSchoolID && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Current</span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSchoolSelector(false)}
              className="w-full mt-6 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage