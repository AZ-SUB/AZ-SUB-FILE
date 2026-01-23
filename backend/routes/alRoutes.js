const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Performance endpoint for AL dashboard
router.get('/performance/all', async (req, res) => {
    try {
        const { profileId } = req.query;
        let subordinateIds = [];

        // 1. If explicit profileId (AL/Leader), fetch their team (AP hierarchy)
        if (profileId) {
            const { data: team, error: teamError } = await supabase
                .from('user_hierarchy')
                .select('user_id')
                .eq('report_to_id', profileId)
                .eq('is_active', true);

            if (teamError) throw teamError;

            if (team && team.length > 0) {
                subordinateIds = team.map(t => t.user_id);
            } else {
                // No team members found
                return res.json({
                    success: true,
                    data: {
                        performanceByAP: [],
                        teamStats: {
                            totalTeamANP: 0, totalMonthlyANP: 0, totalSubmissions: 0,
                            totalIssued: 0, totalPending: 0, totalDeclined: 0, averageConversionRate: 0
                        }
                    }
                });
            }
        }

        // 2. Query Submissions
        let query = supabase
            .from('az_submissions')
            .select('*, profiles (first_name, last_name)') // Join to get Agent Name
            .order('issued_at', { ascending: false });

        if (subordinateIds.length > 0) {
            query = query.in('profile_id', subordinateIds);
        } else if (profileId) {
            // Fallback: If profileId was provided but matched no hierarchy
            query = query.eq('profile_id', profileId);
        }

        const { data: submissions, error } = await query;
        if (error) throw error;

        const performanceByAP = {};
        const teamStats = {
            totalTeamANP: 0,
            totalMonthlyANP: 0,
            totalSubmissions: 0,
            totalIssued: 0,
            totalPending: 0,
            totalDeclined: 0,
            averageConversionRate: 0
        };

        let totalConversionRates = 0;
        let apCountForConversion = 0;

        submissions.forEach(sub => {
            // Determine AP Name
            // Prefer Profile Name, fallback to submission_type only if profile missing (legacy data)
            let apName = 'Unknown Agent';
            if (sub.profiles) {
                apName = `${sub.profiles.first_name} ${sub.profiles.last_name}`.trim();
            } else if (sub.submission_type) {
                apName = sub.submission_type; // Fallback
            }

            if (!performanceByAP[apName]) {
                performanceByAP[apName] = {
                    apName,
                    totalANP: 0,
                    monthlyANP: 0,
                    totalSubmissions: 0,
                    issued: 0,
                    pending: 0,
                    declined: 0,
                    conversionRate: 0,
                    submissions: []
                };
            }

            // Use premium_paid as Full Amount per user request "total anp should be the premium paid"
            const totalPremium = parseFloat(sub.premium_paid) || 0;

            // Calculate Modal/Installment Premium for "Monthly ANP" logic
            let modalPremium = totalPremium;
            // Normalizing mode string just in case
            const mode = (sub.mode_of_payment || '').trim();

            if (mode === 'Monthly') modalPremium = totalPremium / 12;
            else if (mode === 'Quarterly') modalPremium = totalPremium / 4;
            else if (mode === 'Semi-Annual') modalPremium = totalPremium / 2;
            // Annual remains totalPremium

            // Update Stats per AP
            performanceByAP[apName].totalSubmissions++;
            performanceByAP[apName].submissions.push(sub);

            // Update Team Stats
            teamStats.totalSubmissions++;

            if (sub.status === 'Issued') {
                performanceByAP[apName].totalANP += totalPremium;
                performanceByAP[apName].issued++;

                teamStats.totalTeamANP += totalPremium;
                teamStats.totalIssued++;

                const now = new Date();
                const subDate = new Date(sub.issued_at);
                if (subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear()) {
                    // Monthly ANP stat uses the Modal/Installment Amount
                    performanceByAP[apName].monthlyANP += modalPremium;
                    teamStats.totalMonthlyANP += modalPremium;
                }
            } else if (sub.status === 'Declined') {
                performanceByAP[apName].declined++;
                teamStats.totalDeclined++;
            } else {
                performanceByAP[apName].pending++;
                teamStats.totalPending++;
            }
        });

        // Calculate Conversion Rates
        const performanceList = Object.values(performanceByAP);
        performanceList.forEach(ap => {
            if (ap.totalSubmissions > 0) {
                ap.conversionRate = ((ap.issued / ap.totalSubmissions) * 100).toFixed(1);
                totalConversionRates += parseFloat(ap.conversionRate);
                apCountForConversion++;
            }
        });

        if (apCountForConversion > 0) {
            teamStats.averageConversionRate = (totalConversionRates / apCountForConversion).toFixed(1);
        }

        res.json({
            success: true,
            data: {
                performanceByAP: performanceList,
                teamStats
            }
        });
    } catch (e) {
        console.error('Performance endpoint error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
