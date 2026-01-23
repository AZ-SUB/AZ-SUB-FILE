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

    // Get APs by AL name
    const getAPsByAL = (alName) => {
        return apPerformance.filter(ap => ap.alName === alName);
    };

    // Initial data fetch
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            const now = new Date();
            await Promise.all([
                fetchALPerformance(now.getMonth(), now.getFullYear()),
                fetchAPPerformance(now.getMonth(), now.getFullYear()),
                fetchMPStats(now.getMonth(), now.getFullYear())
            ]);
            setLoading(false);
        };

        fetchAllData();
    }, []);

    const value = {
        alPerformance,
        apPerformance,
        mpStats,
        loading,
        error,
        getAPsByAL,
        refreshData: async (month, year) => {
            setLoading(true);
            await Promise.all([
                fetchALPerformance(month, year),
                fetchAPPerformance(month, year),
                fetchMPStats(month, year)
            ]);
            setLoading(false);
        }
    };

    return (
        <MPDataContext.Provider value={value}>
            {children}
        </MPDataContext.Provider>
    );
};

// Export as default for backward compatibility
export default { useMPData, MPDataProvider };
