import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, hasAdminAccess } from '@/hooks/use-auth';

interface ProtectedAdminRouteProps {
    children: React.ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const isAdmin = hasAdminAccess();

    if (!isAuthenticated) {
        // Redirect to login page if not authenticated
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAdmin) {
        // Redirect to home page if not an admin
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
} 