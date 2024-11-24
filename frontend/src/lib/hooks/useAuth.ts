'use client';

import { User } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AUTH_COOKIES, fetchApi, getRoleSpecificToken } from "../api";

export function useAuth(role: 'teacher' | 'student') {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;
        console.log('useAuth effect running for role:', role);

        const validateAuthentication = async () => {
            try {
                const token = getRoleSpecificToken(role);
                
                if (!token) {
                    console.log('No token found, redirecting to login');
                    if (mounted) {
                        setUser(null);
                        setLoading(false);
                    }
                    router.push('/login');
                    return;
                }

                console.log('Validating token for', role);
                
                const userData = await fetchApi<User>('/auth/validate', {
                    method: 'GET'
                }, role);

                console.log('User validated:', userData);

                if (!mounted) return;

                if (userData.role.toLowerCase() !== role) {
                    console.log('Role mismatch, redirecting');
                    const correctPath = userData.role.toLowerCase() === 'teacher' ? '/teacher' : '/student';
                    router.refresh();
                    router.push(correctPath);
                    return;
                }

                setUser(userData);
                setLoading(false)

            } catch (error) {
                console.error('Authentication validation failed:', error);
                
                if (!mounted) return;
                setUser(null);
                setLoading(false);

                if (window.location.pathname !== '/login') {
                    router.refresh();
                    router.push('/login');
                }
                
                
            } 
        };

        validateAuthentication();

        return () => {
            mounted = false;
        };
    }, [role, router]);

    return { user, loading };
}