const client = require('../prisma/client');

const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await client.user.findUnique({
            where: {
                id: req.userId.id,
            },
        });
        if (user.role !== 'SUPERADMIN') {
            return res.status(403).json({ error: 'You are not authorized to perform this action' });
        }
        next();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
}

module.exports = isSuperAdmin;