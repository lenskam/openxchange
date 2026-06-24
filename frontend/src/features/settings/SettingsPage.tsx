import { useCallback, useEffect, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import api from "../../services/api";
import LoadingSpinner from "../../components/common/LoadingSpinner";

const tabs = [
  "Profile",
  "Organization",
  "Notifications",
  "Security",
  "System",
] as const;
type Tab = (typeof tabs)[number];

interface ProfileData {
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  two_factor_enabled?: boolean;
}

interface OrgData {
  org_name?: string;
  country?: string;
  primary_contact_email?: string;
  support_email?: string;
  platform_name?: string;
  primary_color?: string;
}

interface NotifData {
  email_notifications?: boolean;
  workflow_failure_alerts?: boolean;
  daily_digest?: boolean;
  slack_webhook_url?: string;
  digest_time?: string;
  [key: string]: unknown;
}

interface SystemData {
  default_date_format?: string;
  default_timezone?: string;
  log_retention_days?: number;
  max_concurrent_workflows?: number;
}

interface ApiKeyData {
  id: number;
  name: string;
  key_prefix: string;
  is_active: boolean;
  created_at?: string;
  full_key?: string;
}

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [snack, setSnack] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileData>({});
  const [org, setOrg] = useState<OrgData>({});
  const [notif, setNotif] = useState<NotifData>({});
  const [system, setSystem] = useState<SystemData>({});
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, orgRes, notifRes, sysRes, keysRes] =
        await Promise.allSettled([
          api.get("/auth/me"),
          api.get("/settings/organization"),
          api.get("/settings/notifications"),
          api.get("/settings/system"),
          api.get("/settings/api-keys"),
        ]);
      if (meRes.status === "fulfilled") setProfile(meRes.value.data);
      if (orgRes.status === "fulfilled") setOrg(orgRes.value.data);
      if (notifRes.status === "fulfilled") setNotif(notifRes.value.data);
      if (sysRes.status === "fulfilled") setSystem(sysRes.value.data);
      if (keysRes.status === "fulfilled") setApiKeys(keysRes.value.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateOrg = async (data: OrgData) => {
    try {
      const res = await api.put("/settings/organization", data);
      setOrg(res.data);
      setSnack({ message: "Organization settings saved", severity: "success" });
    } catch {
      setSnack({
        message: "Failed to save organization settings",
        severity: "error",
      });
    }
  };

  const updateNotif = async (data: NotifData) => {
    try {
      const res = await api.put("/settings/notifications", data);
      setNotif(res.data);
      setSnack({ message: "Notification settings saved", severity: "success" });
    } catch {
      setSnack({
        message: "Failed to save notification settings",
        severity: "error",
      });
    }
  };

  const updateSystem = async (data: SystemData) => {
    try {
      const res = await api.put("/settings/system", data);
      setSystem(res.data);
      setSnack({ message: "System settings saved", severity: "success" });
    } catch {
      setSnack({
        message: "Failed to save system settings",
        severity: "error",
      });
    }
  };

  const updateProfile = async (data: ProfileData) => {
    try {
      const res = await api.put("/auth/me", data);
      setProfile(res.data);
      setSnack({ message: "Profile updated", severity: "success" });
    } catch {
      setSnack({ message: "Failed to update profile", severity: "error" });
    }
  };

  const changePassword = async (current: string, next: string) => {
    try {
      await api.put("/auth/me/password", {
        current_password: current,
        new_password: next,
      });
      setSnack({ message: "Password changed", severity: "success" });
    } catch {
      setSnack({ message: "Failed to change password", severity: "error" });
    }
  };

  const createApiKey = async (name: string) => {
    try {
      const res = await api.post("/settings/api-keys", { name });
      setApiKeys((prev) => [...prev, res.data]);
      setSnack({
        message: `API key created: ${res.data.full_key}`,
        severity: "success",
      });
    } catch {
      setSnack({ message: "Failed to create API key", severity: "error" });
    }
  };

  const revokeApiKey = async (id: number) => {
    try {
      await api.delete(`/settings/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      setSnack({ message: "API key revoked", severity: "success" });
    } catch {
      setSnack({ message: "Failed to revoke API key", severity: "error" });
    }
  };

  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "" });
  const [orgForm, setOrgForm] = useState<OrgData>({});
  const [notifForm, setNotifForm] = useState<NotifData>({});
  const [sysForm, setSysForm] = useState<SystemData>({});
  const [newKeyName, setNewKeyName] = useState("");

  useEffect(() => {
    if (profile.full_name)
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
      });
    if (org.org_name) setOrgForm(org);
    if (notif.email_notifications !== undefined) setNotifForm(notif);
    if (system.log_retention_days) setSysForm(system);
  }, [profile, org, notif, system]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-slide-in max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col justify-center">
          <h2 className="text-heading-lg text-on-surface mb-2">
            Configure Your Environment
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Manage your personal profile, team permissions, and platform-wide
            security protocols from a single centralized dashboard.
          </p>
        </div>
        <div className="bg-primary-container text-on-primary-container rounded-xl p-8 flex flex-col justify-between overflow-hidden relative group">
          <div className="z-10">
            <span className="material-symbols-outlined text-4xl mb-4">
              verified_user
            </span>
            <h3 className="text-heading-md mb-1">Security Score: 94%</h3>
            <p className="text-body-md opacity-90">
              Your account is well protected. Two-factor authentication is
              active.
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <span className="material-symbols-outlined text-[120px]">
              security
            </span>
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
                ? "text-primary font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "Profile" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center flex flex-col items-center">
              <div className="relative group cursor-pointer mb-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-surface shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center text-4xl font-bold text-on-primary-container border-4 border-surface shadow-md">
                    {(profile.full_name || "??")
                      .split(" ")
                      .map((s: string) => s[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <h4 className="text-heading-md text-on-surface">
                {profile.full_name || "User"}
              </h4>
              <p className="text-body-md text-on-surface-variant mb-6">
                {profile.email}
              </p>
            </div>
            <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm((p) => ({
                        ...p,
                        full_name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) =>
                      setProfileForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                    Role
                  </label>
                  <div className="bg-surface-container-high border border-outline-variant rounded-lg px-4 py-3 text-body-md text-on-surface-variant flex items-center justify-between">
                    <span className="capitalize">
                      {profile.role || "viewer"}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">
                      lock
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant italic">
                    Roles can only be modified by the System Owner.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => updateProfile(profileForm)}
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
                <h3 className="text-heading-md text-on-surface">
                  Change Password
                </h3>
                <p className="text-body-md text-on-surface-variant">
                  Update your account credentials to maintain security.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                  Current Password
                </label>
                <input
                  className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                  type="password"
                  value={pwForm.current}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, current: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                  New Password
                </label>
                <input
                  className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                  type="password"
                  value={pwForm.next}
                  onChange={(e) =>
                    setPwForm((p) => ({ ...p, next: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    changePassword(pwForm.current, pwForm.next);
                    setPwForm({ current: "", next: "" });
                  }}
                  disabled={!pwForm.current || !pwForm.next}
                  className="w-full px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Organization" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          <h3 className="text-heading-md text-on-surface mb-6">
            Organization Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Organization Name
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={orgForm.org_name || ""}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, org_name: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Country
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={orgForm.country || ""}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, country: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Primary Contact Email
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                type="email"
                value={orgForm.primary_contact_email || ""}
                onChange={(e) =>
                  setOrgForm({
                    ...orgForm,
                    primary_contact_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Support Email
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                type="email"
                value={orgForm.support_email || ""}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, support_email: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Platform Name
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={orgForm.platform_name || ""}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, platform_name: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Primary Color
              </label>
              <div className="flex gap-3 items-center">
                <input
                  className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all flex-1"
                  value={orgForm.primary_color || ""}
                  onChange={(e) =>
                    setOrgForm({ ...orgForm, primary_color: e.target.value })
                  }
                />
                <div
                  className="w-10 h-10 rounded-lg border border-outline-variant"
                  style={{
                    backgroundColor: orgForm.primary_color || "#1976D2",
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => updateOrg(orgForm)}
              className="px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === "Notifications" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 space-y-6">
          <h3 className="text-heading-md text-on-surface mb-6">
            Notification Preferences
          </h3>
          {[
            {
              key: "email_notifications",
              label: "Email Notifications",
              desc: "Receive email alerts for important events",
            },
            {
              key: "workflow_failure_alerts",
              label: "Workflow Failure Alerts",
              desc: "Get notified when a workflow execution fails",
            },
            {
              key: "daily_digest",
              label: "Daily Digest",
              desc: "Receive a daily summary of all activities",
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-3 border-b border-outline-variant last:border-0"
            >
              <div>
                <p className="text-body-md text-on-surface font-medium">
                  {item.label}
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  {item.desc}
                </p>
              </div>
              <button
                onClick={() =>
                  setNotifForm((f: NotifData) => ({
                    ...f,
                    [item.key]: !f[item.key],
                  }))
                }
                className={`w-12 h-7 rounded-full transition-colors relative ${notifForm[item.key] ? "bg-primary" : "bg-surface-container-high"}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${notifForm[item.key] ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          ))}
          <div className="flex flex-col gap-2 pt-4">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
              Slack Webhook URL
            </label>
            <input
              className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              placeholder="https://hooks.slack.com/services/..."
              value={notifForm.slack_webhook_url || ""}
              onChange={(e) =>
                setNotifForm((f: NotifData) => ({
                  ...f,
                  slack_webhook_url: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
              Digest Time
            </label>
            <input
              className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all max-w-[120px]"
              type="time"
              value={notifForm.digest_time || "08:00"}
              onChange={(e) =>
                setNotifForm((f: NotifData) => ({
                  ...f,
                  digest_time: e.target.value,
                }))
              }
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => updateNotif(notifForm)}
              className="px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {activeTab === "Security" && (
        <div className="space-y-8">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <h3 className="text-heading-md text-on-surface mb-6">
              Two-Factor Authentication
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-md text-on-surface font-medium">
                  2FA Protection
                </p>
                <p className="text-body-sm text-on-surface-variant">
                  Add an extra layer of security to your account
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-label-md text-on-surface-variant">
                  {profile.two_factor_enabled ? "Enabled" : "Disabled"}
                </span>
                <button className="px-4 py-2 bg-primary text-on-primary text-label-md rounded-lg hover:opacity-90 transition-all">
                  {profile.two_factor_enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
            <h3 className="text-heading-md text-on-surface mb-6">API Keys</h3>
            <div className="flex gap-3 mb-6">
              <input
                className="flex-1 bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="New key name..."
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <button
                onClick={() => {
                  if (newKeyName) {
                    createApiKey(newKeyName);
                    setNewKeyName("");
                  }
                }}
                disabled={!newKeyName}
                className="px-6 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            {apiKeys.length === 0 ? (
              <p className="text-body-md text-on-surface-variant text-center py-8">
                No API keys created yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="px-4 py-3 text-label-md text-on-surface-variant">
                        Name
                      </th>
                      <th className="px-4 py-3 text-label-md text-on-surface-variant">
                        Key Prefix
                      </th>
                      <th className="px-4 py-3 text-label-md text-on-surface-variant">
                        Status
                      </th>
                      <th className="px-4 py-3 text-label-md text-on-surface-variant">
                        Created
                      </th>
                      <th className="px-4 py-3 text-label-md text-on-surface-variant">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {apiKeys.map((key: ApiKeyData) => (
                      <tr
                        key={key.id}
                        className="hover:bg-surface-container transition-colors"
                      >
                        <td className="px-4 py-3 text-body-md">{key.name}</td>
                        <td className="px-4 py-3 text-code-sm text-on-surface-variant">
                          {key.key_prefix}...
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-label-sm px-2 py-0.5 rounded-full ${key.is_active ? "bg-primary-fixed text-primary" : "bg-surface-container-high text-on-surface-variant"}`}
                          >
                            {key.is_active ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-body-md text-on-surface-variant">
                          {key.created_at
                            ? new Date(key.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {key.is_active && (
                            <button
                              onClick={() => revokeApiKey(key.id)}
                              className="px-3 py-1.5 text-label-sm bg-error-container text-error rounded-lg hover:opacity-80 transition-all"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "System" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8">
          <h3 className="text-heading-md text-on-surface mb-6">
            System Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Default Date Format
              </label>
              <select
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={sysForm.default_date_format || "YYYY-MM-DD"}
                onChange={(e) =>
                  setSysForm((f: SystemData) => ({
                    ...f,
                    default_date_format: e.target.value,
                  }))
                }
              >
                <option>YYYY-MM-DD</option>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Default Timezone
              </label>
              <select
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                value={sysForm.default_timezone || "UTC"}
                onChange={(e) =>
                  setSysForm((f: SystemData) => ({
                    ...f,
                    default_timezone: e.target.value,
                  }))
                }
              >
                <option>UTC</option>
                <option>America/New_York</option>
                <option>America/Chicago</option>
                <option>America/Denver</option>
                <option>America/Los_Angeles</option>
                <option>Europe/London</option>
                <option>Europe/Berlin</option>
                <option>Asia/Tokyo</option>
                <option>Asia/Shanghai</option>
                <option>Africa/Nairobi</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Log Retention (days)
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                type="number"
                value={sysForm.log_retention_days || 90}
                onChange={(e) =>
                  setSysForm((f: SystemData) => ({
                    ...f,
                    log_retention_days: parseInt(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-label-md text-on-surface-variant uppercase tracking-wider">
                Max Concurrent Workflows
              </label>
              <input
                className="bg-surface border border-outline-variant rounded-lg px-4 py-3 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                type="number"
                value={sysForm.max_concurrent_workflows || 5}
                onChange={(e) =>
                  setSysForm((f: SystemData) => ({
                    ...f,
                    max_concurrent_workflows: parseInt(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => updateSystem(sysForm)}
              className="px-8 py-2.5 bg-primary text-on-primary text-label-md rounded-lg shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack?.severity || "info"} variant="filled">
          {snack?.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SettingsPage;
