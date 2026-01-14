import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [monitoringData, setMonitoringData] = useState([]);
    const [formSubmissions, setFormSubmissions] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null); // { id, username, role, managerId }
    const [userRole, setUserRole] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);

    // Test connection and load user on mount
    useEffect(() => {
        testConnection();
        loadUser();
    }, []);

    // Load data once user is authenticated
    useEffect(() => {
        if (currentUser) {
            loadMonitoringData();
            loadFormSubmissions();
            loadCustomers();
            loadPerformanceData();
        }
    }, [currentUser]);

    const loadUser = async () => {
        try {
            const res = await api.getCurrentUser();
            if (res.success) {
                setCurrentUser(res.data);
                setUserRole(res.data.role);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const testConnection = async () => {
        try {
            const data = await api.health();
            console.log('Health check response:', data);
            // Handle both old format {status: 'ok'} and new format {success: true, status: 'ok'}
            if (data.success === true || data.status === 'ok') {
                setIsConnected(true);
                console.log('Connection established successfully');
            } else {
                setIsConnected(false);
                console.log('Health check returned unexpected response');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            setIsConnected(false);
        }
    };

    const loadMonitoringData = async () => {
        try {
            const res = await api.getAllMonitoring(currentUser?.id);
            if (res.success) {
                setMonitoringData(res.data);
            }
        } catch (error) {
            console.error('Error loading monitoring data:', error);
        }
    };

    const loadFormSubmissions = async () => {
        try {
            const res = await api.getAllFormSubmissions(currentUser?.id);
            if (res.success) {
                setFormSubmissions(res.data);
            }
        } catch (error) {
            console.error('Error loading form submissions:', error);
        }
    };

    const loadCustomers = async () => {
        try {
            const res = await api.getAllCustomers(currentUser?.id);
            if (res.success) {
                setCustomers(res.data);
            }
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    };

    const loadPerformanceData = async () => {
        try {
            const res = await api.getALTeamPerformance(currentUser?.id);
            if (res.success) {
                setPerformanceData(res.data);
            }
        } catch (error) {
            console.error('Error loading performance data:', error);
        }
    };

    const value = {
        isConnected,
        setIsConnected,
        monitoringData,
        setMonitoringData,
        formSubmissions,
        setFormSubmissions,
        customers,
        setCustomers,
        currentUser,
        setCurrentUser,
        userRole,
        setUserRole,
        performanceData,
        setPerformanceData,
        loadMonitoringData,
        loadFormSubmissions,
        loadCustomers,
        loadPerformanceData,
        testConnection
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
