"use client";

import { useMemo, useState } from "react";
import { StatusToast, useStatusToast } from "../components/status-toast";
import type { AppRole } from "../lib/auth-types";
import { hasCapability } from "../lib/rbac";

type UserOverview = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string | null;
};

type ApiState = {
  users: UserOverview[];
  actorRole: AppRole;
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalResumes: number;
    totalPublicLinks: number;
    totalPublicViews: number;
  } | null;
};

type Props = {
  actorRole: AppRole;
  initialUsers: UserOverview[];
  initialStats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalResumes: number;
    totalPublicLinks: number;
    totalPublicViews: number;
  };
};

const ROLE_OPTIONS: AppRole[] = ["admin", "manager", "user", "recruiter"];

function canRoleBeAssignedByManager(role: AppRole): boolean {
  return role === "user" || role === "recruiter";
}

export default function AdminUsersClient({ actorRole, initialUsers, initialStats }: Props) {
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
      showToast(payload.error || "Failed to load users.", "error");
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
      return ROLE_OPTIONS;
    }
    return ROLE_OPTIONS.filter((role) => canRoleBeAssignedByManager(role));
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
      showToast(payload.error || "Role update failed.", "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast("Role updated.");
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
      showToast(payload.error || "Status update failed.", "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast("Account status updated.");
    setBusyUserId("");
  }

  async function handleDeleteUser(userId: string) {
    const confirmed = window.confirm("Delete this user account? This operation removes auth access.");
    if (!confirmed) {
      return;
    }

    setBusyUserId(userId);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok || payload.error) {
      showToast(payload.error || "Delete failed.", "error");
      setBusyUserId("");
      return;
    }
    await loadUsers();
    showToast("User deleted.", "error");
    setBusyUserId("");
  }

  return (
    <section className="stack">
      <StatusToast toast={toast} onClose={closeToast} />

      {state.stats && (
        <div className="meta-grid">
          <p>
            <span className="meta-label">Users</span>
            <span className="meta-value">{state.stats.totalUsers} total ({state.stats.activeUsers} active)</span>
          </p>
          <p>
            <span className="meta-label">Resumes</span>
            <span className="meta-value">{state.stats.totalResumes}</span>
          </p>
          <p>
            <span className="meta-label">Public Links</span>
            <span className="meta-value">{state.stats.totalPublicLinks}</span>
          </p>
          <p>
            <span className="meta-label">Public Views</span>
            <span className="meta-value">{state.stats.totalPublicViews}</span>
          </p>
        </div>
      )}

      <div className="table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Display name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((user) => {
              const disableRoleInput =
                busyUserId === user.id ||
                (!hasCapability(state.actorRole, "admin.users.role_write") && (user.role === "admin" || user.role === "manager"));
              const disableDelete =
                busyUserId === user.id ||
                (!hasCapability(state.actorRole, "admin.users.role_write") && (user.role === "admin" || user.role === "manager"));
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
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                  <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="button button--danger button--small"
                      disabled={disableDelete}
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
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
