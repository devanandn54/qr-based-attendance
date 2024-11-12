'use client'
import { User } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApi } from "../api";

function getCookieValue(name: string) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = getCookieValue('token');
        const role = getCookieValue('role');

        if(!token || !role) {
            setLoading(false);
            router.push('/login');
            return;
        }

        //validate token 
        fetchApi<User>('/auth/validate', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(userData => {
            setUser(userData);
            setLoading(false);
        })
        .catch(() => {
            document.cookie = 'token=; Max-Age=0';
            document.cookie = 'role=; Max-Age=0';
            router.push('/login');
            setLoading(false);
        });
    }, [router]);
    return { user, loading };
}