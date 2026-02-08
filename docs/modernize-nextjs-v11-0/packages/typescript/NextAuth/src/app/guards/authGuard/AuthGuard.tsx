'use client'
import { redirect, usePathname } from "next/navigation";
import { useEffect } from 'react';
import useAuth from "./UseAuth";



const AuthGuard = ({ children }: any) => {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      redirect('/auth/auth1/login');
    }
  }, [isAuthenticated, pathname]);

  return children;
};

export default AuthGuard;




