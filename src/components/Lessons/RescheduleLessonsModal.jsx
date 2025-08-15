import React, { useState } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import { supabase } from '../../config/supabase';
import { format, parseISO } from 'date-fns';

const RescheduleLessonsModal = ({ selectedLessons, onClose, onSuccess, currentUserID }) => {
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newDate) {
      setError('Please select a new date');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // For each selected lesson, we need to:
      // 1. Fetch the current lesson details to get the time
      // 2. Update with the new date while preserving the time
      const { data: lessonsData, error: fetchError } = await supabase
        .from('lessons')
        .select('id, scheduled_time')
        .in('id', selectedLessons)
        .eq('teacher_id', currentUserID); // Security check

      if (fetchError) throw fetchError;

      // Process each lesson to update with new date but keep original time
      const updates = lessonsData.map(lesson => {
        const originalDateTime = new Date(lesson.scheduled_time);
        const newDateObj = new Date(newDate);
        
        // Create new datetime with new date but original time
        const updatedDateTime = new Date(
          newDateObj.getFullYear(),
          newDateObj.getMonth(),
          newDateObj.getDate(),
          originalDateTime.getHours(),
          originalDateTime.getMinutes(),
          originalDateTime.getSeconds()
        );
        
        return {
          id: lesson.id,
          scheduled_time: updatedDateTime.toISOString()
        };
      });

      // First, delete any existing calendar events for these lessons
      await deleteCalendarEventsForLessons(selectedLessons);

      // Perform the update for each lesson
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ scheduled_time: update.scheduled_time })
          .eq('id', update.id)
          .eq('teacher_id', currentUserID); // Security check
        
        if (updateError) throw updateError;
      }

      // Recreate calendar events for the rescheduled lessons
      await createCalendarEventsForLessons(lessonsData.map(lesson => lesson.id), updates);

      // Call the success handler with the updated lesson IDs
      onSuccess(newDate, selectedLessons);
    } catch (error) {
      console.error('Error rescheduling lessons:', error);
      setError('Failed to reschedule lessons. Please try again.');
      setSaving(false);
    }
  };

  // Delete calendar events for the lessons being rescheduled
  const deleteCalendarEventsForLessons = async (lessonIds) => {
    if (!lessonIds || lessonIds.length === 0) return;
    try {
      console.log(`🗑️ Deleting calendar events for ${lessonIds.length} lessons...`);
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .in('linked_id', lessonIds)
        .eq('linked_table', 'lessons');
      
      if (error) {
        console.error('Error deleting calendar events:', error);
        throw new Error(`Failed to delete calendar events: ${error.message}`);
      }
      console.log('✅ Successfully deleted corresponding calendar events');
    } catch (error) {
      console.error('Error in deleteCalendarEventsForLessons:', error);
      // Don't throw here - we want the main flow to continue even if calendar event deletion fails
    }
  };

  // Create new calendar events for the rescheduled lessons
  const createCalendarEventsForLessons = async (lessonIds, updatedLessons) => {
    if (!lessonIds || lessonIds.length === 0) return;
    try {
      console.log(`📅 Creating ${lessonIds.length} rescheduled calendar events...`);
      
      // Fetch the updated lesson details to create calendar events
      const { data: lessonsData, error: fetchError } = await supabase
        .from('lessons')
        .select(`
          id,
          student_id,
          teacher_id,
          school_id,
          scheduled_time,
          duration_min,
          students (name)
        `)
        .in('id', lessonIds);
      
      if (fetchError) {
        console.error('Error fetching updated lesson data:', fetchError);
        throw new Error(`Failed to fetch updated lesson data: ${fetchError.message}`);
      }
      
      // Map lessons to calendar events
      const calendarEvents = lessonsData.map(lesson => {
        // Calculate end time
        const startTime = new Date(lesson.scheduled_time);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + (lesson.duration_min || 30));
        
        return {
          title: `Lesson with ${lesson.students?.name || 'Student'}`,
          event_type: 'lesson',
          start_time: lesson.scheduled_time,
          end_time: endTime.toISOString(),
          teacher_id: lesson.teacher_id,
          school_id: lesson.school_id,
          linked_id: lesson.id,
          linked_table: 'lessons',
          location: 'Online', // Default location
          notes: '', // Leave blank as requested
        };
      });
      
      // Insert calendar events
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(calendarEvents)
        .select();
        
      if (error) {
        console.error('Error creating calendar events:', error);
        throw new Error(`Failed to create calendar events: ${error.message}`);
      }
      console.log(`✅ Successfully created ${data.length} calendar events`);
      return data;
    } catch (error) {
      console.error('Error in createCalendarEventsForLessons:', error);
      // Return empty array on error - we don't want to fail the whole operation
      return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <SafeIcon icon={FiCalendar} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Reschedule Lessons</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            disabled={saving}
          >
            <SafeIcon icon={FiX} className="text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-center">
              <SafeIcon icon={FiX} className="text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              You're about to reschedule {selectedLessons.length} lesson{selectedLessons.length !== 1 ? 's' : ''}.
              The original time of day will be preserved for each lesson.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              required
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm"
              disabled={saving || !newDate}
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block mr-2"></div>
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <SafeIcon icon={FiCheck} className="inline-block mr-2" />
                  <span>Reschedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleLessonsModal;