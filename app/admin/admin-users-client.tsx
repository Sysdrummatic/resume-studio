"use client";

import { useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { APP_ROLES, type AppRole } from "../lib/auth-types";
import { hasCapability, isNonStaffRole, isStaffRole } from "../lib/rbac";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";

type UserOverview = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  isTestUser: boolean;
  isOcvStaff: boolean;
  createdAt: string | null;
};

type PlatformStatsView = {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalResumes: number;
  totalPublicLinks: number;
  totalPublicViews: number;
  excludedTestUsers: number;
  excludedStaffUsers: number;
};

type ApiState = {
  users: UserOverview[];
  actorRole: AppRole;
  stats: PlatformStatsView | null;
};

type Props = {
  actorRole: AppRole;
  initialUsers: UserOverview[];
  initialStats: PlatformStatsView;
};

function canRoleBeAssignedByManager(role: AppRole): boolean {
  return isNonStaffRole(role);
}

export default function AdminUsersClient({ actorRole, initialUsers, initialStats }: Props) {
  const { locale, dictionary } = useAppI18n();
  const text = dictionary.admin.text;
  const [state, setState] = useState<ApiState>({
    users: initialUsers,
    actorRole,
    stats: initialStats,
  });
  const { toast, showToast, closeToast } = useStatusToast();
  const [busyUserId, setBusyUserId] = useState("");

  async function loadUsers() {
    const response = await fetch("/api/admin/users", { method: "GET" });
    const payload = (await response.json()) as {
      error?: string;
      users?: UserOverview[];
      actor?: { role?: AppRole };
      stats?: ApiState["stats"];
    };

    if (!response.ok || payload.error) {
      showToast(payload.error || text["Failed to load users."], "error");
      return;
    }

    setState({
      users: payload.users || [],
      actorRole: payload.actor?.role || actorRole,
      stats: payload.stats || null,
    });
    closeToast();
  }

  const roleOptions = useMemo(() => {
    if (hasCapability(state.actorRole, "admin.users.role_write")) {
      return APP_ROLES;
    }
    return APP_ROLES.filter((role) => canRoleBeAssignedByManager(role));
  }, [state.actorRole]);

  async function handleRoleChange(userId: string, role: AppRole) {
    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || text["Role update failed."], "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast(text["Role updated."]);
    setBusyUserId("");
  }

  async function handleActiveToggle(userId: string, nextState: boolean) {
    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextState }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || text["Status update failed."], "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast(text["Account status updated."]);
    setBusyUserId("");
  }

  async function handleFlagToggle(userId: string, flag: "isTestUser" | "isOcvStaff", nextState: boolean) {
    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: nextState }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || text["Flag update failed."], "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast(text["User flag updated."]);
    setBusyUserId("");
  }

  async function handleDeleteUser(userId: string) {
    const confirmed = window.confirm(text["Delete this user account? This operation removes auth access."]);
    if (!confirmed) {
      return;
    }

    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || text["Delete failed."], "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast(text["User deleted."], "error");
    setBusyUserId("");
  }

  return (
    <section className="stack">
      <StatusToast toast={toast} onClose={closeToast} />

      {state.stats && (
        <div className="meta-grid">
          <p>
            <span className="meta-label">{text.Users}</span>
            <span className="meta-value">
              {formatAppMessage(text["{total} total ({active} active)"], { total: state.stats.totalUsers, active: state.stats.activeUsers })}
              {state.stats.excludedTestUsers + state.stats.excludedStaffUsers > 0
                ? ` · ${formatAppMessage(text["excluded: {test} test, {staff} staff"], { test: state.stats.excludedTestUsers, staff: state.stats.excludedStaffUsers })}`
                : ""}
            </span>
          </p>
          <p>
            <span className="meta-label">{text.Resumes}</span>
            <span className="meta-value">{state.stats.totalResumes}</span>
          </p>
          <p>
            <span className="meta-label">{text["Public Links"]}</span>
            <span className="meta-value">{state.stats.totalPublicLinks}</span>
          </p>
          <p>
            <span className="meta-label">{text["Public Views"]}</span>
            <span className="meta-value">{state.stats.totalPublicViews}</span>
          </p>
        </div>
      )}

      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>{text.Email}</th>
              <th>{text["Display name"]}</th>
              <th>{text.Role}</th>
              <th>{text.Status}</th>
              <th>{text["Test user"]}</th>
              <th>{text["OCV Staff"]}</th>
              <th>{text.Created}</th>
              <th>{text.Actions}</th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => {
              const disableRoleInput =
                busyUserId === user.id ||
                (!hasCapability(state.actorRole, "admin.users.role_write") && isStaffRole(user.role));
              const disableDelete =
                busyUserId === user.id ||
                (!hasCapability(state.actorRole, "admin.users.role_write") && isStaffRole(user.role));
              const availableRoles = roleOptions.includes(user.role) ? roleOptions : [user.role, ...roleOptions];

              return (
                <tr key={user.id}>
                  <td>{user.email || "-"}</td>
                  <td>{user.displayName || "-"}</td>
                  <td>
                    <select
                      value={user.role}
                      disabled={disableRoleInput}
                      onChange={(event) => handleRoleChange(user.id, event.target.value as AppRole)}
                    >
                      {availableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      disabled={busyUserId === user.id}
                      onClick={() => handleActiveToggle(user.id, !user.isActive)}
                    >
                      {user.isActive ? text.Deactivate : text.Activate}
                    </button>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={text["Test user"]}
                      checked={user.isTestUser}
                      disabled={disableRoleInput}
                      onChange={(event) => handleFlagToggle(user.id, "isTestUser", event.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={text["OCV Staff"]}
                      checked={user.isOcvStaff}
                      disabled={disableRoleInput}
                      onChange={(event) => handleFlagToggle(user.id, "isOcvStaff", event.target.checked)}
                    />
                  </td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="button button--danger button--small"
                      disabled={disableDelete}
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      {text.Delete}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
