import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://ibbjsjvjfeymglpsvgap.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYmpzanZqZmV5bWdscHN2Z2FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMwODM1OCwiZXhwIjoyMDgwODg0MzU4fQ._gIdqP80fwN_6Qu_Pgqi3ecYJHEYuZmJjboBnfs9zv0'
);

async function fixAPALUsers() {
    console.log('=== Fixing AP and AL User Authentication ===\n');

    // Get AP and AL users from profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('account_type', ['AP', 'AL']);

    console.log(`Found ${profiles.length} AP/AL profiles:\n`);

    for (const profile of profiles) {
        console.log(`\n--- Processing: ${profile.username} (${profile.email}) - ${profile.account_type} ---`);

        // Check if auth user exists
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers.users.find(u => u.id === profile.id);

        if (!authUser) {
            console.log('❌ No auth account found. Creating new auth user...');

            // Create auth user with a default password
            const defaultPassword = 'Password123!';
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: profile.email,
                password: defaultPassword,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    username: profile.username,
                    account_type: profile.account_type
                }
            });

            if (createError) {
                console.log('❌ Error creating user:', createError.message);
            } else {
                console.log(`✅ Created auth user with password: ${defaultPassword}`);

                // Update profile ID to match auth user ID
                if (newUser.user.id !== profile.id) {
                    console.log(`⚠️  Auth user ID (${newUser.user.id}) doesn't match profile ID (${profile.id})`);
                    console.log('   You may need to update the profile ID manually or recreate the profile.');
                }
            }
        } else {
            console.log('✅ Auth account exists');

            // Reset password to a known value
            const newPassword = 'Password123!';
            const { error: updateError } = await supabase.auth.admin.updateUserById(
                authUser.id,
                {
                    password: newPassword,
                    email_confirm: true // Ensure email is confirmed
                }
            );

            if (updateError) {
                console.log('❌ Error updating password:', updateError.message);
            } else {
                console.log(`✅ Password reset to: ${newPassword}`);
            }
        }
    }

    console.log('\n\n=== Summary ===');
    console.log('All AP and AL users should now be able to login with password: Password123!');
    console.log('\nUsers:');
    profiles.forEach(p => {
        console.log(`  - ${p.username} (${p.email}) - Type: ${p.account_type}`);
    });
}

fixAPALUsers().catch(console.error);
