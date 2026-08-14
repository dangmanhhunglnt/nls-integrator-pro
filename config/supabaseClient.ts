import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyngtvvrpblpwlenzlyr.supabase.co';
<<<<<<< HEAD
// Thầy dán đầy đủ chuỗi key sb_publishable_... đã lấy ở màn hình Supabase vào đây:
const SUPABASE_ANON_KEY = 'sb_publishable_VR_iYi8aeT9bjIn0nK4zqA_4N-0FQTl'; 
=======
const SUPABASE_ANON_KEY = 'sb_publishable_VR_iYi8aeT9bjIrGgq6'; // Thầy thay bằng key của thầy nếu khác
>>>>>>> version-2

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);