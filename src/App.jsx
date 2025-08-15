import React from 'react'
import { UserProvider, useUser } from './contexts/UserContext'
import AuthForm from './components/Auth/AuthForm'
import SchoolSelector from './components/Auth/SchoolSelector'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './components/Dashboard/Dashboard'
import StudentManagement from './components/Students/StudentManagement'
import StudentEditor from './components/Students/StudentEditor'
import StudentDetail from './components/Students/StudentDetail'
import TimetablePage from './components/Timetable/TimetablePage'
import LessonsPage from './components/Lessons/LessonsPage'
import CalendarPage from './components/Calendar/CalendarPage'
import ProfilePage from './components/Profile/ProfilePage'
import './App.css'

function AppContent() {
  const { user, loading, needsSchoolSelection, availableSchools, selectSchool, signOut, currentUserID, currentSchoolID } = useUser()
  const [activeSection, setActiveSection] = React.useState('dashboard')
  const [editingStudentId, setEditingStudentId] = React.useState(null)
  const [viewingStudentId, setViewingStudentId] = React.useState(null)
  const [showProfile, setShowProfile] = React.useState(false)

  // Handle URL hash changes for student editing
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith('#edit-student-')) {
        // Extract student ID and remove any query parameters
        const hashWithoutQuery = hash.split('?')[0]
        const studentId = hashWithoutQuery.replace('#edit-student-', '')
        console.log('🔧 Editing student ID extracted:', studentId)
        setEditingStudentId(studentId)
        setViewingStudentId(null)
        setShowProfile(false)
        setActiveSection('students')
      } else if (hash.startsWith('#view-student-')) {
        // Extract student ID and remove any query parameters
        const hashWithoutQuery = hash.split('?')[0]
        const studentId = hashWithoutQuery.replace('#view-student-', '')
        console.log('👁️ Viewing student ID extracted:', studentId)
        setViewingStudentId(studentId)
        setEditingStudentId(null)
        setShowProfile(false)
        setActiveSection('students')
      } else if (hash === '#profile') {
        setShowProfile(true)
        setEditingStudentId(null)
        setViewingStudentId(null)
        // Don't change activeSection when showing profile
      } else {
        setEditingStudentId(null)
        setViewingStudentId(null)
        setShowProfile(false)
      }
    }

    // Check initial hash
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Debug logging for app state
  React.useEffect(() => {
    console.log('🎯 App State Update:', {
      hasUser: !!user,
      loading,
      needsSchoolSelection,
      currentUserID,
      currentSchoolID,
      availableSchoolsCount: availableSchools?.length || 0,
      editingStudentId,
      viewingStudentId,
      showProfile,
      activeSection
    })
  }, [
    user,
    loading,
    needsSchoolSelection,
    currentUserID,
    currentSchoolID,
    availableSchools,
    editingStudentId,
    viewingStudentId,
    showProfile,
    activeSection
  ])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your music studio...</p>
        </div>
      </div>
    )
  }

  // Show auth form if no user
  if (!user) {
    console.log('🔐 Showing auth form - no user')
    return <AuthForm onAuthSuccess={() => {}} />
  }

  // Show school selector if user needs to select school
  if (needsSchoolSelection) {
    console.log('🏫 Showing school selector - multiple schools available')
    return <SchoolSelector availableSchools={availableSchools} onSelectSchool={selectSchool} />
  }

  // Show main app if user is authenticated and school is selected
  if (user && currentUserID && currentSchoolID) {
    console.log('✅ Showing main app - user fully authenticated')

    const handleBackToStudents = () => {
      setEditingStudentId(null)
      setViewingStudentId(null)
      window.location.hash = ''
    }

    const handleBackToDashboard = () => {
      setShowProfile(false)
      // Keep the original activeSection when returning from profile
      window.location.hash = ''
    }

    const showProfilePage = () => {
      window.location.hash = '#profile'
    }

    // Handle navigation from sidebar - FIX FOR NAVIGATION BUG
    const handleSectionChange = (section) => {
      // Always update the activeSection immediately
      setActiveSection(section)

      // Clear special states when changing sections
      if (showProfile || editingStudentId || viewingStudentId) {
        setShowProfile(false)
        setEditingStudentId(null)
        setViewingStudentId(null)
        window.location.hash = ''
      }
    }

    const renderContent = () => {
      // If showing profile, show the profile page
      if (showProfile) {
        return <ProfilePage onBack={handleBackToDashboard} />
      }

      // If editing a student, show the editor
      if (editingStudentId) {
        return <StudentEditor studentId={editingStudentId} onBack={handleBackToStudents} />
      }

      // If viewing a student, show the detail view
      if (viewingStudentId) {
        return <StudentDetail studentId={viewingStudentId} onBack={handleBackToStudents} />
      }

      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />
        case 'students':
          return <StudentManagement />
        case 'timetable':
          return <TimetablePage />
        case 'lessons':
          return <LessonsPage />
        case 'calendar':
          return <CalendarPage />
        default:
          return <Dashboard />
      }
    }

    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <div className="flex-1 transition-all duration-300">
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {!editingStudentId && !viewingStudentId && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 capitalize">
                      {showProfile ? 'Profile' : activeSection}
                    </h2>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={showProfilePage}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={signOut}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
          <main className="flex-1">{renderContent()}</main>
        </div>
      </div>
    )
  }

  // Fallback state - something went wrong
  console.log('⚠️ Fallback state - incomplete authentication')
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Authentication Issue</h2>
        <p className="text-gray-600 mb-4">
          We're having trouble setting up your account. Please try signing out and back in.
        </p>
        <div className="text-left bg-gray-100 p-3 rounded-lg text-xs text-gray-700 mb-4">
          <div>
            <strong>Current User ID:</strong> {currentUserID || 'Not set'}
          </div>
          <div>
            <strong>Current School ID:</strong> {currentSchoolID || 'Not set'}
          </div>
        </div>
        <button
          onClick={signOut}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Sign Out & Retry
        </button>
      </div>
    </div>
  )
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}

export default App