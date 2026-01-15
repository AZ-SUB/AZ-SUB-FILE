import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ibbjsjvjfeymglpsvgap.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0'
);

async function fixAccountTypes() {
    console.log('=== Checking and Fixing Account Types ===\n');

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('account_type', ['AP', 'AL']);

    console.log('Current AP/AL Users:');
    profiles.forEach(p => {
        console.log(`  - ${p.username} (${p.email}) - Type: ${p.account_type}`);
    });

    // Based on the username "AVAP", it seems like it should be AL (Agency Vice President or Agency Leader)
    // Let's update AVAP to AL
    console.log('\n--- Updating AVAP to AL ---');
    const { error } = await supabase
        .from('profiles')
        .update({ account_type: 'AL' })
        .eq('username', 'AVAP');

    if (error) {
        console.log('❌ Error:', error.message);
    } else {
        console.log('✅ Successfully updated AVAP to AL');
    }

    // Verify the change
    console.log('\n=== Updated AP/AL Users ===');
    const { data: updatedProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('account_type', ['AP', 'AL']);

    updatedProfiles.forEach(p => {
        console.log(`  - ${p.username} (${p.email}) - Type: ${p.account_type}`);
    });
}

fixAccountTypes();
