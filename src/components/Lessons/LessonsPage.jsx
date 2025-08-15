import React, { useState, useEffect } from 'react';
import SafeIcon from '../../common/SafeIcon';
import { FiCalendar, FiCheck, FiChevronDown, FiChevronUp, FiSearch, FiX, FiAlertCircle, FiClock, FiSun, FiCalendar as FiCalendarIcon, FiFileText } from 'react-icons/fi';
import { supabase } from '../../config/supabase';
import { useUser } from '../../contexts/UserContext';
import { format, isAfter, isBefore, parseISO, addDays, startOfToday, endOfToday, startOfTomorrow, endOfTomorrow, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import RescheduleLessonsModal from './RescheduleLessonsModal';
import DeleteLessonsModal from './DeleteLessonsModal';
import { handleLessonClick } from '../../utils/lessonNotes';

const LessonsPage = () => {
  const { currentUserID } = useUser();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'scheduled_time', direction: 'asc' });
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [matchCount, setMatchCount] = useState(0);
  const [noteActionLoading, setNoteActionLoading] = useState(null);

  const lessonsPerPage = 30;
  const observerTarget = React.useRef(null);

  useEffect(() => {
    if (currentUserID) {
      fetchLessons();
    }
  }, [currentUserID]);

  useEffect(() => {
    filterAndSortLessons();
  }, [lessons, searchTerm, dateRange, statusFilter, sortConfig]);

  useEffect(() => {
    // Reset selectedLessons when filtered lessons change
    setSelectedLessons([]);
    setSelectAll(false);
  }, [searchTerm, dateRange, statusFilter, sortConfig]);

  useEffect(() => {
    // Set up intersection observer for infinite scrolling
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreLessons();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [filteredLessons, hasMore, loadingMore, currentPage]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: existingLessonsError } = await supabase
        .from('lessons')
        .select(`
          id,
          student_id,
          teacher_id,
          scheduled_time,
          duration_min,
          status,
          students (
            name,
            instrument
          )
        `)
        .eq('teacher_id', currentUserID)
        .order('scheduled_time', { ascending: false });

      if (existingLessonsError) {
        throw existingLessonsError;
      }

      // Format the lessons data
      const formattedLessons = data.map(lesson => ({
        id: lesson.id,
        studentId: lesson.student_id,
        studentName: lesson.students?.name || 'Unknown Student',
        studentLastName: lesson.students?.name?.split(' ').pop() || '',
        instrument: lesson.students?.instrument || 'Not specified',
        scheduledTime: lesson.scheduled_time,
        date: format(new Date(lesson.scheduled_time), 'yyyy-MM-dd'),
        time: format(new Date(lesson.scheduled_time), 'h:mm a'),
        duration: lesson.duration_min,
        status: lesson.status || 'scheduled',
        // Add day of week for display
        dayOfWeek: format(new Date(lesson.scheduled_time), 'EEEE'),
      }));

      setLessons(formattedLessons);
      setHasMore(formattedLessons.length >= lessonsPerPage);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setError('Failed to load lessons. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLessons = async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      // In a real implementation with API pagination, you would fetch the next page here
      // For now, we're simulating pagination with the already loaded data
      setCurrentPage(nextPage);
      // Check if we have more data to display in the next page
      const totalDisplayed = nextPage * lessonsPerPage;
      setHasMore(filteredLessons.length > totalDisplayed);
    } catch (error) {
      console.error('Error loading more lessons:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filterAndSortLessons = () => {
    let filtered = [...lessons];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        lesson =>
          lesson.studentName.toLowerCase().includes(term) ||
          lesson.instrument?.toLowerCase().includes(term)
      );
    }

    // Apply date range filter
    if (dateRange.startDate) {
      filtered = filtered.filter(
        lesson =>
          isAfter(new Date(lesson.date), new Date(dateRange.startDate)) ||
          lesson.date === dateRange.startDate
      );
    }

    if (dateRange.endDate) {
      filtered = filtered.filter(
        lesson =>
          isBefore(new Date(lesson.date), new Date(dateRange.endDate)) ||
          lesson.date === dateRange.endDate
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lesson => lesson.status === statusFilter);
    }

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // Special handling for combined date+time sorting
        if (sortConfig.key === 'scheduled_time') {
          const dateA = new Date(a.scheduledTime);
          const dateB = new Date(b.scheduledTime);
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }

        // Special handling for student name sorting (by last name)
        if (sortConfig.key === 'studentName') {
          const lastNameA = a.studentLastName?.toLowerCase() || '';
          const lastNameB = b.studentLastName?.toLowerCase() || '';

          if (lastNameA !== lastNameB) {
            return sortConfig.direction === 'asc' ? lastNameA.localeCompare(lastNameB) : lastNameB.localeCompare(lastNameA);
          } else {
            // If last names are the same, sort by full name
            return sortConfig.direction === 'asc' ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
          }
        }

        // Normal sorting for other fields
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1;
      });
    }

    setFilteredLessons(filtered);
    setMatchCount(filtered.length);
  };

  const requestSort = (key) => {
    // Special handling for date and time columns - combine them
    if (key === 'date' || key === 'time') {
      key = 'scheduled_time';
    }

    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    // For date and time, show icon on both columns if sorting by scheduled_time
    if ((key === 'date' || key === 'time') && sortConfig.key === 'scheduled_time') {
      return sortConfig.direction === 'asc' ? (
        <FiChevronUp className="inline ml-1" />
      ) : (
        <FiChevronDown className="inline ml-1" />
      );
    }

    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? (
      <FiChevronUp className="inline ml-1" />
    ) : (
      <FiChevronDown className="inline ml-1" />
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLessons([]);
    } else {
      const visibleLessons = getCurrentPageLessons();
      setSelectedLessons(visibleLessons.map(lesson => lesson.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectLesson = (e, lessonId) => {
    e.stopPropagation(); // Prevent row click from triggering

    if (selectedLessons.includes(lessonId)) {
      setSelectedLessons(selectedLessons.filter(id => id !== lessonId));
      setSelectAll(false);
    } else {
      setSelectedLessons([...selectedLessons, lessonId]);
      // Check if all filtered students are now selected
      if (selectedLessons.length + 1 === filteredLessons.length) {
        setSelectAll(true);
      }
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
    setStatusFilter('all');
  };

  const handleDeleteLessons = () => {
    if (!selectedLessons.length) return;
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // First, delete corresponding calendar events
      await deleteCalendarEventsForLessons(selectedLessons);

      // Then delete the lessons
      const { error } = await supabase
        .from('lessons')
        .delete()
        .in('id', selectedLessons)
        .eq('teacher_id', currentUserID); // Security check

      if (error) throw error;

      // Update local state
      setLessons(lessons.filter(lesson => !selectedLessons.includes(lesson.id)));
      setSelectedLessons([]);
      setSelectAll(false);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting lessons:', error);
      setError('Failed to delete lessons. Please try again.');
    }
  };

  // New function to delete calendar events for selected lessons
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

  const handleRescheduleSuccess = (newDate, updatedLessonIds) => {
    // Update the lessons in local state with the new date
    const updatedLessons = lessons.map(lesson => {
      if (updatedLessonIds.includes(lesson.id)) {
        // Parse the new date and original time
        const originalDate = new Date(lesson.scheduledTime);
        const newDateObj = parseISO(newDate);
        
        // Create new date with the new date but keep original time
        const updatedDate = new Date(
          newDateObj.getFullYear(),
          newDateObj.getMonth(),
          newDateObj.getDate(),
          originalDate.getHours(),
          originalDate.getMinutes()
        );
        
        return {
          ...lesson,
          scheduledTime: updatedDate.toISOString(),
          date: format(updatedDate, 'yyyy-MM-dd'),
          time: format(updatedDate, 'h:mm a'),
          // Update day of week too
          dayOfWeek: format(updatedDate, 'EEEE'),
        };
      }
      return lesson;
    });
    
    setLessons(updatedLessons);
    setSelectedLessons([]);
    setSelectAll(false);
    setShowRescheduleModal(false);
  };

  // Get current page lessons for infinite scroll
  const getCurrentPageLessons = () => {
    return filteredLessons.slice(0, currentPage * lessonsPerPage);
  };

  const visibleLessons = getCurrentPageLessons();

  const getStatusBadge = (status) => {
    const statusStyles = {
      'scheduled': 'bg-blue-500 text-white',
      'completed': 'bg-green-500 text-white',
      'cancelled': 'bg-red-500 text-white',
      'missed': 'bg-amber-500 text-white',
    };
    return statusStyles[status] || 'bg-gray-500 text-white';
  };

  // Quick date filter buttons handlers
  const filterToday = () => {
    const today = startOfToday();
    setDateRange({
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd'),
    });
  };

  const filterTomorrow = () => {
    const tomorrow = startOfTomorrow();
    setDateRange({
      startDate: format(tomorrow, 'yyyy-MM-dd'),
      endDate: format(tomorrow, 'yyyy-MM-dd'),
    });
  };

  const filterThisWeek = () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    setDateRange({
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
    });
  };

  const filterNextWeek = () => {
    const nextWeekStart = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
    setDateRange({
      startDate: format(nextWeekStart, 'yyyy-MM-dd'),
      endDate: format(nextWeekEnd, 'yyyy-MM-dd'),
    });
  };

  // Handle clicking on a lesson row to open notes
  const onLessonRowClick = async (lessonId) => {
    setNoteActionLoading(lessonId);
    await handleLessonClick(lessonId, (errorMsg) => {
      setError(errorMsg);
    });
    setNoteActionLoading(null);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Lessons</h1>
        <p className="text-gray-600 mt-1">Manage your scheduled, completed, and upcoming lessons</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <SafeIcon icon={FiAlertCircle} className="text-red-500 mr-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Search
            </label>
            <div className="relative">
              <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student or instrument..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="Start Date"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              min={dateRange.startDate}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="End Date"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>

        {/* Quick Date Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={filterToday}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiSun} className="text-blue-500" />
            <span>Today</span>
          </button>
          <button
            onClick={filterTomorrow}
            className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiClock} className="text-teal-500" />
            <span>Tomorrow</span>
          </button>
          <button
            onClick={filterThisWeek}
            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiCalendarIcon} className="text-purple-500" />
            <span>This Week</span>
          </button>
          <button
            onClick={filterNextWeek}
            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiCalendarIcon} className="text-indigo-500" />
            <span>Next Week</span>
          </button>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || dateRange.startDate || dateRange.endDate || statusFilter !== 'all') && (
          <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchTerm && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center">
                Search: "{searchTerm}"
              </span>
            )}
            {dateRange.startDate && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center">
                From: {dateRange.startDate}
              </span>
            )}
            {dateRange.endDate && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center">
                To: {dateRange.endDate}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center">
                Status: {statusFilter}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Match Count */}
      <div className="text-sm text-gray-600 flex items-center">
        <SafeIcon icon={FiCheck} className="text-green-500 mr-1" />
        <span>{matchCount} lesson{matchCount !== 1 ? 's' : ''} found matching your search</span>
      </div>

      {/* Bulk Actions */}
      {selectedLessons.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="text-blue-600" />
            <span className="text-blue-800 font-medium">{selectedLessons.length} lesson{selectedLessons.length !== 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm"
            >
              Reschedule
            </button>
            <button
              onClick={handleDeleteLessons}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-colors shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Lessons Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading lessons...</p>
          </div>
        ) : filteredLessons.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('studentName')}
                  >
                    Student {getSortIcon('studentName')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('instrument')}
                  >
                    Instrument {getSortIcon('instrument')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('date')}
                  >
                    Date {getSortIcon('date')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('time')}
                  >
                    Time {getSortIcon('time')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('duration')}
                  >
                    Duration {getSortIcon('duration')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => requestSort('status')}
                  >
                    Status {getSortIcon('status')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleLessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedLessons.includes(lesson.id) ? 'bg-blue-50' : ''}`}
                    onClick={() => onLessonRowClick(lesson.id)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedLessons.includes(lesson.id)}
                        onChange={(e) => handleSelectLesson(e, lesson.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {lesson.studentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                      {lesson.instrument}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {/* Include day of week in date display */}
                      {lesson.dayOfWeek}, {format(new Date(lesson.scheduledTime), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {lesson.time}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {lesson.duration} min
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(lesson.status)}`}>
                        {lesson.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onLessonRowClick(lesson.id);
                        }}
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                        disabled={noteActionLoading === lesson.id}
                      >
                        {noteActionLoading === lesson.id ? (
                          <span className="flex items-center space-x-1">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                            <span>Opening...</span>
                          </span>
                        ) : (
                          <>
                            <SafeIcon icon={FiFileText} />
                            <span>View/Edit</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Infinite Scroll Loader */}
            {(hasMore || loadingMore) && (
              <div
                ref={observerTarget}
                className="py-4 text-center text-gray-500 text-sm"
              >
                {loadingMore ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                    Loading more lessons...
                  </div>
                ) : (
                  "Scroll for more"
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <SafeIcon icon={FiCalendar} className="text-gray-300 text-3xl mb-2 mx-auto" />
            <h3 className="text-lg font-medium text-gray-800 mb-1">No lessons found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || dateRange.startDate || dateRange.endDate || statusFilter !== 'all'
                ? "No lessons match your current search or filter criteria."
                : "You don't have any lessons yet."}
            </p>
            {(searchTerm || dateRange.startDate || dateRange.endDate || statusFilter !== 'all') && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors shadow-sm"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <RescheduleLessonsModal
          selectedLessons={selectedLessons}
          onClose={() => setShowRescheduleModal(false)}
          onSuccess={handleRescheduleSuccess}
          currentUserID={currentUserID}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteLessonsModal
          selectedLessons={selectedLessons}
          lessonCount={selectedLessons.length}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
};

export default LessonsPage;