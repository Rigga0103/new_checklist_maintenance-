"use client";

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { useLogin } from "../hooks/useLogin";

export default function MainLogin() {
  const {
    isLoginMode,
    isLoginLoading,
    isSignupLoading,
    showPassword,
    showConfirmPassword,
    formData,
    setShowPassword,
    setShowConfirmPassword,
    handleChange,
    handleSubmit,
    toggleMode,
  } = useLogin();

  return (
    <div className="flex items-center justify-center w-full min-h-screen p-6 transition-colors duration-300 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 shadow-lg rounded-xl bg-primary">
            <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
            Checklist and Delegation
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border shadow-xl border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 rounded-xl">
          {/* Card Header */}
          <div className="p-6 pb-4 space-y-1">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {isLoginMode ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400">
              {isLoginMode
                ? "Enter your credentials to access your account"
                : "Fill in your details to get started"}
            </p>
          </div>

          {/* Card Content */}
          <div className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-neutral-400" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Email - Signup only */}
              {!isLoginMode && (
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-neutral-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* Role Selection - Signup only */}
              {!isLoginMode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Role
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        checked={formData.role === "user"}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        User
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formData.role === "admin"}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Admin
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-neutral-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-10 pr-10 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute -translate-y-1/2 right-3 top-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password - Signup only */}
              {!isLoginMode && (
                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-neutral-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute -translate-y-1/2 right-3 top-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoginLoading || isSignupLoading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 text-primary-foreground font-medium rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoginMode ? (
                  isLoginLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </>
                  )
                ) : isSignupLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </>
                )}
              </button>

              {/* Toggle Mode */}
              <div className="pt-4 text-center">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {isLoginMode
                    ? "Don't have an account? "
                    : "Already have an account? "}
                </span>
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm font-medium text-foreground hover:text-foreground/80 hover:underline"
                >
                  {isLoginMode ? "Sign up" : "Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a
            href="https://www.botivate.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm transition-colors text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Powered by <span className="font-medium">Botivate</span>
          </a>
        </div>
      </div>
    </div>
  );
}
