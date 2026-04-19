
/**
 * Calculates payment statistics for a specific worker and department.
 * @param {Object} masterData The global master data object.
 * @param {string} name Worker name.
 * @param {string} dept Department (sewing, stone, pata, outside, etc).
 * @returns {Object} An object containing total earned, total paid, and balance.
 */
export const getWorkerBalance = (masterData, name, dept) => {
    if (!masterData || !name || !dept) return { earned: 0, paid: 0, balance: 0 };

    const role = dept.toLowerCase();
    
    // 1. Calculate Earnings
    let earned = 0;
    if (role === 'pata') {
        earned = (masterData.pataEntries || [])
            .filter(e => e.worker === name && e.status === 'Received')
            .reduce((acc, e) => acc + Number(e.amount || 0), 0);
    } else {
        earned = (masterData.productions || [])
            .filter(p => p.worker === name && p.status === 'Received' && p.type === role)
            .reduce((acc, b) => {
                const design = (masterData.designs || []).find(d => d.name === b.design);
                const netBorka = Number(b.receivedBorka || 0);
                const netHijab = Number(b.receivedHijab || 0);
                const penalty = Number(b.penalty || 0);
                
                let earnings = 0;
                if (role === 'sewing') {
                    const bRate = Number(b.rate || design?.sewingRate || 0);
                    const hRate = Number(design?.hijabRate || bRate);
                    earnings = (netBorka * bRate) + (netHijab * hRate);
                } else if (role === 'stone') {
                    const rate = Number(b.rate || design?.stoneRate || 0);
                    earnings = ((netBorka + netHijab) * rate);
                } else if (role === 'outside') {
                    const rate = Number(b.rate || design?.outsideRate || 0);
                    earnings = ((netBorka + netHijab) * rate);
                }
                return acc + (Number(earnings) || 0) - penalty;
            }, 0);
    }

    // 2. Calculate Payments
    const paid = (masterData.workerPayments || [])
        .filter(p => p.worker === name && p.dept === role)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);

    return {
        earned,
        paid,
        balance: earned - paid
    };
};

/**
 * Common logic to generate a production ID.
 */
export const generateId = (prefix = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Standard log formatter for consistent audit logs.
 */
export const formatAuditLog = (user, action, details) => ({
    timestamp: new Date().toISOString(),
    user: user?.name || 'Unknown',
    role: user?.role || 'System',
    action,
    details
});
