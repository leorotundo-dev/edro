import { requireRoles } from './rbac';

export const requireAdmin = requireRoles(['admin']);

export default requireAdmin;
