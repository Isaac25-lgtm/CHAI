'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2, Shield, ClipboardList } from 'lucide-react';

const ROLES = [
  {
    role: 'SUPER_ADMIN',
    email: 'admin@chai.org',
    label: 'Super Admin',
    description: 'Full system access — manage users, facilities, reports & settings',
    icon: Shield,
    color: 'bg-[#0F4C81]',
  },
  {
    role: 'FIELD_ASSESSOR',
    email: 'assessor@chai.org',
    label: 'Field Assessor',
    description: 'Visit facilities, conduct assessments & enter mobile money details',
    icon: ClipboardList,
    color: 'bg-green-600',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRoleSelect(email: string, role: string) {
    setLoading(role);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email,
        password: role === 'SUPER_ADMIN' ? 'ChaiAdmin2026!' : 'ChaiUser2026!',
        redirect: false,
      });

      if (result?.error) {
        setError('Login failed. Please try again.');
        setLoading(null);
        return;
      }

      router.push('/overview');
    } catch {
      setError('An unexpected error occurred.');
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#0F4C81]">
            <span className="text-2xl font-bold text-white">C</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            CHAI Uganda PMTCT Platform
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Testing Mode — Select your role to continue
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Role Cards */}
        <div className="space-y-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const isLoading = loading === r.role;
            const isDisabled = loading !== null;

            return (
              <button
                key={r.role}
                onClick={() => handleRoleSelect(r.email, r.role)}
                disabled={isDisabled}
                className="flex w-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-[#0F4C81] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${r.color}`}>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Icon className="h-6 w-6 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{r.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{r.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-400">
          CHAI PMTCT Quality Improvement System — Development Mode
        </p>
      </div>
    </div>
  );
}
