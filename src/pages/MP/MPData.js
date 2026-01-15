// MPData.js - UPDATED with correct Active Ratio calculation
import { useState, useEffect } from 'react';

export const useMPData = () => {
    const [mpStats, setMpStats] = useState(null);
    const [alPerformance, setAlPerformance] = useState([]);
    const [apPerformance, setApPerformance] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to calculate AL activity ratio correctly
    const calculateActivityRatio = (al) => {
        const aps = apPerformance.filter(ap => ap.alName === al.name);
        if (aps.length === 0) return 0;
        
        // Active APs are those who have issued at least 1 policy (monthlyCases > 0)
        const activeAPs = aps.filter(ap => ap.monthlyCases > 0).length;
        return Math.round((activeAPs / aps.length) * 100);
    };

    // Enhanced mock data with realistic information
    const generateRealisticALData = () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        const regions = ['NCR', 'Luzon', 'Visayas', 'Mindanao'];
        const cities = {
            'NCR': ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig'],
            'Luzon': ['Baguio', 'Angeles', 'Batangas', 'Laguna', 'Cavite'],
            'Visayas': ['Cebu', 'Iloilo', 'Bacolod', 'Tacloban', 'Dumaguete'],
            'Mindanao': ['Davao', 'Cagayan de Oro', 'Zamboanga', 'General Santos', 'Butuan']
        };
        
        const ALs = [
            {
                id: 1,
                name: 'Maria Reyes',
                region: 'NCR',
                city: 'Makati',
                joinDate: '2022-03-15',
                totalAPs: 8,
                // activeAPs will be calculated dynamically
                totalANP: 12500000,
                monthlyANP: 1250000,
                totalCases: 320,
                monthlyCases: 32,
                status: 'PERFORMING',
                performanceTrend: 'up',
                commissionRate: 15.5,
                targetAchievement: 105
            },
            {
                id: 2,
                name: 'Antonio Dela Cruz',
                region: 'Luzon',
                city: 'Baguio',
                joinDate: '2021-08-10',
                totalAPs: 10,
                totalANP: 9800000,
                monthlyANP: 980000,
                totalCases: 245,
                monthlyCases: 28,
                status: 'AVERAGE',
                performanceTrend: 'stable',
                commissionRate: 12.8,
                targetAchievement: 92
            },
            {
                id: 3,
                name: 'Carlo Lim',
                region: 'Visayas',
                city: 'Cebu',
                joinDate: '2023-01-05',
                totalAPs: 6,
                totalANP: 7500000,
                monthlyANP: 750000,
                totalCases: 210,
                monthlyCases: 25,
                status: 'PERFORMING',
                performanceTrend: 'up',
                commissionRate: 14.2,
                targetAchievement: 98
            },
            {
                id: 4,
                name: 'Ana Santos',
                region: 'NCR',
                city: 'Quezon City',
                joinDate: '2020-11-20',
                totalAPs: 12,
                totalANP: 8500000,
                monthlyANP: 850000,
                totalCases: 180,
                monthlyCases: 22,
                status: 'PERFORMING',
                performanceTrend: 'up',
                commissionRate: 13.8,
                targetAchievement: 101
            },
            {
                id: 5,
                name: 'Juan Cruz',
                region: 'Mindanao',
                city: 'Davao',
                joinDate: '2022-06-30',
                totalAPs: 8,
                totalANP: 6500000,
                monthlyANP: 650000,
                totalCases: 150,
                monthlyCases: 18,
                status: 'NEEDS IMPROVEMENT',
                performanceTrend: 'down',
                commissionRate: 10.5,
                targetAchievement: 78
            },
            {
                id: 6,
                name: 'Elena Tan',
                region: 'Luzon',
                city: 'Batangas',
                joinDate: '2023-04-12',
                totalAPs: 7,
                totalANP: 5500000,
                monthlyANP: 550000,
                totalCases: 120,
                monthlyCases: 15,
                status: 'AVERAGE',
                performanceTrend: 'up',
                commissionRate: 12.0,
                targetAchievement: 88
            },
            {
                id: 7,
                name: 'Roberto Garcia',
                region: 'Visayas',
                city: 'Iloilo',
                joinDate: '2021-12-01',
                totalAPs: 9,
                totalANP: 7200000,
                monthlyANP: 720000,
                totalCases: 195,
                monthlyCases: 21,
                status: 'PERFORMING',
                performanceTrend: 'stable',
                commissionRate: 13.5,
                targetAchievement: 95
            },
            {
                id: 8,
                name: 'Sofia Mendoza',
                region: 'NCR',
                city: 'Taguig',
                joinDate: '2023-02-18',
                totalAPs: 5,
                totalANP: 4200000,
                monthlyANP: 420000,
                totalCases: 95,
                monthlyCases: 12,
                status: 'AVERAGE',
                performanceTrend: 'up',
                commissionRate: 11.8,
                targetAchievement: 85
            }
        ];

        return ALs;
    };

    const generateRealisticAPData = () => {
        const APs = [];
        const alData = generateRealisticALData();
        
        alData.forEach((al, index) => {
            // Generate APs for each AL
            const apCount = al.totalAPs;
            
            for (let i = 1; i <= apCount; i++) {
                const apId = index * 100 + i;
                // Randomly decide if AP has issued policies (some may have 0)
                const hasIssuedPolicy = Math.random() > 0.3; // 70% have issued at least 1 policy
                const monthlyCases = hasIssuedPolicy ? Math.floor(Math.random() * 12) + 1 : 0;
                const isActive = monthlyCases > 0; // Active if issued at least 1 policy
                
                const performanceStatus = monthlyCases >= 7 ? 'PERFORMING' : 
                                        monthlyCases >= 4 ? 'AVERAGE' : 
                                        'NEEDS IMPROVEMENT';
                const totalANP = Math.floor(Math.random() * 300000) + 50000;
                const monthlyANP = isActive ? Math.floor(totalANP / 12) : 0;
                const totalCases = Math.floor(totalANP / 5000);
                
                const lastActivity = isActive 
                    ? new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
                    : new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
                
                APs.push({
                    id: apId,
                    name: `AP-${apId.toString().padStart(4, '0')} ${['Miguel', 'Anna', 'Carlos', 'Elena', 'Roberto', 'Sofia', 'Daniel', 'Carmen'][i % 8]} ${['Santos', 'Rodriguez', 'Lim', 'Tan', 'Cruz', 'Fernandez', 'Torres', 'Reyes'][i % 8]}`,
                    alName: al.name,
                    region: al.region,
                    city: al.city,
                    activityStatus: isActive ? 'Active' : 'Inactive',
                    lastActivity: lastActivity.toISOString().split('T')[0],
                    totalANP: totalANP,
                    monthlyANP: monthlyANP,
                    totalCases: totalCases,
                    monthlyCases: monthlyCases,
                    performanceStatus: performanceStatus,
                    commissionEarned: Math.floor(totalANP * 0.12),
                    joinDate: '202' + (Math.floor(Math.random() * 4) + 1) + '-' + 
                               (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0') + '-' + 
                               (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0'),
                    licenseNumber: 'AP' + apId.toString().padStart(6, '0'),
                    contactNumber: '+63' + (9000000000 + Math.floor(Math.random() * 1000000000))
                });
            }
        });

        return APs;
    };

    const calculateMPStats = (alData, apData) => {
        const totalALs = alData.length;
        const totalAPs = apData.length;
        const activeAPs = apData.filter(ap => ap.monthlyCases > 0).length; // Changed: Active if monthlyCases > 0
        const totalANP = alData.reduce((sum, al) => sum + al.totalANP, 0);
        const monthlyANP = alData.reduce((sum, al) => sum + al.monthlyANP, 0);
        const totalCases = alData.reduce((sum, al) => sum + al.totalCases, 0);
        
        // Calculate activity ratio for each AL dynamically
        const alDataWithActivity = alData.map(al => ({
            ...al,
            activityRatio: calculateActivityRatio(al),
            activeAPs: apData.filter(ap => ap.alName === al.name && ap.monthlyCases > 0).length
        }));
        
        const avgActivityRatio = alDataWithActivity.reduce((sum, al) => sum + al.activityRatio, 0) / totalALs;
        const performingALs = alDataWithActivity.filter(al => al.status === 'PERFORMING').length;
        const performingAPs = apData.filter(ap => ap.monthlyCases >= 7).length;

        return {
            totalANP,
            monthlyANP,
            totalPolicies: totalCases,
            totalAgents: totalAPs,
            totalALs,
            totalAPs,
            approvalRate: 85,
            declineRate: 8,
            activityRatio: avgActivityRatio,
            performingALs,
            performingAPs,
            activeAPs,
            avgCommissionRate: 13.2,
            overallTargetAchievement: 92,
            networkGrowth: 15.8
        };
    };

    const loadMPData = async () => {
        setLoading(false);
        try {
            const apData = generateRealisticAPData();
            const alData = generateRealisticALData();
            
            // Calculate AL activity ratio and active APs
            const alDataWithActivity = alData.map(al => {
                const aps = apData.filter(ap => ap.alName === al.name);
                const activeAPs = aps.filter(ap => ap.monthlyCases > 0).length;
                const activityRatio = aps.length > 0 ? Math.round((activeAPs / aps.length) * 100) : 0;
                
                return {
                    ...al,
                    activityRatio,
                    activeAPs
                };
            });
            
            const stats = calculateMPStats(alDataWithActivity, apData);
            
            setAlPerformance(alDataWithActivity);
            setApPerformance(apData);
            setMpStats(stats);
            
        } catch (error) {
            console.error('Error loading MP data:', error);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Function to get AP performance summary
    const getAPPerformanceSummary = (aps) => {
        const total = aps.length;
        const active = aps.filter(ap => ap.monthlyCases > 0).length; // Changed: Active if issued policy
        const performing = aps.filter(ap => ap.monthlyCases >= 7).length;
        const average = aps.filter(ap => ap.monthlyCases >= 4 && ap.monthlyCases <= 6).length;
        const needsImprovement = aps.filter(ap => ap.monthlyCases < 4 && ap.monthlyCases > 0).length;
        const inactive = aps.filter(ap => ap.monthlyCases === 0).length;
        
        return { total, active, performing, average, needsImprovement, inactive };
    };

    // Function to filter APs by AL
    const getAPsByAL = (alName) => {
        return apPerformance.filter(ap => ap.alName === alName);
    };

    // Function to get AL performance trend
    const getALPerformanceTrend = (alId, months = 12) => {
        const al = alPerformance.find(al => al.id === alId);
        if (!al) return Array(months).fill(0);
        
        const baseValue = al.monthlyCases;
        return Array.from({ length: months }, (_, i) => {
            const variation = Math.floor(Math.random() * 10) - 3;
            return Math.max(5, baseValue + variation - i % 3);
        });
    };

    // Function to get policy distribution for AL
    const getALPolicyDistribution = (alId) => {
        const policies = [
            { name: 'Allianz Well', category: 'System' },
            { name: 'Eazy Health', category: 'Manual' },
            { name: 'Allianz Fundamental Cover', category: 'Manual' },
            { name: 'AZpire Growth', category: 'System' },
            { name: 'Allianz Secure Pro', category: 'Manual' },
            { name: 'Single Pay/Optimal', category: 'System' }
        ];
        
        return policies.map(policy => ({
            ...policy,
            count: Math.floor(Math.random() * 50) + 10,
            percentage: Math.floor(Math.random() * 30) + 10
        }));
    };

    useEffect(() => {
        loadMPData();
    }, []);

    return {
        mpStats,
        alPerformance,
        apPerformance,
        loading,
        error,
        loadMPData,
        refreshData: loadMPData,
        getAPPerformanceSummary,
        getAPsByAL,
        getALPerformanceTrend,
        getALPolicyDistribution
    };
};