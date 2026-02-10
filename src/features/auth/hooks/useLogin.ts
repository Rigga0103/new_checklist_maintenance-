"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginCredentialsApi, signupUserApi } from "../server/api/authApi";
import { LoginFormData, SignupFormData, UserData } from "../types/types";
import supabase from "@/utils/supabaseClient";

type ThemeMode = "light" | "dark" | "system";

export function useLogin() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<SignupFormData>({
    username: "",
    password: "",
    email: "",
    confirmPassword: "",
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("theme") as ThemeMode) || "system";
  });

  const applyTheme = useCallback((selectedTheme: ThemeMode) => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    if (selectedTheme === "system") {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      root.classList.toggle("dark", systemDark);
    } else {
      root.classList.toggle("dark", selectedTheme === "dark");
    }
  }, []);

  // Theme handling effect (only apply, don't set state again if not needed)
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const cycleTheme = useCallback(() => {
    const themes: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  // Real-time user status listener
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.channel>;
    const checkUserStatus = async () => {
      const username = localStorage.getItem("user-name");
      if (!username) return;

      subscription = supabase
        .channel("user-status-watch")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            filter: `user_name=eq.${username}`,
          },
          (payload) => {
            if (payload.new && (payload.new as UserData).status !== "active") {
              localStorage.clear();
              toast.error("Your account has been deactivated.");
              setTimeout(() => router.push("/login"), 2000);
            }
          },
        )
        .subscribe();
    };
    checkUserStatus();
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [router]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isLoginMode) {
        setIsLoginLoading(true);
        try {
          const result = await loginCredentialsApi({
            username: formData.username,
            password: formData.password,
          });

          if (result.error) {
            toast.error(result.error);
            setIsLoginLoading(false);
            return;
          }

          if (result.data) {
            localStorage.setItem(
              "user-name",
              result.data.user_name || result.data.username || "",
            );
            localStorage.setItem("user_id", String(result.data.id || ""));
            localStorage.setItem("role", result.data.role || "");
            localStorage.setItem(
              "email_id",
              result.data.email_id || result.data.email || "",
            );
            toast.success("Login successful!");
            router.push("/dashboard");
          }
        } catch (err) {
          toast.error("An error occurred during login");
          setIsLoginLoading(false);
        }
      } else {
        // Signup
        if (formData.password !== formData.confirmPassword) {
          toast.error("Passwords do not match");
          return;
        }
        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
        }

        setIsSignupLoading(true);
        try {
          const result = await signupUserApi({
            username: formData.username,
            password: formData.password,
            email: formData.email,
          });

          if (result.error) {
            toast.error(result.error);
            setIsSignupLoading(false);
            return;
          }

          if (result.data) {
            toast.success("Account created successfully!");
            localStorage.setItem("user-name", result.data.user_name || "");
            localStorage.setItem("user_id", String(result.data.id || ""));
            localStorage.setItem("role", result.data.role || "");
            localStorage.setItem("email_id", result.data.email_id || "");
            setTimeout(() => router.push("/dashboard"), 1000);
          }
        } catch (err) {
          toast.error("An error occurred during signup");
          setIsSignupLoading(false);
        }
      }
    },
    [formData, isLoginMode, router],
  );

  const toggleMode = useCallback(() => {
    setIsLoginMode(!isLoginMode);
    setFormData({ username: "", password: "", email: "", confirmPassword: "" });
  }, [isLoginMode]);

  return {
    // State
    isLoginMode,
    isLoginLoading,
    isSignupLoading,
    showPassword,
    showConfirmPassword,
    theme,
    formData,

    // Actions
    setShowPassword,
    setShowConfirmPassword,
    handleChange,
    handleSubmit,
    toggleMode,
    cycleTheme,
  };
}
