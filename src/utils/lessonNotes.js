import { supabase } from '../config/supabase';
import { format } from 'date-fns';

/**
 * Determines the appropriate notes application URL based on the current environment
 * @returns {string} The base URL for the notes application
 */
export const getNotesBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // Netlify preview environments
  if (hostname.includes('netlify.app')) {
    return 'https://glowing-mooncake-946c37.netlify.app';
  }
  
  // Production environment
  if (hostname === 'www.mymusicstudio.app') {
    return 'https://lessons.mymusicstudio.app';
  }
  
  // Development environment or fallback to preview URL
  return 'https://glowing-mooncake-946c37.netlify.app';
};

/**
 * Handles clicking on a lesson to open the lesson notes
 * Checks if notes exist for the lesson, creates them if not,
 * then opens the notes in a new tab
 * 
 * @param {string} lessonId - The UUID of the lesson
 * @param {Function} onError - Optional callback for error handling
 * @returns {Promise<void>}
 */
export const handleLessonClick = async (lessonId, onError) => {
  try {
    console.log('🎵 Opening notes for lesson:', lessonId);
    
    // Step 1: Check if notes already exist for this lesson
    const { data: existingNote, error: notesError } = await supabase
      .from('lesson_notes')
      .select('id')
      .eq('lesson_id', lessonId)
      .maybeSingle();
      
    if (notesError) {
      throw new Error(`Error checking for existing notes: ${notesError.message}`);
    }

    let noteId;
    
    if (existingNote) {
      // Step 2a: Use existing note
      console.log('✅ Found existing lesson notes');
      noteId = existingNote.id;
    } else {
      // Step 2b: Create new note
      console.log('📝 Creating new lesson notes');
      
      // Get lesson details
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .select('teacher_id, student_id, scheduled_time, students(name)')
        .eq('id', lessonId)
        .single();
        
      if (lessonError) {
        throw new Error(`Error fetching lesson details: ${lessonError.message}`);
      }
      
      // Format the lesson date for the title
      const lessonDate = new Date(lesson.scheduled_time);
      const formattedDate = format(lessonDate, 'MMMM d, yyyy');
      const studentName = lesson.students?.name || 'Student';
      
      // Create a new lesson note
      const { data: newNote, error: createError } = await supabase
        .from('lesson_notes')
        .insert({
          lesson_id: lessonId,
          teacher_id: lesson.teacher_id,
          student_id: lesson.student_id,
          lesson_datetime: lesson.scheduled_time,
          title: `${studentName} - Lesson on ${formattedDate}`,
          content: { type: 'doc', content: [] }
        })
        .select()
        .single();
        
      if (createError) {
        throw new Error(`Error creating new lesson notes: ${createError.message}`);
      }
      
      console.log('✅ Created new lesson notes:', newNote.id);
      noteId = newNote.id;
    }
    
    // Step 3: Get current user session for authentication token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;
    
    // Step 4: Open notes in a new tab with auth token
    const notesBaseUrl = getNotesBaseUrl();
    let noteUrl = `${notesBaseUrl}/view?note_id=${noteId}`;
    
    // Add auth token to URL if available (crucial for Netlify hosted site)
    if (authToken) {
      noteUrl += `&token=${authToken}`;
      console.log('🔐 Adding auth token to notes URL');
    } else {
      console.warn('⚠️ No auth token available for notes handoff');
    }
    
    console.log('🔗 Opening notes URL:', noteUrl);
    window.open(noteUrl, '_blank');
    
  } catch (error) {
    console.error('❌ Error handling lesson click:', error);
    if (onError) {
      onError(error.message);
    }
  }
};