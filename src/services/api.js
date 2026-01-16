import supabase from '../config/supabaseClient';

const API_URL = 'http://localhost:3000';

export const api = {
  // Health check
  health: async () => {
    const res = await fetch(`${API_URL}/api/health`);
    return res.json();
  },

  // Monitoring
  getAllMonitoring: async (profileId) => {
    let url = `${API_URL}/api/monitoring/all?t=${Date.now()}`;
    if (profileId) url += `&profileId=${profileId}`;
    const res = await fetch(url);
    return res.json();
  },

  submitMonitoring: async (data) => {
    const res = await fetch(`${API_URL}/api/monitoring/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Get Active Policies
  getActivePolicies: async () => {
    try {
      const res = await fetch(`${API_URL}/api/policies/active`);
      return res.json();
    } catch (error) {
      console.error('Error fetching active policies:', error);
      return { success: false, message: error.message };
    }
  },

  // Serial Numbers
  getAvailableSerial: async (policyType) => {
    const res = await fetch(`${API_URL}/api/serial-numbers/available/${encodeURIComponent(policyType)}`);
    return res.json();
  },

  getSerialDetails: async (serial) => {
    const res = await fetch(`${API_URL}/api/submissions/details/${encodeURIComponent(serial)}?t=${Date.now()}`);
    return res.json();
  },

  // Form Submissions
  getAllFormSubmissions: async (profileId) => {
    let url = `${API_URL}/api/form-submissions?t=${Date.now()}`;
    if (profileId) url += `&profileId=${profileId}`;
    const res = await fetch(url);
    return res.json();
  },

  submitForm: async (formData) => {
    const res = await fetch(`${API_URL}/api/form-submissions`, {
      method: 'POST',
      body: formData
    });
    return res.json();
  },

  updateSubmissionStatus: async (id, status) => {
    const res = await fetch(`${API_URL}/api/form-submissions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return res.json();
  },

  // Customers
  getAllCustomers: async (profileId) => {
    let url = `${API_URL}/api/customers?t=${Date.now()}`;
    if (profileId) url += `&profileId=${profileId}`;
    const res = await fetch(url);
    return res.json();
  },

  getCustomer: async (id) => {
    const res = await fetch(`${API_URL}/api/customers/${id}?t=${Date.now()}`);
    return res.json();
  },

  markPolicyPaid: async (id) => {
    const res = await fetch(`${API_URL}/api/form-submissions/${id}/pay`, {
      method: 'POST'
    });
    return res.json();
  },

  // AL Team Performance
  getALTeamPerformance: async (profileId) => {
    try {
      let url = `${API_URL}/api/performance/all?t=${Date.now()}`;
      if (profileId) url += `&profileId=${profileId}`;
      const res = await fetch(url);
      return res.json();
    } catch (err) {
      console.error('Error in getALTeamPerformance:', err);
      return { success: false, error: err.message };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        return { success: false, message: 'No active session' };
      }

      // Fetch profile details including first_name and last_name
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, account_type')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { success: false, message: 'Profile not found' };
      }

      return {
        success: true,
        data: {
          id: profile.id,
          username: profile.username,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.username,
          firstName: profile.first_name,
          lastName: profile.last_name,
          email: user.email,
          role: profile.account_type?.toUpperCase(), // Ensure role format matches expectations (AL, AP, etc.)
          managerId: null // Add logic for manager if needed later
        }
      };
    } catch (err) {
      console.error('Error in getCurrentUser:', err);
      return { success: false, message: err.message };
    }
  }
};

export default api;
