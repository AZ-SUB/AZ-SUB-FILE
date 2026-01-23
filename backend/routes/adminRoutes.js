const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

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
