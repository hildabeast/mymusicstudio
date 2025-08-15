import React, { useState, useEffect } from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiX, FiClock, FiUser, FiFileText, FiCheck, FiLoader } from 'react-icons/fi'
import { format } from 'date-fns'
import { supabase } from '../../config/supabase'
import { handleLessonClick } from '../../utils/lessonNotes'

const LessonDetailPanel = ({ lesson, onClose }) => {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [openingNotes, setOpeningNotes] = useState(false)

  useEffect(() => {
    if (lesson) {
      fetchLessonNotes()
    }
  }, [lesson])

  const fetchLessonNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lesson_notes')
        .select('*')
        .eq('lesson_id', lesson.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error fetching lesson notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const openNotesEditor = async () => {
    setOpeningNotes(true);
    try {
      await handleLessonClick(lesson.id);
    } catch (error) {
      console.error('Error opening notes editor:', error);
    } finally {
      setOpeningNotes(false);
    }
  };

  if (!lesson) return null

  const lessonDate = new Date(lesson.scheduled_time)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lesson Details</h2>
                <p className="text-gray-600 mt-1">{lesson.student_name} • {lesson.instrument}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <SafeIcon icon={FiX} className="text-xl text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-teal-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <SafeIcon icon={FiClock} className="text-teal-600" />
                  <span className="font-medium text-teal-800">Date & Time</span>
                </div>
                <p className="text-gray-700">{format(lessonDate, 'EEEE, MMMM d, yyyy')}</p>
                <p className="text-gray-700">{format(lessonDate, 'h:mm a')} ({lesson.duration_min} min)</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <SafeIcon icon={FiUser} className="text-orange-600" />
                  <span className="font-medium text-orange-800">Student</span>
                </div>
                <p className="text-gray-700">{lesson.student_name}</p>
                <p className="text-gray-600 capitalize">{lesson.instrument}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiFileText} className="text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Lesson Notes</h3>
                </div>
                <button 
                  onClick={openNotesEditor}
                  disabled={openingNotes}
                  className="px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors flex items-center space-x-2"
                >
                  {openingNotes ? (
                    <>
                      <SafeIcon icon={FiLoader} className="animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <SafeIcon icon={FiFileText} />
                      <span>{notes.length > 0 ? 'Edit Notes' : 'Create Notes'}</span>
                    </>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <p className="text-gray-500">Loading notes...</p>
                </div>
              ) : notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${note.shared ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {note.shared ? 'Shared with student/parent' : 'Private note'}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-800">
                        {typeof note.notes === 'string' ? (
                          <p className="whitespace-pre-wrap">{note.notes}</p>
                        ) : (
                          <p className="text-gray-500 italic">Rich content note</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <p className="text-gray-500">No notes for this lesson yet.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiCheck} className="text-green-500" />
                <span className="text-green-700 font-medium">Attendance: Present</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LessonDetailPanel