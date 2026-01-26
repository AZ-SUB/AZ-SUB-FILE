const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { calculateMetrics } = require('../utils/helpers');

// MP Dashboard API Endpoints

// Get AL (Agent Leader) Performance Data (ENHANCED with filters and sorting)
router.get('/mp/al-performance', async (req, res) => {
    try {
        const { profileId, month, year, status, sortBy } = req.query;
        const now = new Date();
        const queryYear = year ? parseInt(year) : now.getFullYear();
        const queryMonth = month !== undefined ? parseInt(month) : now.getMonth();

        // Get all ALs (users with role_code 'AL')
        const { data: alUsers, error: alError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, user_roles!inner(role_code)')
            .eq('user_roles.role_code', 'AL');

        if (alError) throw alError;

        const alPerformance = [];

        for (const al of alUsers || []) {
            // Get APs under this AL
            const { data: apHierarchy } = await supabase
                .from('user_hierarchy')
                .select('user_id')
                .eq('report_to_id', al.id)
                .eq('is_active', true);

            const apIds = (apHierarchy || []).map(h => h.user_id);

            // Get submissions for this AL's team
            let submissionsQuery = supabase
                .from('az_submissions')
                .select('*, profiles(first_name, last_name)');

            if (apIds.length > 0) {
                // Include AL and their APs
                const teamIds = [al.id, ...apIds];
                submissionsQuery = submissionsQuery.in('profile_id', teamIds);
            } else {
                // No APs, check AL's own sales
                submissionsQuery = submissionsQuery.eq('profile_id', al.id);
            }

            const { data: submissions } = await submissionsQuery;

            // Calculate metrics
            let totalANP = 0;
            (submissions || []).filter(s => s.status === 'Issued').forEach(s => {
                totalANP += parseFloat(s.premium_paid) || 0;
            });

            const monthlySubmissions = (submissions || []).filter(s => {
                const subDate = new Date(s.issued_at);
                return subDate.getMonth() === queryMonth &&
                    subDate.getFullYear() === queryYear &&
                    s.status === 'Issued';
            });

            let monthlyANP = 0;
            monthlySubmissions.forEach(s => {
                // Monthly ANP = Total ANP / 12 (monthly equivalent)
                const totalANP = parseFloat(s.premium_paid) || 0;
                monthlyANP += totalANP / 12;
            });
            const monthlyCases = monthlySubmissions.length;
            const totalCases = (submissions || []).filter(s => s.status === 'Issued').length;

            // Calculate activity ratio (active APs / total APs)
            const activeAPs = apIds.length > 0 ? new Set(monthlySubmissions.map(s => s.profile_id)).size : 0;
            const activityRatio = apIds.length > 0 ? Math.round((activeAPs / apIds.length) * 100) : 0;

            // Determine status
            let alStatus = 'NEEDS IMPROVEMENT';
            if (monthlyCases >= 7) alStatus = 'PERFORMING';
            else if (monthlyCases >= 4) alStatus = 'AVERAGE';

            const alData = {
                id: al.id,
                name: `${al.first_name} ${al.last_name}`,
                region: 'Metro Manila', // Default, can be enhanced with actual data
                city: 'Manila', // Default, can be enhanced with actual data
                apCount: apIds.length,
                activeAPs,
                activityRatio,
                totalANP: Math.round(totalANP),
                monthlyANP: Math.round(monthlyANP),
                totalCases,
                monthlyCases,
                status: alStatus
            };

            // Apply status filter if provided
            if (!status || alStatus === status) {
                alPerformance.push(alData);
            }
        }

        // Apply sorting
        const validSortFields = ['monthlyANP', 'totalANP', 'activityRatio', 'monthlyCases', 'totalCases'];
        if (sortBy && validSortFields.includes(sortBy)) {
            alPerformance.sort((a, b) => b[sortBy] - a[sortBy]);
        } else {
            // Default sort by monthlyANP
            alPerformance.sort((a, b) => b.monthlyANP - a.monthlyANP);
        }

        res.json({ success: true, data: alPerformance });
    } catch (e) {
        console.error('AL Performance endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get AP (Agent Partner) Performance Data (ENHANCED with AL filter and case range)
router.get('/mp/ap-performance', async (req, res) => {
    try {
        const { profileId, month, year, alId, minCases, maxCases } = req.query;
        const now = new Date();
        const queryYear = year ? parseInt(year) : now.getFullYear();
        const queryMonth = month !== undefined ? parseInt(month) : now.getMonth();

        // Get all APs (users with role_code 'AP')
        let apQuery = supabase
            .from('profiles')
            .select('id, first_name, last_name, email, created_at, last_submission_at, user_roles!inner(role_code)')
            .eq('user_roles.role_code', 'AP');

        // Filter by AL if provided
        if (alId) {
            const { data: apHierarchy } = await supabase
                .from('user_hierarchy')
                .select('user_id')
                .eq('report_to_id', alId)
                .eq('is_active', true);

            const apIds = (apHierarchy || []).map(h => h.user_id);
            if (apIds.length > 0) {
                apQuery = apQuery.in('id', apIds);
            } else {
                // No APs under this AL
                return res.json({ success: true, data: [] });
            }
        }

        const { data: apUsers, error: apError } = await apQuery;
        if (apError) throw apError;

        const apPerformance = [];

        for (const ap of apUsers || []) {
            // Get AL for this AP
            const { data: hierarchy } = await supabase
                .from('user_hierarchy')
                .select('report_to_id, profiles!user_hierarchy_report_to_id_fkey(first_name, last_name)')
                .eq('user_id', ap.id)
                .eq('is_active', true)
                .maybeSingle();

            const alName = hierarchy?.profiles
                ? `${hierarchy.profiles.first_name} ${hierarchy.profiles.last_name}`
                : 'Unassigned';

            // Get submissions for this AP
            const { data: submissions } = await supabase
                .from('az_submissions')
                .select('*')
                .eq('profile_id', ap.id);

            // Calculate metrics
            let totalANP = 0;
            (submissions || []).filter(s => s.status === 'Issued').forEach(s => {
                totalANP += parseFloat(s.premium_paid) || 0;
            });

            const monthlySubmissions = (submissions || []).filter(s => {
                const subDate = new Date(s.issued_at);
                return subDate.getMonth() === queryMonth &&
                    subDate.getFullYear() === queryYear &&
                    s.status === 'Issued';
            });

            let monthlyANP = 0;
            monthlySubmissions.forEach(s => {
                // Monthly ANP = Total ANP / 12 (monthly equivalent)
                const totalANP = parseFloat(s.premium_paid) || 0;
                monthlyANP += totalANP / 12;
            });
            const monthlyCases = monthlySubmissions.length;
            const totalCases = (submissions || []).filter(s => s.status === 'Issued').length;

            // Get last activity
            const lastSubmission = (submissions || []).sort((a, b) =>
                new Date(b.issued_at) - new Date(a.issued_at)
            )[0];
            const lastActivity = lastSubmission
                ? new Date(lastSubmission.issued_at).toLocaleDateString()
                : 'No activity';

            const apData = {
                id: ap.id,
                name: `${ap.first_name} ${ap.last_name}`,
                alName,
                alId: hierarchy?.report_to_id || null,
                region: 'Metro Manila', // Default
                city: 'Manila', // Default
                licenseNumber: `LIC-${ap.id.substring(0, 8)}`, // Generated
                contactNumber: '+63 XXX XXX XXXX', // Default
                joinDate: new Date(ap.created_at).toLocaleDateString(),
                lastActivity,
                lastSubmissionAt: ap.last_submission_at,
                totalANP: Math.round(totalANP),
                monthlyANP: Math.round(monthlyANP),
                totalCases,
                monthlyCases
            };

            // Apply case range filter if provided
            const meetsMinCases = !minCases || monthlyCases >= parseInt(minCases);
            const meetsMaxCases = !maxCases || monthlyCases <= parseInt(maxCases);

            if (meetsMinCases && meetsMaxCases) {
                apPerformance.push(apData);
            }
        }

        res.json({ success: true, data: apPerformance });
    } catch (e) {
        console.error('AP Performance endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get MP Dashboard Statistics (ENHANCED with comprehensive filtering)
router.get('/mp/dashboard-stats', async (req, res) => {
    try {
        const { year, month, alId, apId, status } = req.query;
        const now = new Date();
        const selectedYear = year ? parseInt(year) : now.getFullYear();
        const selectedMonth = month !== undefined ? parseInt(month) : now.getMonth();

        // Get counts of ALs and APs
        let alQuery = supabase
            .from('profiles')
            .select('id, user_roles!inner(role_code)', { count: 'exact' })
            .eq('user_roles.role_code', 'AL');

        let apQuery = supabase
            .from('profiles')
            .select('id, created_at, last_submission_at, user_roles!inner(role_code)', { count: 'exact' })
            .eq('user_roles.role_code', 'AP');

        // Apply AL filter if provided
        if (alId) {
            // Get APs under this AL
            const { data: apHierarchy } = await supabase
                .from('user_hierarchy')
                .select('user_id')
                .eq('report_to_id', alId)
                .eq('is_active', true);

            const apIds = (apHierarchy || []).map(h => h.user_id);
            if (apIds.length > 0) {
                apQuery = apQuery.in('id', apIds);
            } else {
                // No APs under this AL, filter will result in 0
                apQuery = apQuery.eq('id', alId); // Will return empty for APs
            }
        }

        const { data: alCount } = await alQuery;
        const { data: apProfiles } = await apQuery;

        // Calculate active APs (those with submissions in last hour OR in selected month)
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const activeAPsLastHour = (apProfiles || []).filter(ap => {
            if (!ap.last_submission_at) return false;
            const lastActive = new Date(ap.last_submission_at);
            return lastActive >= oneHourAgo;
        }).length;

        // Get all submissions with policy details
        let submissionsQuery = supabase
            .from('az_submissions')
            .select('*, policy:policy_id(policy_name, policy_type)');

        // Apply AP filter if provided
        if (apId) {
            submissionsQuery = submissionsQuery.eq('profile_id', apId);
        } else if (alId) {
            // Filter by APs under this AL
            const { data: apHierarchy } = await supabase
                .from('user_hierarchy')
                .select('user_id')
                .eq('report_to_id', alId)
                .eq('is_active', true);

            const apIds = (apHierarchy || []).map(h => h.user_id);
            if (apIds.length > 0) {
                const teamIds = [alId, ...apIds];
                submissionsQuery = submissionsQuery.in('profile_id', teamIds);
            } else {
                submissionsQuery = submissionsQuery.eq('profile_id', alId);
            }
        }

        // Apply status filter if provided
        if (status) {
            submissionsQuery = submissionsQuery.eq('status', status);
        }

        const { data: allSubmissions } = await submissionsQuery;

        const issuedSubmissions = (allSubmissions || []).filter(s => s.status === 'Issued');
        const pendingSubmissions = (allSubmissions || []).filter(s => s.status === 'Pending');
        const declinedSubmissions = (allSubmissions || []).filter(s => s.status === 'Declined');

        // Calculate Total ANP (All-time, only Issued)
        let totalANP = 0;
        issuedSubmissions.forEach(s => {
            totalANP += parseFloat(s.premium_paid) || 0;
        });

        const totalCases = issuedSubmissions.length;

        // Monthly data for stats (Based on selected year/month)
        const currentMonthSubmissions = issuedSubmissions.filter(s => {
            const subDate = new Date(s.issued_at);
            return subDate.getMonth() === selectedMonth && subDate.getFullYear() === selectedYear;
        });

        // Calculate Monthly ANP using premium_paid / 12 formula
        let monthlyANP = 0;
        currentMonthSubmissions.forEach(s => {
            const totalANP = parseFloat(s.premium_paid) || 0;
            monthlyANP += totalANP / 12;
        });

        // Active APs (those with submissions this month)
        const activeAPIds = new Set(currentMonthSubmissions.map(s => s.profile_id));
        const activeAPsThisMonth = activeAPIds.size;

        // --- Chart Data Calculations ---

        // 1. Policy Distribution (Filtered by selected year)
        const yearSubmissions = issuedSubmissions.filter(s => {
            const subDate = new Date(s.issued_at);
            return subDate.getFullYear() === selectedYear;
        });

        const policyDistribution = {};
        yearSubmissions.forEach(sub => {
            const policyName = sub.policy?.policy_name || 'Unknown Policy';
            if (!policyDistribution[policyName]) {
                policyDistribution[policyName] = 0;
            }
            policyDistribution[policyName]++;
        });

        const distributionArray = Object.entries(policyDistribution).map(([name, count]) => ({
            policy_name: name,
            count,
            percentage: yearSubmissions.length > 0 ? Math.round((count / yearSubmissions.length) * 100) : 0
        })).sort((a, b) => b.count - a.count);

        // 2. Monthly Trend (For selected year)
        const monthlyTrend = Array(12).fill(0).map((_, index) => ({
            month: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][index],
            monthIndex: index,
            issued: 0,
            anp: 0
        }));

        yearSubmissions.forEach(sub => {
            const monthIndex = new Date(sub.issued_at).getMonth();
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlyTrend[monthIndex].issued++;
                // Monthly ANP = Total ANP / 12
                const totalANP = parseFloat(sub.premium_paid) || 0;
                monthlyTrend[monthIndex].anp += totalANP / 12;
            }
        });

        res.json({
            success: true,
            data: {
                totalALs: (alCount || []).length,
                totalAPs: (apProfiles || []).length,
                activeAPs: activeAPsThisMonth, // Active in selected month
                activeAPsLastHour, // Active in last hour (for real-time monitoring)
                totalANP: Math.round(totalANP),
                monthlyANP: Math.round(monthlyANP),
                totalCases,
                monthlyCases: currentMonthSubmissions.length,
                pendingCases: pendingSubmissions.length,
                declinedCases: declinedSubmissions.length,
                // Chart Data
                policyDistribution: distributionArray,
                monthlyTrend,
                // Filter info
                filters: {
                    year: selectedYear,
                    month: selectedMonth,
                    alId: alId || null,
                    apId: apId || null,
                    status: status || null
                }
            }
        });
    } catch (e) {
        console.error('MP Dashboard stats endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Monthly History for Statistics
router.get('/mp/monthly-history', async (req, res) => {
    try {
        const { year, month, statType } = req.query;
        const now = new Date();
        const selectedYear = year ? parseInt(year) : now.getFullYear();
        const selectedMonth = month ? parseInt(month) : now.getMonth();
        const previousYear = selectedYear - 1;

        if (!statType) {
            return res.status(400).json({ success: false, message: 'statType is required' });
        }

        // Fetch all submissions for current and previous year
        const { data: currentYearSubs } = await supabase
            .from('az_submissions')
            .select('*, policy:policy_id(policy_name, policy_type), profile:profile_id(id, user_roles!inner(role_code))')
            .eq('status', 'Issued')
            .gte('issued_at', `${selectedYear}-01-01`)
            .lt('issued_at', `${selectedYear + 1}-01-01`);

        // 1. Calculate Base for All-Time ANP
        const { data: baseANPSubs } = await supabase
            .from('az_submissions')
            .select('premium_paid, mode_of_payment')
            .eq('status', 'Issued')
            .lt('issued_at', `${selectedYear}-01-01`);

        let baseANP = 0;
        (baseANPSubs || []).forEach(s => {
            baseANP += parseFloat(s.premium_paid) || 0;
        });

        // 2. Calculate Base for Previous Year Comparison
        const { data: prevBaseANPSubs } = await supabase
            .from('az_submissions')
            .select('premium_paid, mode_of_payment')
            .eq('status', 'Issued')
            .lt('issued_at', `${previousYear}-01-01`);

        let prevBaseANP = 0;
        (prevBaseANPSubs || []).forEach(s => {
            prevBaseANP += parseFloat(s.premium_paid) || 0;
        });

        // 3. Fetch previous year submissions for comparison
        const { data: previousYearSubs } = await supabase
            .from('az_submissions')
            .select('*, policy:policy_id(policy_name, policy_type), profile:profile_id(id, user_roles!inner(role_code))')
            .eq('status', 'Issued')
            .gte('issued_at', `${previousYear}-01-01`)
            .lt('issued_at', `${previousYear + 1}-01-01`);

        // Get all profiles for AL/AP counts
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, created_at, user_roles!inner(role_code)');

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData = [];
        let currentValue = 0;

        const maxMonthIndex = selectedMonth;

        // Calculate monthly data based on statType
        for (let monthIndex = 0; monthIndex <= maxMonthIndex; monthIndex++) {
            const currentMonthSubs = (currentYearSubs || []).filter(s => {
                const date = new Date(s.issued_at);
                return date.getMonth() === monthIndex;
            });

            const previousMonthSubs = monthIndex > 0
                ? (currentYearSubs || []).filter(s => {
                    const date = new Date(s.issued_at);
                    return date.getMonth() === monthIndex - 1;
                })
                : [];

            // For yearly change comparison (same month last year)
            const prevYearSameMonthSubs = (previousYearSubs || []).filter(s => {
                const date = new Date(s.issued_at);
                return date.getMonth() === monthIndex;
            });

            let value = 0;
            let prevMonthValue = 0;
            let prevYearSameMonthValue = 0;

            switch (statType) {
                case 'activityRatio':
                    const activeAPsThisMonth = new Set(currentMonthSubs.map(s => s.profile_id)).size;
                    const totalAPsThisMonth = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex, 31)
                    ).length;
                    value = totalAPsThisMonth > 0 ? Math.round((activeAPsThisMonth / totalAPsThisMonth) * 100) : 0;

                    // Prev month
                    const activeAPsPrevMonth = new Set(previousMonthSubs.map(s => s.profile_id)).size;
                    const totalAPsPrevMonth = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex - 1, 31)
                    ).length;
                    prevMonthValue = totalAPsPrevMonth > 0 ? Math.round((activeAPsPrevMonth / totalAPsPrevMonth) * 100) : 0;

                    // Prev year same month
                    const activeAPsPrevYear = new Set(prevYearSameMonthSubs.map(s => s.profile_id)).size;
                    const totalAPsPrevYear = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(previousYear, monthIndex, 31)
                    ).length;
                    prevYearSameMonthValue = totalAPsPrevYear > 0 ? Math.round((activeAPsPrevYear / totalAPsPrevYear) * 100) : 0;
                    break;

                case 'totalANP':
                    let cumANP = 0;
                    const cumulativeSubs = (currentYearSubs || []).filter(s => {
                        const date = new Date(s.issued_at);
                        return date.getMonth() <= monthIndex;
                    });
                    cumulativeSubs.forEach(s => {
                        cumANP += parseFloat(s.premium_paid) || 0;
                    });
                    value = Math.round(baseANP + cumANP);

                    let cumPrevMonthANP = 0;
                    const cumulativePrevMonth = (currentYearSubs || []).filter(s => {
                        const date = new Date(s.issued_at);
                        return date.getMonth() <= monthIndex - 1;
                    });
                    cumulativePrevMonth.forEach(s => {
                        cumPrevMonthANP += parseFloat(s.premium_paid) || 0;
                    });
                    prevMonthValue = Math.round(baseANP + cumPrevMonthANP);

                    let cumPrevYearANP = 0;
                    const cumulativePrevYear = (previousYearSubs || []).filter(s => {
                        const date = new Date(s.issued_at);
                        return date.getMonth() <= monthIndex;
                    });
                    cumulativePrevYear.forEach(s => {
                        cumPrevYearANP += parseFloat(s.premium_paid) || 0;
                    });
                    prevYearSameMonthValue = Math.round(prevBaseANP + cumPrevYearANP);
                    break;

                case 'monthlyANP':
                    let mANP = 0;
                    currentMonthSubs.forEach(s => {
                        const totalANP = parseFloat(s.premium_paid) || 0;
                        mANP += totalANP / 12;
                    });
                    value = Math.round(mANP);

                    let mPrevMonthANP = 0;
                    previousMonthSubs.forEach(s => {
                        const totalANP = parseFloat(s.premium_paid) || 0;
                        mPrevMonthANP += totalANP / 12;
                    });
                    prevMonthValue = Math.round(mPrevMonthANP);

                    let mPrevYearANP = 0;
                    prevYearSameMonthSubs.forEach(s => {
                        const totalANP = parseFloat(s.premium_paid) || 0;
                        mPrevYearANP += totalANP / 12;
                    });
                    prevYearSameMonthValue = Math.round(mPrevYearANP);
                    break;

                case 'totalCases':
                    value = currentMonthSubs.length;
                    prevMonthValue = previousMonthSubs.length;
                    prevYearSameMonthValue = prevYearSameMonthSubs.length;
                    break;

                case 'totalALs':
                    value = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AL' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex, 31)
                    ).length;

                    prevMonthValue = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AL' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex - 1, 31)
                    ).length;

                    prevYearSameMonthValue = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AL' &&
                        new Date(p.created_at) <= new Date(previousYear, monthIndex, 31)
                    ).length;
                    break;

                case 'totalAPs':
                    value = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex, 31)
                    ).length;

                    prevMonthValue = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(selectedYear, monthIndex - 1, 31)
                    ).length;

                    prevYearSameMonthValue = (allProfiles || []).filter(p =>
                        p.user_roles?.role_code === 'AP' &&
                        new Date(p.created_at) <= new Date(previousYear, monthIndex, 31)
                    ).length;
                    break;
            }

            // Determine trend (Month over Month)
            let trend = 'stable';
            if (monthIndex === 0) {
                trend = value > prevYearSameMonthValue ? 'up' : value < prevYearSameMonthValue ? 'down' : 'stable';
            } else {
                trend = value > prevMonthValue ? 'up' : value < prevMonthValue ? 'down' : 'stable';
            }

            monthlyData.push({
                month: monthNames[monthIndex],
                value,
                trend
            });

            // Update result if this is the selected month
            if (monthIndex === selectedMonth) {
                currentValue = value;
            }
        }

        let previousYearValueForSelectedMonth = 0;
        const prevYearSameMonthSubs = (previousYearSubs || []).filter(s => {
            const date = new Date(s.issued_at);
            return date.getMonth() === selectedMonth;
        });

        switch (statType) {
            case 'activityRatio':
                const activeAPsPrevYear = new Set(prevYearSameMonthSubs.map(s => s.profile_id)).size;
                const totalAPsPrevYear = (allProfiles || []).filter(p =>
                    p.user_roles?.role_code === 'AP' &&
                    new Date(p.created_at) <= new Date(previousYear, selectedMonth, 31)
                ).length;
                previousYearValueForSelectedMonth = totalAPsPrevYear > 0 ? Math.round((activeAPsPrevYear / totalAPsPrevYear) * 100) : 0;
                break;
            case 'totalANP':
                let cumPrevYearANPSelected = 0;
                const cumulativePrevYearForSelected = (previousYearSubs || []).filter(s => {
                    const date = new Date(s.issued_at);
                    return date.getMonth() <= selectedMonth;
                });
                cumulativePrevYearForSelected.forEach(s => {
                    cumPrevYearANPSelected += parseFloat(s.premium_paid) || 0;
                });
                previousYearValueForSelectedMonth = Math.round(prevBaseANP + cumPrevYearANPSelected);
                break;
            case 'monthlyANP':
                let mPrevYearANP = 0;
                prevYearSameMonthSubs.forEach(s => {
                    const { monthlyEquivalent } = calculateMetrics(s.premium_paid, s.mode_of_payment);
                    mPrevYearANP += monthlyEquivalent;
                });
                previousYearValueForSelectedMonth = Math.round(mPrevYearANP / 1000);
                break;
            case 'totalCases':
                previousYearValueForSelectedMonth = prevYearSameMonthSubs.length;
                break;
            case 'totalALs':
                previousYearValueForSelectedMonth = (allProfiles || []).filter(p =>
                    p.user_roles?.role_code === 'AL' &&
                    new Date(p.created_at) <= new Date(previousYear, selectedMonth, 31)
                ).length;
                break;
            case 'totalAPs':
                previousYearValueForSelectedMonth = (allProfiles || []).filter(p =>
                    p.user_roles?.role_code === 'AP' &&
                    new Date(p.created_at) <= new Date(previousYear, selectedMonth, 31)
                ).length;
                break;
        }

        const yearlyChange = previousYearValueForSelectedMonth > 0
            ? ((currentValue - previousYearValueForSelectedMonth) / previousYearValueForSelectedMonth) * 100
            : 0;

        const overallTrend = yearlyChange > 0 ? 'up' : yearlyChange < 0 ? 'down' : 'stable';

        const metadata = {
            activityRatio: { title: 'Activity Ratio History', description: 'Monthly activity ratio trend', unit: '%', prefix: '' },
            totalANP: { title: 'Total ANP History', description: 'Cumulative Annual Premium growth', unit: '', prefix: '₱ ' },
            monthlyANP: { title: 'Monthly ANP History', description: 'Monthly ANP performance trend', unit: '', prefix: '₱ ' },
            totalCases: { title: 'Total Cases History', description: 'Total policies issued trend', unit: '', prefix: '' },
            totalALs: { title: 'Agent Leaders History', description: 'Number of Agent Leaders', unit: 'ALs', prefix: '' },
            totalAPs: { title: 'Agent Partners History', description: 'Number of Agent Partners', unit: 'APs', prefix: '' }
        };

        const statMetadata = metadata[statType] || { title: 'Statistic History', description: 'Historical data for this statistic', unit: '', prefix: '' };

        res.json({
            success: true,
            data: {
                ...statMetadata,
                currentValue,
                yearlyChange: Math.round(yearlyChange * 10) / 10,
                trend: overallTrend,
                monthlyData
            }
        });
    } catch (e) {
        console.error('Monthly history endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// Get Policy Details for an AL
router.get('/mp/policy-details/:alId', async (req, res) => {
    try {
        const { alId } = req.params;
        const { year, month } = req.query;
        const selectedYear = year ? parseInt(year) : new Date().getFullYear();

        // Get APs under this AL
        const { data: apHierarchy } = await supabase
            .from('user_hierarchy')
            .select('user_id')
            .eq('report_to_id', alId)
            .eq('is_active', true);

        const apIds = (apHierarchy || []).map(h => h.user_id);

        // Get all submissions for this AL's team
        let submissionsQuery = supabase
            .from('az_submissions')
            .select('*, policy:policy_id(policy_name, policy_type)')
            .eq('status', 'Issued');

        if (apIds.length > 0) {
            const teamIds = [alId, ...apIds];
            submissionsQuery = submissionsQuery.in('profile_id', teamIds);
        } else {
            submissionsQuery = submissionsQuery.eq('profile_id', alId);
        }

        const { data: submissions, error } = await submissionsQuery;
        if (error) throw error;

        // Calculate Policy Distribution
        const policyDistribution = {};
        (submissions || []).forEach(sub => {
            const policyName = sub.policy?.policy_name || 'Unknown Policy';
            if (!policyDistribution[policyName]) {
                policyDistribution[policyName] = 0;
            }
            policyDistribution[policyName]++;
        });

        const totalPolicies = (submissions || []).length;
        const distributionArray = Object.entries(policyDistribution).map(([name, count]) => ({
            policy_name: name,
            count,
            percentage: totalPolicies > 0 ? ((count / totalPolicies) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count);

        // Calculate Monthly Trend for selected year
        const monthlyTrend = Array(12).fill(0).map((_, index) => ({
            month: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][index],
            monthIndex: index,
            policiesIssued: 0,
            anp: 0
        }));

        (submissions || []).forEach(sub => {
            const subDate = new Date(sub.issued_at);
            if (subDate.getFullYear() === selectedYear) {
                const monthIndex = subDate.getMonth();
                monthlyTrend[monthIndex].policiesIssued++;
                monthlyTrend[monthIndex].anp += parseFloat(sub.premium_paid) || 0;
            }
        });

        res.json({
            success: true,
            data: {
                policyDistribution: distributionArray,
                monthlyTrend,
                totalCases: totalPolicies
            }
        });
    } catch (e) {
        console.error('Policy details endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
