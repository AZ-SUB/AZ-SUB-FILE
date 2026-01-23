const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ibbjsjvjfeymglpsvgap.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = { supabase };
