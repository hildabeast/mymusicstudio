import React, { useState, useEffect } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiClock, FiCalendar, FiInfo, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '../../config/supabase';
import { useUser } from '../../contexts/UserContext';

const LessonTimeEditor = ({ studentId, studentName }) => {
  const { currentUserID, currentSchoolID } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [timeConflict, setTimeConflict] = useState(null);

  // Student lesson time data
  const [lessonTypeId, setLessonTypeId] = useState(null);
  const [lessonDay, setLessonDay] = useState(null);
  const [lessonTime, setLessonTime] = useState(null);
  const [lessonTimeEnd, setLessonTimeEnd] = useState(null);

  // Available lesson types
  const [lessonTypes, setLessonTypes] = useState([]);

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  useEffect(() => {
    if (currentSchoolID && studentId) {
      fetchStudentData();
      fetchLessonTypes();
    }
  }, [currentSchoolID, studentId]);

  useEffect(() => {
    // Check for time conflicts whenever lesson day or time changes
    if (lessonDay && lessonTime && lessonTimeEnd) {
      checkForTimeConflicts();
    } else {
      setTimeConflict(null);
    }
  }, [lessonDay, lessonTime, lessonTimeEnd]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching lesson time data for student:', studentId);

      const { data, error } = await supabase
        .from('students')
        .select('lesson_type_id, lesson_day, lesson_time, lesson_time_end')
        .eq('id', studentId)
        .single();

      if (error) {
        throw new Error(`Error fetching student data: ${error.message}`);
      }

      console.log('📚 Student lesson data:', data);
      setLessonTypeId(data.lesson_type_id || null);
      setLessonDay(data.lesson_day || null);
      setLessonTime(data.lesson_time || null);
      setLessonTimeEnd(data.lesson_time_end || null);
    } catch (error) {
      console.error('❌ Error fetching student lesson data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonTypes = async () => {
    try {
      console.log('🔍 Fetching lesson types for school:', currentSchoolID);

      const { data, error } = await supabase
        .from('lesson_types')
        .select('*')
        .eq('school_id', currentSchoolID)
        .order('name');

      if (error) {
        throw new Error(`Error fetching lesson types: ${error.message}`);
      }

      console.log('📚 Lesson types fetched:', data?.length || 0);
      setLessonTypes(data || []);
    } catch (error) {
      console.error('❌ Error fetching lesson types:', error);
      setError(error.message);
    }
  };

  const checkForTimeConflicts = async () => {
    try {
      if (!lessonDay || !lessonTime || !lessonTimeEnd) {
        setTimeConflict(null);
        return;
      }

      // Convert time strings to minutes since midnight for easier comparison
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const currentLessonStart = timeToMinutes(lessonTime);
      const currentLessonEnd = timeToMinutes(lessonTimeEnd);

      // Fetch other current students with the same lesson day
      const { data: otherStudents, error } = await supabase
        .from('students')
        .select('id, name, lesson_time, lesson_time_end')
        .eq('school_id', currentSchoolID)
        .eq('status', 'Current')
        .eq('lesson_day', lessonDay)
        .neq('id', studentId); // Exclude current student

      if (error) {
        console.error('Error checking for time conflicts:', error);
        return;
      }

      // Check for overlaps
      const conflictingStudents = otherStudents.filter(student => {
        if (!student.lesson_time || !student.lesson_time_end) return false;
        
        const otherStart = timeToMinutes(student.lesson_time);
        const otherEnd = timeToMinutes(student.lesson_time_end);
        
        // Check for overlap: start1 < end2 AND start2 < end1
        return currentLessonStart < otherEnd && otherStart < currentLessonEnd;
      });

      if (conflictingStudents.length > 0) {
        setTimeConflict({
          count: conflictingStudents.length,
          students: conflictingStudents.map(s => s.name).join(', ')
        });
      } else {
        setTimeConflict(null);
      }
    } catch (error) {
      console.error('Error checking for time conflicts:', error);
    }
  };

  const calculateLessonTimeEnd = (startTime, durationMin) => {
    if (!startTime || !durationMin) return null;

    try {
      // Parse the start time
      const [hours, minutes] = startTime.split(':').map(Number);

      // Calculate end time in minutes since midnight
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + durationMin;

      // Convert back to HH:MM format
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;

      // Format with leading zeros
      return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('❌ Error calculating lesson end time:', error);
      return null;
    }
  };

  const handleSave = async (field, value) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let updates = { [field]: value };

      // If updating lesson_type_id and we have a lesson_time,
      // recalculate and update the lesson_time_end
      if (field === 'lesson_type_id' && lessonTime) {
        const selectedLessonType = lessonTypes.find(lt => lt.id === value);
        if (selectedLessonType?.duration_min) {
          const newLessonTimeEnd = calculateLessonTimeEnd(lessonTime, selectedLessonType.duration_min);
          updates.lesson_time_end = newLessonTimeEnd;
          setLessonTimeEnd(newLessonTimeEnd);
        }
      }

      console.log('💾 Saving lesson time data:', updates);

      const { error } = await supabase
        .from('students')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);

      if (error) {
        throw new Error(`Error updating lesson time: ${error.message}`);
      }

      // Update local state
      if (field === 'lesson_type_id') {
        setLessonTypeId(value);
      } else if (field === 'lesson_day') {
        setLessonDay(value);
      }

      console.log('✅ Lesson time data saved successfully');
      setSuccess('Lesson time updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('❌ Error saving lesson time data:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTimeForDisplay = (time) => {
    if (!time) return '';

    // Check if already in 12-hour format
    if (time.includes('AM') || time.includes('PM')) return time;

    try {
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch (error) {
      return time; // Return original if parsing fails
    }
  };

  const navigateToTimetable = () => {
    // Change the active section in the app to timetable
    window.location.hash = '';
    setTimeout(() => {
      const sidebarButton = document.querySelector('button[aria-label="Timetable"]');
      if (sidebarButton) {
        sidebarButton.click();
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <SafeIcon icon={FiClock} className="text-blue-600 mr-2" />
            Lesson Time
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-full"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <SafeIcon icon={FiClock} className="text-blue-600 mr-2" />
          Lesson Time
        </h2>
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-1 flex items-center">
            <span className="text-sm text-green-700">{success}</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center">
            <SafeIcon icon={FiInfo} className="text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lesson Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lesson Type
          </label>
          <select
            value={lessonTypeId || ''}
            onChange={(e) => handleSave('lesson_type_id', e.target.value ? e.target.value : null)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            disabled={saving}
          >
            <option value="">Select lesson type</option>
            {lessonTypes.map((lessonType) => (
              <option key={lessonType.id} value={lessonType.id}>
                {lessonType.name} ({lessonType.duration_min} min)
              </option>
            ))}
          </select>
          {lessonTypes.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              No lesson types available. Please add lesson types in School Settings.
            </p>
          )}
        </div>

        {/* Lesson Day Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
            <SafeIcon icon={FiCalendar} className="text-gray-400 mr-1" />
            Lesson Day
          </label>
          <select
            value={lessonDay || ''}
            onChange={(e) => handleSave('lesson_day', e.target.value ? e.target.value : null)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            disabled={saving}
          >
            <option value="">Select day</option>
            {daysOfWeek.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lesson Time Display (read-only) */}
      <div className={`mt-5 rounded-xl p-4 ${timeConflict ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
          <SafeIcon icon={FiClock} className="text-gray-400 mr-1" />
          Lesson Time
        </label>
        {lessonTime ? (
          <div className="text-gray-800">
            <div className="font-medium flex items-center">
              {formatTimeForDisplay(lessonTime)}
              {lessonTimeEnd && (
                <>
                  {' - '}
                  {formatTimeForDisplay(lessonTimeEnd)}
                </>
              )}
              
              {timeConflict && (
                <div className="ml-2 text-amber-600">
                  <SafeIcon icon={FiAlertTriangle} className="inline text-amber-500" title="Time conflict" />
                </div>
              )}
            </div>
            
            {lessonTypeId && (
              <div className="text-sm text-gray-600 mt-1">
                {lessonTypes.find(lt => lt.id === lessonTypeId)?.duration_min || ''} minutes
                {lessonTypes.find(lt => lt.id === lessonTypeId)?.name && (
                  <>
                    {' • '}
                    {lessonTypes.find(lt => lt.id === lessonTypeId).name}
                  </>
                )}
              </div>
            )}
            
            {timeConflict && (
              <div className="mt-2 text-sm text-amber-700 flex items-start">
                <SafeIcon icon={FiAlertTriangle} className="text-amber-500 mr-1 mt-0.5 flex-shrink-0" />
                <div>
                  This lesson time overlaps with {timeConflict.count} other student{timeConflict.count !== 1 ? 's' : ''} 
                  {timeConflict.count <= 3 && (
                    <span className="font-medium"> ({timeConflict.students})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center">
            <span className="text-gray-600 mr-1">Lesson time not set — set in</span>
            <button
              onClick={navigateToTimetable}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Timetable
            </button>
          </div>
        )}
      </div>

      {/* Info Text */}
      <div className="mt-4 text-sm text-gray-500 flex items-start">
        <SafeIcon icon={FiInfo} className="text-gray-400 mr-1 mt-0.5" />
        <span>Detailed lesson scheduling is managed in the Timetable section.</span>
      </div>
    </div>
  );
};

export default LessonTimeEditor;