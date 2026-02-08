"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Hardcoded credentials for internal testing
const VALID_CREDENTIALS = {
    username: "rohan-testing",
    password: "testing123",
};

interface AuthContextType {
    isAuthenticated: boolean;
    username: string | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is already authenticated (from localStorage)
        const storedAuth = localStorage.getItem("tiktok-creative-auth");
        if (storedAuth) {
            const { username: storedUsername, authenticated } = JSON.parse(storedAuth);
            if (authenticated) {
                setIsAuthenticated(true);
                setUsername(storedUsername);
            }
        }
        setIsLoading(false);
    }, []);

    const login = (inputUsername: string, inputPassword: string): boolean => {
        if (
            inputUsername === VALID_CREDENTIALS.username &&
            inputPassword === VALID_CREDENTIALS.password
        ) {
            setIsAuthenticated(true);
            setUsername(inputUsername);
            localStorage.setItem(
                "tiktok-creative-auth",
                JSON.stringify({ username: inputUsername, authenticated: true })
            );
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUsername(null);
        localStorage.removeItem("tiktok-creative-auth");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen gradient-bg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
