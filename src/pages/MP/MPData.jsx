// MPData.jsx - React Context Provider for MP Dashboard Data
import { createContext, useContext, useState, useEffect } from 'react';

const MPDataContext = createContext();

export const useMPData = () => {
    const context = useContext(MPDataContext);
    if (!context) {
        throw new Error('useMPData must be used within MPDataProvider');
    }
    return context;
};

export const MPDataProvider = ({ children }) => {
    const [alPerformance, setAlPerformance] = useState([]);
    const [apPerformance, setApPerformance] = useState([]);
    const [mpStats, setMpStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch AL Performance Data
    const fetchALPerformance = async (month, year) => {
        try {
            const queryYear = year || new Date().getFullYear();
            const queryMonth = month !== undefined ? month : new Date().getMonth();
            const response = await fetch(`http://localhost:3000/api/mp/al-performance?month=${queryMonth}&year=${queryYear}`);
            const result = await response.json();
            if (result.success) {
                setAlPerformance(result.data);
            }
        } catch (err) {
            console.error('Error fetching AL performance:', err);
            setError(err.message);
        }
    };

    // Fetch AP Performance Data
    const fetchAPPerformance = async (month, year) => {
        try {
            const queryYear = year || new Date().getFullYear();
            const queryMonth = month !== undefined ? month : new Date().getMonth();
            const response = await fetch(`http://localhost:3000/api/mp/ap-performance?month=${queryMonth}&year=${queryYear}`);
            const result = await response.json();
            if (result.success) {
                setApPerformance(result.data);
            }
        } catch (err) {
            console.error('Error fetching AP performance:', err);
            setError(err.message);
        }
    };

    // Fetch MP Dashboard Stats
    const fetchMPStats = async (month, year) => {
        try {
            const queryYear = year || new Date().getFullYear();
            const queryMonth = month !== undefined ? month : new Date().getMonth();
            const response = await fetch(`http://localhost:3000/api/mp/dashboard-stats?month=${queryMonth}&year=${queryYear}`);
            const result = await response.json();
            if (result.success) {
                setMpStats(result.data);
            }
        } catch (err) {
            console.error('Error fetching MP stats:', err);
            setError(err.message);
        }
    };

    const [queryCache, setQueryCache] = useState({});

    // Helper to generate cache key
    const getCacheKey = (month, year) => `${year}-${month}`;

    // Generic fetch wrapper with caching
    const fetchDataWithCache = async (month, year) => {
        const queryYear = year || new Date().getFullYear();
        const queryMonth = month !== undefined ? month : new Date().getMonth();
        const cacheKey = getCacheKey(queryMonth, queryYear);

        // Check cache first
        if (queryCache[cacheKey]) {
            const cached = queryCache[cacheKey];
            setAlPerformance(cached.alPerformance);
            setApPerformance(cached.apPerformance);
            setMpStats(cached.mpStats);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [alRes, apRes, mpRes] = await Promise.all([
                fetch(`http://localhost:3000/api/mp/al-performance?month=${queryMonth}&year=${queryYear}`),
                fetch(`http://localhost:3000/api/mp/ap-performance?month=${queryMonth}&year=${queryYear}`),
                fetch(`http://localhost:3000/api/mp/dashboard-stats?month=${queryMonth}&year=${queryYear}`)
            ]);

            const alData = await alRes.json();
            const apData = await apRes.json();
            const mpData = await mpRes.json();

            const newAlPerformance = alData.success ? alData.data : [];
            const newApPerformance = apData.success ? apData.data : [];
            const newMpStats = mpData.success ? mpData.data : {};

            // Batch updates
            setAlPerformance(newAlPerformance);
            setApPerformance(newApPerformance);
            setMpStats(newMpStats);

            // Update cache
            setQueryCache(prev => ({
                ...prev,
                [cacheKey]: {
                    alPerformance: newAlPerformance,
                    apPerformance: newApPerformance,
                    mpStats: newMpStats
                }
            }));
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Get APs by AL name
    const getAPsByAL = (alName) => {
        return apPerformance.filter(ap => ap.alName === alName);
    };

    // Initial data fetch
    useEffect(() => {
        const now = new Date();
        fetchDataWithCache(now.getMonth(), now.getFullYear());
    }, []);

    const value = {
        alPerformance,
        apPerformance,
        mpStats,
        loading,
        error,
        getAPsByAL,
        refreshData: (month, year) => fetchDataWithCache(month, year)
    };

    return (
        <MPDataContext.Provider value={value}>
            {children}
        </MPDataContext.Provider>
    );
};

// Export as default for backward compatibility
export default { useMPData, MPDataProvider };
