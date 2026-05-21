import { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const tabs = ['Profile', 'Organization', 'Notifications', 'Security', 'System'] as const;
type Tab = typeof tabs[number];

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Profile');
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  return (
    <div className="animate-slide-in max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col justify-center">
          <h2 className="text-headline-lg text-on-surface mb-2">Configure Your Environment</h2>
          <p className="text-body-lg text-on-surface-variant">Manage your personal profile, team permissions, and platform-wide security protocols from a single centralized dashboard.</p>
        </div>
        <div className="bg-primary-container text-on-primary-container rounded-xl p-8 flex flex-col justify-between overflow-hidden relative group">
          <div className="z-10">
            <span className="material-symbols-outlined text-4xl mb-4">verified_user</span>
            <h3 className="text-headline-md mb-1">Security Score: 94%</h3>
            <p className="text-body-md opacity-90">Your account is well protected. Two-factor authentication is active.</p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <span className="material-symbols-outlined text-[120px]">security</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center border-b border-outline-variant mb-8 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-4 text-label-md transition-colors relative ${
              activeTab === tab
                ? 'text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Profile' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center flex flex-col items-center">
              <div className="relative group cursor-pointer mb-4">
                <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center text-4xl font-bold text-on-primary-container border-4 border-surface shadow-md">
                  AJ
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </div>
              </div>
              <h4 className="text-headline-md text-on-surface">Alex Johnson</h4>
              <p className="text-body-md text-on-surface-variant mb-6">alex.johnson@interexchange.io</p>
              <button className="w-full py-2.5 px-4 bg-secondary-container text-on-secondary-container text-label-md rounded-lg hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Change Photo
              </button>
            </div>
            <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">First Name</label>
                  <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" type="text" defaultValue="Alex" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Last Name</label>
                  <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" type="text" defaultValue="Johnson" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Email Address</label>
                  <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" type="email" defaultValue="alex.johnson@interexchange.io" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Role</label>
                  <div className="bg-surface-container-high border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface-variant flex items-center justify-between">
                    <span>Administrator</span>
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant italic">Roles can only be modified by the System Owner.</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setSnack({ message: 'Profile updated successfully', severity: 'success' })}
                  className="px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center">
                <span className="material-symbols-outlined">password</span>
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">Change Password</h3>
                <p className="text-body-md text-on-surface-variant">Update your account credentials to maintain security.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Current Password</label>
                <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="••••••••" type="password" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">New Password</label>
                <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="••••••••" type="password" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                <input className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="••••••••" type="password" />
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <button className="px-6 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container transition-colors rounded-lg">Cancel</button>
              <button
                onClick={() => setSnack({ message: 'Password updated successfully', severity: 'success' })}
                className="px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
              >
                Update Password
              </button>
            </div>
          </div>

          <div className="bg-error-container/20 border border-error/20 rounded-xl p-8">
            <h3 className="text-headline-md text-error mb-2">Danger Zone</h3>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-on-surface font-bold">Delete Account</p>
                <p className="text-body-md text-on-surface-variant">Once you delete your account, there is no going back. Please be certain.</p>
              </div>
              <button
                onClick={() => setSnack({ message: 'This action is not available in demo mode', severity: 'error' })}
                className="px-6 py-2.5 bg-error text-on-error text-label-md rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'Profile' && (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant">construction</span>
          </div>
          <h3 className="text-headline-md text-on-surface">Section Under Development</h3>
          <p className="text-body-lg text-on-surface-variant max-w-md">
            The <span className="font-bold">{activeTab}</span> configuration panel is currently being finalized for high-precision workflows.
          </p>
          <button
            onClick={() => setActiveTab('Profile')}
            className="mt-6 text-primary text-label-md flex items-center gap-2 hover:underline"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Return to Profile Settings
          </button>
        </div>
      )}

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack?.severity || 'info'} variant="filled">{snack?.message}</Alert>
      </Snackbar>
    </div>
  );
};

export default SettingsPage;
