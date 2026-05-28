"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "../../../store/authStore";
import { toast } from "sonner";

export default function AuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuthStore();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const accessToken = searchParams.get("accessToken");
                const refreshToken = searchParams.get("refreshToken");
                const userId = searchParams.get("userId");
                const email = searchParams.get("email");
                const name = searchParams.get("name");
                const role = searchParams.get("role");
                const error = searchParams.get("error");

                if (error) {
                    toast.error("Authentication failed. Please try again.");
                    router.push("/login");
                    return;
                }

                if (!accessToken || !email || !name) {
                    toast.error("Invalid authentication response.");
                    router.push("/login");
                    return;
                }

                // Store tokens and user data
                const userData = {
                    _id: userId,
                    email,
                    name,
                    role: role || "BUYER",
                    isOAuthUser: true
                };

                login(userData, accessToken, refreshToken);

                toast.success(`Welcome back, ${name}!`);

                // Redirect to appropriate dashboard
                const redirectUrl = role === "FARMER" ? "/dashboard/farmer" : "/dashboard/buyer";
                router.push(redirectUrl);
            } catch (err) {
                console.error("[Auth Callback] Error:", err);
                toast.error("An error occurred during login.");
                router.push("/login");
            }
        };

        handleCallback();
    }, [searchParams, login, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-agri-cream">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-agri-green mx-auto mb-4"></div>
                <p className="text-agri-green-dark font-semibold">Signing you in...</p>
            </div>
        </div>
    );
}
