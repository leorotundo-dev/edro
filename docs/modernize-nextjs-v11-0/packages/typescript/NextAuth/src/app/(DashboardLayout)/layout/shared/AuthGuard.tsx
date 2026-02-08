import { useNavigate } from 'react-router';
import { useEffect } from 'react';
import useAuth from '@/app/guards/authGuard/UseAuth';


const AuthGuard = ({ children }: any) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return children;
};

export default AuthGuard;
