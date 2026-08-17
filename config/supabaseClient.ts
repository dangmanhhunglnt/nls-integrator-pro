import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zyngtvvrpblpwlenzlyr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VR_iYi8aeT9bjIn0nK4zqA_4N-0FQTl';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);