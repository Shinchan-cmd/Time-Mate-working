import React, { useState } from 'react';
import { ArrowLeft, Mail, Shield, X } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: 'terms' | 'privacy' | 'safety';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialSection = 'terms',
}) => {
  const [section, setSection] = useState<'terms' | 'privacy' | 'safety'>(initialSection);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 md:p-8 shadow-2xl border border-gray-100 my-auto max-h-[90vh] flex flex-col">
        {/* Sticky Mobile & Desktop Top Bar with Back and Close */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer shadow-xs"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-semibold text-gray-500">Legal &amp; Safety</span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 hover:text-gray-900 transition-colors shadow-xs cursor-pointer"
            aria-label="Close legal modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <button
            onClick={() => setSection('terms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              section === 'terms' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Terms of Service
          </button>
          <button
            onClick={() => setSection('privacy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              section === 'privacy' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setSection('safety')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              section === 'safety' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Safety Guidelines
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs text-gray-700 leading-relaxed">
          {section === 'terms' && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Terms and Conditions</h3>
              <p>
                Welcome to Time Mate. TimeMate is an online marketplace connecting customers with independent companions for social events, scheduled activities, and personal accompaniment.
              </p>
              <h4 className="font-bold text-gray-900 mt-3 mb-1">1. Lawful Companionship Only</h4>
              <p>
                All interactions through TimeMate must be strictly lawful and consensual. TimeMate strictly prohibits any adult, escort, or illicit services. Violators will face immediate profile termination and reporting to legal authorities.
              </p>
              <h4 className="font-bold text-gray-900 mt-3 mb-1">2. Zero Platform Fee Guarantee</h4>
              <p>
                TimeMate charges a ₹0 platform fee / commission on all companion bookings. Customers pay the companion's listed hourly rate directly with zero platform deductions.
              </p>
              <h4 className="font-bold text-gray-900 mt-3 mb-1">3. Direct Settlement</h4>
              <p>
                Payments are settled directly between customer and companion either in cash on meetup or through the companion's verified online payment channel (e.g. UPI).
              </p>
            </div>
          )}

          {section === 'privacy' && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Privacy &amp; Data Security</h3>
              <p>
                TimeMate respects your personal data. User accounts and authentication credentials are secure and managed through industry-standard cryptographic sessions via Supabase.
              </p>
              <h4 className="font-bold text-gray-900 mt-3 mb-1">Location Data Protection</h4>
              <p>
                Device location coordinates are only captured when authorized. Live tracking is active exclusively for confirmed participants during the active window of a confirmed booking and is never publicly broadcast or sold to third parties.
              </p>
            </div>
          )}

          {section === 'safety' && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2">Community Safety Expectations</h3>
              <ul className="list-disc pl-4 space-y-2">
                <li><strong>Public Venues:</strong> All first-time meetups must take place in open, public venues (e.g. cafes, restaurants, malls, networking conventions).</li>
                <li><strong>Emergency Assistance:</strong> In case of any discomfort or safety concern, leave the venue immediately and notify authorities.</li>
                <li><strong>Support Contact:</strong> For any disputes, reports, or questions, reach out to our dedicated support team at <strong>support.timemate@gmail.com</strong>.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Support Info */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-600" />
            <span>Support: <strong>support.timemate@gmail.com</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
