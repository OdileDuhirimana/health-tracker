"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl p-8">
        <div className="mb-8">
          <Logo size="large" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Forgot Password</h1>
        <p className="text-sm text-gray-600 mb-8">
          Enter your email address and we'll send you instructions to reset your password.
        </p>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
              If an account exists with that email, we've sent password reset instructions.
            </div>
            <Link
              href="/login"
              className="block w-full text-center px-4 py-3 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] shadow-md transition-all"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Email
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 rounded-lg bg-[#0066cc] text-white font-semibold hover:bg-[#0052a3] focus:outline-none focus:ring-2 focus:ring-[#0066cc] focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all"
            >
              Send Reset Instructions
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-sm text-[#0066cc] hover:text-[#0052a3] font-semibold transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
