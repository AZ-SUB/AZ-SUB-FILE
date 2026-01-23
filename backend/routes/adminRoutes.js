const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Get all serial numbers for admin dashboard
router.get('/admin/serial-numbers', async (req, res) => {
    try {
        // Fetch all serial numbers
        const { data: serialNumbers, error: serialError } = await supabase
            .from('serial_number')
            .select('*')
            .order('date', { ascending: false });

        if (serialError) {
            console.error('Error fetching serial numbers:', serialError);
            return res.status(500).json({ success: false, message: 'Failed to fetch serial numbers' });
        }

        // Calculate counts for dashboard cards
        const totalCount = serialNumbers.length;

        const unusedDefault = serialNumbers.filter(
            s => s.Confirm === null && s.serial_type === 'Default'
        ).length;

        const unusedAllianz = serialNumbers.filter(
            s => s.Confirm === null && s.serial_type === 'Allianz Well'
        ).length;

        const usedSerials = serialNumbers.filter(
            s => s.is_issued === true
        ).length;

        res.json({
            success: true,
            data: serialNumbers,
            counts: {
                total: totalCount,
                unusedDefault,
                unusedAllianz,
                usedSerials
            }
        });
    } catch (error) {
        console.error('Error in /admin/serial-numbers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.patch('/form-submissions/:id/status', async (req, res) => {
    const { id } = req.params; const { status } = req.body;

    const updateData = { status };
    if (status === 'Issued') {
        updateData.date_issued = new Date().toISOString();
    }

    await supabase.from('az_submissions').update(updateData).eq('sub_id', id);
    res.json({ success: true });
});

module.exports = router;
