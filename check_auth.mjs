import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ibbjsjvjfeymglpsvgap.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0'
);

async function checkAuth() {
    console.log('=== Checking Auth Users ===');
    const { data: authData } = await supabase.auth.admin.listUsers();
    console.log('\nAuth Users:');
    authData.users.forEach(u => {
        console.log(`  - ${u.email} (ID: ${u.id})`);
    });

    console.log('\n=== Checking Profiles ===');
    const { data: profiles } = await supabase.from('profiles').select('*');
    console.log('\nProfiles:');
    profiles.forEach(p => {
        console.log(`  - ${p.username} (${p.email}) - Type: ${p.account_type}, ID: ${p.id}`);
    });

    console.log('\n=== Checking for AP/AL Users ===');
    const apAlProfiles = profiles.filter(p => p.account_type === 'AP' || p.account_type === 'AL');
    console.log('\nAP/AL Profiles:');
    apAlProfiles.forEach(p => {
        const hasAuth = authData.users.some(u => u.id === p.id);
        console.log(`  - ${p.username} (${p.email}) - Type: ${p.account_type}`);
        console.log(`    Has Auth Account: ${hasAuth ? 'YES' : 'NO'}`);
    });
}

checkAuth();
