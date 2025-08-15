import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiUsers, FiCalendar, FiTrendingUp, FiHome, FiShield, FiRefreshCw, FiDollarSign } from 'react-icons/fi'
import { supabase } from '../../config/supabase'
import { useUser } from '../../contexts/UserContext'
import StudentCard from './StudentCard'
import LessonCard from './LessonCard'
import { addDays, format } from 'date-fns'
import { handleLessonClick } from '../../utils/lessonNotes'

const Dashboard = () => {
  const { currentUserID, currentSchoolID, userIsAdmin, user, availableSchools, selectSchool } = useUser()
  const [students, setStudents] = useState([])
  const [upcomingLessons, setUpcomingLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [schoolInfo, setSchoolInfo] = useState(null)
  const [stats, setStats] = useState({ totalStudents: 0, lessonsThisWeek: 0, completionRate: 0 })
  const [showSchoolSelector, setShowSchoolSelector] = useState(false)
  const [noteActionLoading, setNoteActionLoading] = useState(null)

  useEffect(() => {
    if (currentUserID && currentSchoolID) {
      fetchDashboardData()
    }
  }, [currentUserID, currentSchoolID])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      // Fetch school information
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('id', currentSchoolID)
        .single()

      if (schoolError) {
        console.error('Error fetching school data:', schoolError)
      } else {
        setSchoolInfo(schoolData)
      }

      // Fetch students using the correct teacher_id
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', currentUserID)
        .order('name')

      if (studentsError) throw studentsError

      // Fetch upcoming lessons (next 7 days)
      const today = new Date()
      const nextWeek = addDays(today, 7)
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          students (
            name,
            instrument
          )
        `)
        .eq('teacher_id', currentUserID)
        .gte('scheduled_time', today.toISOString())
        .lte('scheduled_time', nextWeek.toISOString())
        .order('scheduled_time')

      if (lessonsError) throw lessonsError

      // Format lessons data
      const formattedLessons = lessonsData.map(lesson => ({
        ...lesson,
        student_name: lesson.students?.name || 'Unknown Student',
        instrument: lesson.students?.instrument || 'Unknown',
      }))

      setStudents(studentsData || [])
      setUpcomingLessons(formattedLessons || [])

      // Calculate stats
      setStats({
        totalStudents: studentsData?.length || 0,
        lessonsThisWeek: formattedLessons?.length || 0,
        completionRate: 95 // This would be calculated based on actual attendance data
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeSchool = () => {
    if (availableSchools.length > 1) {
      // Use the existing school selection modal
      setShowSchoolSelector(true)
    }
  }

  // Direct navigation to lesson notes
  const onLessonClick = async (lessonId) => {
    setNoteActionLoading(lessonId);
    await handleLessonClick(lessonId, (errorMsg) => {
      console.error('Error opening lesson notes:', errorMsg);
    });
    setNoteActionLoading(null);
  }
  
  // Function to open billing page
  const openBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error("No active session. Please log in first.");
        return;
      }

      const baseUrl = window.location.hostname.includes("netlify")
        ? "https://storied-raindrop-ae90ba.netlify.app"
        : "https://billing.mymusicstudio.app";

      const url = new URL(baseUrl);
      url.searchParams.set("access_token", session.access_token);
      url.searchParams.set("refresh_token", session.refresh_token);

      window.open(url.toString(), "_blank", "noopener");
    } catch (error) {
      console.error("Error opening billing:", error);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Welcome Header with School Context */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back!</h1>
            <p className="text-gray-600">Here's what's happening in your music studio today.</p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-orange-600 mb-1">
              <SafeIcon icon={FiHome} className="text-lg" />
              <span className="font-semibold">{schoolInfo?.name || 'Your School'}</span>
              {/* Change school button - only show if teacher has multiple schools */}
              {availableSchools?.length > 1 && (
                <button
                  onClick={handleChangeSchool}
                  className="ml-2 px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <SafeIcon icon={FiRefreshCw} className="text-xs" />
                  <span>Change school</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{user?.email}</span>
              {userIsAdmin && (
                <>
                  <span>•</span>
                  <SafeIcon icon={FiShield} className="text-amber-600" />
                  <span className="text-amber-600">Admin</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Total Students</p>
              <p className="text-3xl font-bold">{stats.totalStudents}</p>
            </div>
            <SafeIcon icon={FiUsers} className="text-2xl text-teal-100" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Lessons This Week</p>
              <p className="text-3xl font-bold">{stats.lessonsThisWeek}</p>
            </div>
            <SafeIcon icon={FiCalendar} className="text-2xl text-orange-100" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Completion Rate</p>
              <p className="text-3xl font-bold">{stats.completionRate}%</p>
            </div>
            <SafeIcon icon={FiTrendingUp} className="text-2xl text-amber-100" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Students */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Current Students</h2>
          {students.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiUsers} className="text-gray-300 text-3xl mb-2 mx-auto" />
              <p className="text-gray-500">No students yet</p>
            </div>
          )}
        </div>

        {/* Upcoming Lessons */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upcoming Lessons (Next 7 Days)</h2>
          {upcomingLessons.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {upcomingLessons.map((lesson) => (
                <div key={lesson.id} onClick={() => onLessonClick(lesson.id)}>
                  <LessonCard lesson={lesson} isLoading={noteActionLoading === lesson.id} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <SafeIcon icon={FiCalendar} className="text-gray-300 text-3xl mb-2 mx-auto" />
              <p className="text-gray-500">No upcoming lessons</p>
            </div>
          )}
        </div>
      </div>

      {/* Billing Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <SafeIcon icon={FiDollarSign} className="text-green-600 mr-2" />
            Billing
          </h2>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-600">
            Manage invoices, payment methods, and billing settings for your studio.
          </p>
          <button
            onClick={openBilling}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center space-x-2"
          >
            <SafeIcon icon={FiDollarSign} />
            <span>Open Billing</span>
          </button>
        </div>
      </div>

      {/* School Selector Modal - Reuse the SchoolSelector component */}
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
                      ? 'border-orange-400 bg-orange-50 shadow-md'
                      : 'border-gray-200 hover:border-orange-200 hover:bg-orange-50'
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
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Current
                    </span>
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

export default Dashboard