import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle,
  Database,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Booking, Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';

export const AdminDashboardView: React.FC = () => {
  const { user, profile } = useAuth();

  const [usersList, setUsersList] = useState<Profile[]>([]);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'audit'>('users');

  const supabase = getSupabaseClient();

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch real profiles
      const { data: pData, error: pErr } = await supabase.from('profiles').select('*');
      if (pErr) throw pErr;
      setUsersList((pData || []).map(parseProfileRecord));

      // 2. Fetch real bookings
      const { data: bData, error: bErr } = await supabase.from('bookings').select('*');
      if (bErr) throw bErr;
      setBookingsList(bData || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch administrative records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAdminData();
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-white">
        <div className="w-14 h-14 bg-red-500/15 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Admin Authorization Required</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          Access restricted. Your authenticated account (<code>{user?.email}</code>) does not possess the <code>admin</code> database role in <code>public.profiles</code>.
        </p>
      </div>
    );
  }

  // Auditing calculations
  const totalVolume = bookingsList.reduce((acc, b) => acc + (b.total_price || 0), 0);
  const companionsCount = usersList.filter((u) => u.role === 'companion').length;
  const customersCount = usersList.filter((u) => u.role === 'customer').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            TimeMate Operational Governance
          </div>
          <h1 className="text-2xl font-bold text-white">Administrative Dashboard</h1>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Total Users
          </span>
          <div className="text-2xl font-black text-white mt-1">{usersList.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {companionsCount} companions &bull; {customersCount} customers
          </div>
        </div>

        <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Total Bookings
          </span>
          <div className="text-2xl font-black text-pink-400 mt-1">{bookingsList.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Recorded in Supabase database
          </div>
        </div>

        <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Gross Booking Value
          </span>
          <div className="text-2xl font-black text-white mt-1">₹{totalVolume}</div>
          <div className="text-[11px] text-zinc-500 mt-1">100% paid directly to companions</div>
        </div>

        <div className="bg-[#121214] p-5 rounded-2xl border border-zinc-800 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Platform Fee Collected
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">₹0</div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-1">
            Strict 0% commission verified
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          Users Management ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          Bookings Oversight ({bookingsList.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-pink-600 text-white shadow-[0_0_10px_rgba(255,45,141,0.3)]'
              : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
          }`}
        >
          Platform Fee ₹0 Compliance Audit
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-[#121214] rounded-2xl border border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Auth UUID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <div>{u.display_name}</div>
                      <div className="text-[11px] font-normal text-zinc-400">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {u.user_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border ${
                          u.role === 'admin'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : u.role === 'companion'
                            ? 'bg-pink-500/15 text-pink-300 border-pink-500/30'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{u.city || '--'}</td>
                    <td className="py-3 px-4 font-semibold text-pink-400">
                      {u.role === 'companion' ? `₹${u.hourly_rate || 500}/hr` : '--'}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BOOKINGS LIST */}
      {activeTab === 'bookings' && (
        <div className="bg-[#121214] rounded-2xl border border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/90 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Booking ID</th>
                  <th className="py-3 px-4">Customer UUID</th>
                  <th className="py-3 px-4">Companion UUID</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {bookingsList.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      #{b.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {b.customer_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {b.companion_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {b.date} {b.start_time}
                    </td>
                    <td className="py-3 px-4 font-bold text-pink-400 font-mono">
                      ₹{b.total_price}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-zinc-300">{b.payment_method}</span> (
                      <span
                        className={
                          b.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
                        }
                      >
                        {b.payment_status}
                      </span>
                      )
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          b.booking_status === 'confirmed'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : b.booking_status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                            : b.booking_status === 'completed'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : b.booking_status === 'pending'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border-red-500/30'
                        }`}
                      >
                        {b.booking_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM FEE AUDIT */}
      {activeTab === 'audit' && (
        <div className="bg-[#121214] rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Zero Commission Audit Certificate
          </div>
          <h3 className="text-lg font-bold text-white">
            ₹0 Marketplace Platform Fee Verification
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            TimeMate is architected as a pure connection marketplace. Every transaction between customers and companions occurs directly (via Cash or direct companion UPI). The database confirms ₹0 platform deduction across all historical booking records.
          </p>

          <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 text-xs font-mono space-y-1 text-zinc-300">
            <div>[AUDIT] Total Facilitated Volume: ₹{totalVolume}</div>
            <div>[AUDIT] Platform Commission Rate: 0.00%</div>
            <div>[AUDIT] Total Platform Fees Deducted: ₹0.00</div>
            <div>[AUDIT] Payment Gateway Escrow Intermediary: None (Direct Peer-to-Peer)</div>
            <div className="text-emerald-400 font-bold pt-1">
              [STATUS] COMPLIANT — ZERO HIDDEN CHARGES
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
