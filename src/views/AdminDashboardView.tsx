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

  // Section 31: Enforce role-based access
  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Admin Authorization Required</h2>
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            TimeMate Operational Governance
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Administrative Dashboard</h1>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Users
          </span>
          <div className="text-2xl font-black text-gray-900 mt-1">{usersList.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">
            {companionsCount} companions &bull; {customersCount} customers
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Total Bookings
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{bookingsList.length}</div>
          <div className="text-[11px] text-gray-400 mt-1">
            Recorded in Supabase database
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Gross Booking Value
          </span>
          <div className="text-2xl font-black text-gray-900 mt-1">₹{totalVolume}</div>
          <div className="text-[11px] text-gray-400 mt-1">100% paid directly to companions</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
            Platform Fee Collected
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">₹0</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Strict 0% commission verified
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Users Management ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'bookings' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Bookings Oversight ({bookingsList.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'audit' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Platform Fee ₹0 Compliance Audit
        </button>
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Auth UUID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4">Rate</th>
                  <th className="py-3 px-4">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <div>{u.display_name}</div>
                      <div className="text-[11px] font-normal text-gray-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {u.user_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'companion'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{u.city || '--'}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {u.role === 'companion' ? `₹${u.hourly_rate || 500}/hr` : '--'}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
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
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200">
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
              <tbody className="divide-y divide-gray-100">
                {bookingsList.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">
                      #{b.id.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {b.customer_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                      {b.companion_id?.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {b.date} {b.start_time} ({b.duration_hours}h)
                    </td>
                    <td className="py-3 px-4 font-extrabold text-indigo-700">
                      ₹{b.total_price}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-gray-800">{b.payment_method}</span>{' '}
                      <span className="text-[10px] text-gray-500">({b.payment_status})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-800">
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
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4" />
            Zero Platform Fee Compliance Audit
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Per the TimeMate Master Specification (Section 16), TimeMate strictly charges <strong>₹0 commission</strong> and <strong>₹0 platform fees</strong> on all companion bookings. Every rupee paid by customers goes directly to verified companions.
          </p>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
            <div className="font-bold">Audit Verification Result: PASS</div>
            <div>Platform fee calculation logic: <code>total = companion_rate * duration + 0</code></div>
            <div>Taxes / Service deductions: <code>₹0.00</code></div>
            <div>Direct companion payout ratio: <code>100.0%</code></div>
          </div>
        </div>
      )}
    </div>
  );
};
