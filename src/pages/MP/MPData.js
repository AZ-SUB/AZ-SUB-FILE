// MPData.js - Integrated with Real Backend Data
import { useState, useEffect } from 'react';

export const useMPData = () => {
    const [mpStats, setMpStats] = useState(null);
    const [alPerformance, setAlPerformance] = useState([]);
    const [apPerformance, setApPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial load
    useEffect(() => {
        const currentDate = new Date();
        loadMPData(currentDate.getMonth(), currentDate.getFullYear());
    }, []);

    const loadMPData = async (month, year) => {
        setLoading(true);
        setError(null);
        try {
            // Default to current date if not provided
            const currentYear = year || new Date().getFullYear();
            const currentMonth = month !== undefined ? month : new Date().getMonth();

            // Fetch all required data in parallel
            const [statsRes, alRes, apRes] = await Promise.all([
                fetch(`http://localhost:3000/api/mp/dashboard-stats?year=${currentYear}&month=${currentMonth}`),
                fetch(`http://localhost:3000/api/mp/al-performance?year=${currentYear}&month=${currentMonth}`),
                fetch(`http://localhost:3000/api/mp/ap-performance?year=${currentYear}&month=${currentMonth}`)
            ]);

            if (!statsRes.ok || !alRes.ok || !apRes.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const statsData = await statsRes.json();
            const alData = await alRes.json();
            const apData = await apRes.json();

            if (statsData.success) {
                setMpStats(statsData.data);
            }

            if (alData.success) {
                // Map backend AL data to frontend structure if needed
                // Backend already matches most fields: id, name, region, city, totalANP, monthlyANP, totalCases, monthlyCases, status
                // We need to ensure extra UI fields exist or have defaults
                const mappedALs = alData.data.map(al => ({
                    ...al,
                    // Ensure these exist for UI even if backend doesn't send them yet
                    joinDate: al.joinDate || '2023-01-01', // Fallback
                    totalAPs: al.apCount, // Backend sends apCount, frontend expects totalAPs
                    performanceTrend: 'stable', // Placeholder if not pending backend calculation
                    commissionRate: 15, // Placeholder
                    targetAchievement: 0 // Placeholder
                }));
                setAlPerformance(mappedALs);
            }

            if (apData.success) {
                // Map backend AP data to frontend structure
                const mappedAPs = apData.data.map(ap => ({
                    ...ap,
                    activityStatus: ap.monthlyCases > 0 ? 'Active' : 'Inactive',
                    performanceStatus: ap.monthlyCases >= 7 ? 'PERFORMING' :
                        ap.monthlyCases >= 4 ? 'AVERAGE' : 'NEEDS IMPROVEMENT',
                    commissionEarned: 0 // Placeholder
                }));
                setApPerformance(mappedAPs);
            }

        } catch (error) {
            console.error('Error loading MP data:', error);
            setError('Failed to load data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Helper functions preserved for UI compatibility
    const getAPPerformanceSummary = (aps) => {
        if (!aps) return { total: 0, active: 0, performing: 0, average: 0, needsImprovement: 0, inactive: 0 };
        const total = aps.length;
        const active = aps.filter(ap => ap.monthlyCases > 0).length;
        const performing = aps.filter(ap => ap.monthlyCases >= 7).length;
        const average = aps.filter(ap => ap.monthlyCases >= 4 && ap.monthlyCases < 7).length;
        const needsImprovement = aps.filter(ap => ap.monthlyCases < 4 && ap.monthlyCases > 0).length;
        const inactive = aps.filter(ap => ap.monthlyCases === 0).length;

        return { total, active, performing, average, needsImprovement, inactive };
    };

    const getAPsByAL = (alName) => {
        return apPerformance.filter(ap => ap.alName === alName);
    };

    // Placeholder for trend - could be moved to backend later
    const getALPerformanceTrend = (alId, months = 12) => {
        // Return dummy trend for UI visual stability until backend supports historical trend per AL
        return Array(12).fill(0).map(() => Math.floor(Math.random() * 10) + 5);
    };

    // Placeholder for distribution - could be moved to backend later
    // Note: The modal uses a separate API call for this now, so this might be unused,
    // but keeping it safe for any other components using it.
    const getALPolicyDistribution = (alId) => {
        return [
            { name: 'Allianz Well', category: 'System', count: 15, percentage: 30 },
            { name: 'AZpire Growth', category: 'System', count: 10, percentage: 20 },
            { name: 'Allianz Secure', category: 'Manual', count: 25, percentage: 50 },
        ];
    };

    return {
        mpStats,
        alPerformance,
        apPerformance,
        loading,
        error,
        refreshData: loadMPData, // Expose as refreshData to match existing usage
        getAPPerformanceSummary,
        getAPsByAL,
        getALPerformanceTrend,
        getALPolicyDistribution
    };
};
