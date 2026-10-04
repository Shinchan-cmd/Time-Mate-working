import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Copy,
  Check,
  Database,
  ExternalLink,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import {
  checkSupabaseHealth,
  getActiveSupabaseConfig,
  setCustomSupabaseConfig,
  resetSupabaseConfig,
  BackendHealthStatus,
  getSupabaseClient,
} from '../lib/supabase';

const SQL_SCHEMA_SNIPPET = `-- TIME MATE PRODUCTION DATABASE SCHEMA
-- Run this in your Supabase Dashboard -> SQL Editor

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT,
  display_name TEXT NOT NULL DEFAULT 'User',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'companion', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TEXT NOT NULL DEFAULT '14:00',
  duration_hours INT NOT NULL DEFAULT 2,
  total_price NUMERIC NOT NULL DEFAULT 1000,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'online')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'declined')),
  meeting_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = companion_id);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Participants can update their bookings" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = companion_id);

CREATE POLICY "Users can view conversations" ON public.conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can insert conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND auth.uid() = ANY(c.participant_ids))
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Public can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can submit reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);`;

export const SupabaseStatusBanner: React.FC = () => {
  const [health, setHealth] = useState<BackendHealthStatus | null>(null);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');
  const [dismissed, setDismissed] = useState<boolean>(false);

  const activeConfig = getActiveSupabaseConfig();

  const runHealthCheck = async () => {
    setChecking(true);
    const result = await checkSupabaseHealth();
    setHealth(result);

    if (result.ok) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error && error.message.includes('schema cache')) {
          setTablesExist(false);
        } else {
          setTablesExist(true);
        }
      } catch {
        setTablesExist(false);
      }
    } else {
      setTablesExist(false);
    }

    setChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl || !customKey) return;
    setCustomSupabaseConfig(customUrl, customKey);
    setShowConfigModal(false);
  };

  const handleResetToDefault = () => {
    resetSupabaseConfig();
    setShowConfigModal(false);
  };

  if (dismissed) return null;

  return (
    <>
      {/* Banner when tables need to be created in Supabase */}
      {health?.ok && tablesExist === false && (
        <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-900 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Database className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Supabase Connected (nnuuiektlsouuswxxnod):</strong> Database authentication is active. To enable companion records and bookings storage, run the schema setup.
              </span>
              <button
                onClick={() => setShowSqlModal(true)}
                className="font-bold underline text-indigo-700 hover:text-indigo-900 cursor-pointer ml-1 inline-flex items-center gap-1"
              >
                View 1-Click SQL Script
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runHealthCheck}
                disabled={checking}
                className="p-1 hover:bg-indigo-100 rounded text-indigo-700"
                title="Refresh table status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-indigo-100 rounded text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner when backend is unreachable or returns error */}
      {health && !health.ok && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">
                {health.status === 'project_removed'
                  ? `Supabase Backend Notice: Project returned HTTP 410 (Project removed / paused).`
                  : health.message || 'Connecting to Supabase PostgreSQL backend...'}
              </span>
              <button
                onClick={() => {
                  setCustomUrl(activeConfig.url);
                  setCustomKey(activeConfig.key);
                  setShowConfigModal(true);
                }}
                className="inline-flex items-center gap-1 font-semibold underline text-amber-950 hover:text-amber-800 ml-1 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Configure Supabase Credentials
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runHealthCheck}
                disabled={checking}
                className="p-1 hover:bg-amber-100 rounded text-amber-800"
                title="Test connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-amber-100 rounded text-amber-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Database className="w-4 h-4" />
                Supabase SQL Setup Script
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-semibold text-xs transition-colors shadow-xs"
                aria-label="Close SQL setup modal"
              >
                <X className="w-4 h-4" />
                <span className="sm:hidden">Close</span>
              </button>
            </div>

            <p className="text-xs text-gray-600 my-3 leading-relaxed">
              Copy this script and paste it into your{' '}
              <a
                href="https://supabase.com/dashboard/project/nnuuiektlsouuswxxnod/sql/new"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5"
              >
                Supabase SQL Editor <ExternalLink className="w-3 h-3" />
              </a>{' '}
              to initialize the tables (<code>profiles</code>, <code>bookings</code>, <code>conversations</code>, <code>messages</code>, <code>reviews</code>) and RLS policies.
            </p>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-900 text-gray-100 font-mono text-[11px]">
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={handleCopySql}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy SQL
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-y-auto max-h-[300px] leading-relaxed">
                {SQL_SCHEMA_SNIPPET}
              </pre>
            </div>

            <div className="pt-4 mt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Script is also saved locally in <code>/supabase/schema.sql</code>
              </span>
              <button
                onClick={() => {
                  setShowSqlModal(false);
                  runHealthCheck();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Credentials Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold text-lg">
                <Database className="w-5 h-5 text-indigo-600" />
                Supabase Credentials
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-semibold text-xs transition-colors shadow-xs"
                aria-label="Close credentials modal"
              >
                <X className="w-4 h-4" />
                <span className="sm:hidden">Close</span>
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supabase Anon / Publishable Key
                </label>
                <textarea
                  rows={2}
                  required
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {activeConfig.isCustom ? (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Reset to Default Project
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                  >
                    Save &amp; Reconnect
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
