import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ibbjsjvjfeymglpsvgap.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDgzNTgsImV4cCI6MjA4MDg4NDM1OH0.DYh6mxqh83LDJyIShi8rfOihYa_2rZnU_g_5fE6G3rg'
);

async function testLogin() {
    // Test AP user login
    console.log('=== Testing AP User Login ===');
    const apEmail = 'nathanulibarri@gmail.com';

    console.log(`\nAttempting to fetch profile for: ${apEmail}`);
    const { data: profileCheck, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', apEmail)
        .single();

    if (profileError) {
        console.log('❌ Profile fetch error:', profileError.message);
    } else {
        console.log('✅ Profile found:', {
            username: profileCheck.username,
            email: profileCheck.email,
            account_type: profileCheck.account_type,
            id: profileCheck.id
        });
    }

    // Test AL user
    console.log('\n=== Testing AL User Login ===');
    const alEmail = 'khazix134@gmail.com';

    console.log(`\nAttempting to fetch profile for: ${alEmail}`);
    const { data: alProfileCheck, error: alProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', alEmail)
        .single();

    if (alProfileError) {
        console.log('❌ Profile fetch error:', alProfileError.message);
    } else {
        console.log('✅ Profile found:', {
            username: alProfileCheck.username,
            email: alProfileCheck.email,
            account_type: alProfileCheck.account_type,
            id: alProfileCheck.id
        });
    }

    // Check if profiles table has RLS enabled
    console.log('\n=== Checking RLS Policies ===');
    const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('username, email, account_type');

    if (allError) {
        console.log('❌ Cannot fetch all profiles (RLS might be blocking):', allError.message);
    } else {
        console.log('✅ Can fetch profiles. Total count:', allProfiles.length);
    }
}

testLogin();
