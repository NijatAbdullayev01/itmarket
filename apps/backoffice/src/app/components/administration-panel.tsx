"use client";

import { FormEvent, useMemo, useState } from "react";

import { IconAdministration } from "./bo-icons";

type StaffRoleCode =
  | "ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "WAREHOUSE"
  | "REPORT_VIEWER";

export type StaffUserRow = {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  role: { code: StaffRoleCode; name: string };
};

export type RoleDefinition = {
  code: StaffRoleCode;
  name: string;
  permissions: { code: string; description: string }[];
};

type AdministrationPanelProps = {
  staffUsers: StaffUserRow[];
  roles: RoleDefinition[];
  currentStaffId: string;
  canManageStaff: boolean;
  onCreateStaff: (payload: {
    email: string;
    displayName: string;
    password: string;
    role: StaffRoleCode;
  }) => Promise<unknown>;
  onUpdateStaff: (
    id: string,
    payload: {
      role: StaffRoleCode;
      active: boolean;
      password?: string;
    },
  ) => Promise<unknown>;
  run: <T>(
    action: () => Promise<T>,
    success: string,
    options?: { refresh?: boolean; onSuccess?: (result: T) => void },
  ) => Promise<T | null>;
};

const roleLabels: Record<StaffRoleCode, string> = {
  ADMIN: "Administrator",
  MANAGER: "Menecer",
  CASHIER: "Kassir",
  WAREHOUSE: "Anbar əməkdaşı",
  REPORT_VIEWER: "Hesabat baxıcısı",
};

const roleSummaries: Record<StaffRoleCode, string> = {
  ADMIN:
    "Tam sistem idarəetməsi, o cümlədən əməkdaş hesabları və bütün modullar.",
  MANAGER:
    "Kataloq, stok, sifariş, POS və hesabatlar üzrə geniş əməliyyat hüquqları.",
  CASHIER: "Kassa növbəsi, POS satışı və kataloq oxuma.",
  WAREHOUSE: "Anbar qəbulu, transfer və sifariş çatdırılması.",
  REPORT_VIEWER: "Yalnız oxuma: kataloq, stok balansı və hesabatlar.",
};

type AccessArea = {
  id: string;
  label: string;
  permissions: string[];
};

const accessAreas: AccessArea[] = [
  {
    id: "catalog",
    label: "Kataloq",
    permissions: ["catalog.read", "catalog.write", "pricing.price-change"],
  },
  {
    id: "inventory",
    label: "Stok",
    permissions: [
      "inventory.read",
      "inventory.receipt",
      "inventory.adjustment",
      "inventory.transfer",
    ],
  },
  {
    id: "orders",
    label: "Sifarişlər",
    permissions: ["orders.read", "fulfillment.write"],
  },
  {
    id: "pos",
    label: "POS / Kassa",
    permissions: [
      "cash-register.manage",
      "cash-shift.open",
      "cash-shift.close",
      "cash-shift.cash-movement",
      "cash-shift.approve-discrepancy",
      "pos.sale",
      "sales.manual-discount",
      "sales.refund",
    ],
  },
  {
    id: "reports",
    label: "Hesabatlar",
    permissions: ["reports.read", "audit.read"],
  },
  {
    id: "administration",
    label: "İdarə etmə",
    permissions: ["staff.manage"],
  },
];

const permissionLabels: Record<string, string> = {
  "catalog.read": "Kataloqu oxuma",
  "catalog.write": "Kataloq yaratma və redaktə",
  "pricing.price-change": "Qiymət dəyişikliyi",
  "inventory.read": "Stok balansını oxuma",
  "inventory.receipt": "Stok qəbulu",
  "inventory.adjustment": "Stok düzəlişi",
  "inventory.transfer": "Stok transferi",
  "orders.read": "Sifarişləri oxuma",
  "fulfillment.write": "Çatdırılma və pickup konfiqurasiyası",
  "cash-register.manage": "Kassa qeydiyyatı",
  "cash-shift.open": "Növbə açma",
  "cash-shift.close": "Növbə bağlama",
  "cash-shift.cash-movement": "Nağd hərəkət",
  "cash-shift.approve-discrepancy": "Kassa fərqini təsdiqləmə",
  "pos.sale": "POS satışı",
  "sales.manual-discount": "Manual endirim",
  "sales.refund": "Qaytarma",
  "reports.read": "Hesabat oxuma və export",
  "audit.read": "Audit jurnalı",
  "staff.manage": "Əməkdaş və vəzifə idarəetməsi",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function roleAccessSummary(role: RoleDefinition) {
  const permissionSet = new Set(role.permissions.map((entry) => entry.code));

  return accessAreas.map((area) => {
    const granted = area.permissions.filter((code) => permissionSet.has(code));
    return { ...area, granted };
  });
}

export function AdministrationPanel({
  staffUsers,
  roles,
  currentStaffId,
  canManageStaff,
  onCreateStaff,
  onUpdateStaff,
  run,
}: AdministrationPanelProps) {
  const [selectedRoleCode, setSelectedRoleCode] = useState<StaffRoleCode>("MANAGER");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<StaffRoleCode>("MANAGER");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");

  const selectedUser = useMemo(
    () => staffUsers.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, staffUsers],
  );

  const selectedRole = useMemo(
    () => roles.find((role) => role.code === selectedRoleCode) ?? null,
    [roles, selectedRoleCode],
  );

  const metrics = useMemo(() => {
    const activeCount = staffUsers.filter((user) => user.active).length;
    return {
      total: staffUsers.length,
      active: activeCount,
      inactive: staffUsers.length - activeCount,
      roles: roles.length,
    };
  }, [roles.length, staffUsers]);

  function selectUser(user: StaffUserRow) {
    setSelectedUserId(user.id);
    setEditRole(user.role.code);
    setEditActive(user.active);
    setEditPassword("");
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      () =>
        onCreateStaff({
          email: String(form.get("email")),
          displayName: String(form.get("displayName")),
          password: String(form.get("password")),
          role: String(form.get("role")) as StaffRoleCode,
        }),
      "Yeni əməkdaş hesabı yaradıldı",
      {
        onSuccess: () => {
          event.currentTarget.reset();
          setSelectedRoleCode("MANAGER");
        },
      },
    );
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;

    const payload: {
      role: StaffRoleCode;
      active: boolean;
      password?: string;
    } = {
      role: editRole,
      active: editActive,
    };

    if (editPassword.trim().length > 0) {
      payload.password = editPassword.trim();
    }

    void run(
      () => onUpdateStaff(selectedUser.id, payload),
      "Əməkdaş məlumatları yeniləndi",
      {
        onSuccess: () => setEditPassword(""),
      },
    );
  }

  if (!canManageStaff) {
    return (
      <section className="admin-section" aria-label="İdarə etmə">
        <article className="operation-card admin-access-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>staff.manage</code> icazəsi olan
            administratorlar daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="admin-section" aria-label="İdarə etmə">
      <div className="admin-metrics" aria-label="Əməkdaş statistikası">
        <article className="admin-metric">
          <span className="admin-metric__label">Ümumi əməkdaş</span>
          <strong className="admin-metric__value">{metrics.total}</strong>
        </article>
        <article className="admin-metric admin-metric--accent">
          <span className="admin-metric__label">Aktiv</span>
          <strong className="admin-metric__value">{metrics.active}</strong>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Deaktiv</span>
          <strong className="admin-metric__value">{metrics.inactive}</strong>
        </article>
        <article className="admin-metric">
          <span className="admin-metric__label">Vəzifə profili</span>
          <strong className="admin-metric__value">{metrics.roles}</strong>
        </article>
      </div>

      <div className="admin-workspace">
        <div className="admin-builder">
          <div className="admin-builder__head">
            <p className="ui-section-kicker">Backoffice idarəetməsi</p>
            <h2>Əməkdaş hesabları və vəzifələr</h2>
            <p className="admin-builder__lead">
              Sistemə giriş üçün yeni istifadəçi yaradın, vəzifə təyin edin və
              hansı modullara çıxış verildiyini nəzarət edin.
            </p>
          </div>

          <div className="admin-tabs" role="tablist" aria-label="İdarəetmə bölmələri">
            <button
              type="button"
              role="tab"
              className={`admin-tab${activeTab === "users" ? " is-active" : ""}`}
              aria-selected={activeTab === "users"}
              onClick={() => setActiveTab("users")}
            >
              <span className="admin-tab__icon">
                <IconAdministration />
              </span>
              <span className="admin-tab__copy">
                <strong>İstifadəçilər</strong>
                <small>Hesab yaratma və redaktə</small>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              className={`admin-tab${activeTab === "roles" ? " is-active" : ""}`}
              aria-selected={activeTab === "roles"}
              onClick={() => setActiveTab("roles")}
            >
              <span className="admin-tab__step">5</span>
              <span className="admin-tab__copy">
                <strong>Vəzifə profilləri</strong>
                <small>Səhifə icazələri xülasəsi</small>
              </span>
            </button>
          </div>

          {activeTab === "users" ? (
            <div className="admin-users-layout">
              <form className="admin-form-panel" onSubmit={submitCreate}>
                <div className="admin-form-panel__head">
                  <h3>Yeni əməkdaş</h3>
                  <p>Minimum 12 simvollu təhlükəsiz şifrə tələb olunur.</p>
                </div>

                <label>
                  E-poçt
                  <input
                    name="email"
                    type="email"
                    autoComplete="off"
                    placeholder="ad.soyad@itmarket.az"
                    required
                  />
                </label>

                <label>
                  Ad və soyad
                  <input
                    name="displayName"
                    type="text"
                    autoComplete="off"
                    placeholder="Ad Soyad"
                    minLength={2}
                    maxLength={120}
                    required
                  />
                </label>

                <label>
                  Müvəqqəti şifrə
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 12 simvol"
                    minLength={12}
                    required
                  />
                </label>

                <label>
                  Vəzifə
                  <select
                    name="role"
                    value={selectedRoleCode}
                    onChange={(event) =>
                      setSelectedRoleCode(event.target.value as StaffRoleCode)
                    }
                    required
                  >
                    {roles.map((role) => (
                      <option key={role.code} value={role.code}>
                        {roleLabels[role.code] ?? role.name}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedRole ? (
                  <div className="admin-role-preview" aria-live="polite">
                    <strong>{roleLabels[selectedRole.code]}</strong>
                    <p>{roleSummaries[selectedRole.code]}</p>
                    <ul>
                      {roleAccessSummary(selectedRole)
                        .filter((area) => area.granted.length > 0)
                        .map((area) => (
                          <li key={area.id}>
                            <span>{area.label}</span>
                            <small>{area.granted.length} icazə</small>
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}

                <div className="admin-form-panel__actions">
                  <button type="submit">Hesab yarat</button>
                </div>
              </form>

              <div className="admin-users-panel">
                <div className="admin-users-panel__head">
                  <h3>Əməkdaş siyahısı</h3>
                  <p>{staffUsers.length} qeydiyyat</p>
                </div>

                <div className="admin-user-list">
                  {staffUsers.length === 0 ? (
                    <p className="card-note">Hələ əməkdaş qeydiyyatı yoxdur.</p>
                  ) : (
                    staffUsers.map((user) => {
                      const isSelected = selectedUserId === user.id;
                      const isSelf = user.id === currentStaffId;

                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={`admin-user-row${isSelected ? " is-selected" : ""}`}
                          onClick={() => selectUser(user)}
                        >
                          <div className="admin-user-row__main">
                            <strong>{user.displayName}</strong>
                            <span>{user.email}</span>
                          </div>
                          <div className="admin-user-row__meta">
                            <span className="admin-badge">
                              {roleLabels[user.role.code] ?? user.role.name}
                            </span>
                            <span
                              className={`admin-status${user.active ? " is-active" : ""}`}
                            >
                              {user.active ? "Aktiv" : "Deaktiv"}
                            </span>
                            {isSelf ? (
                              <span className="admin-self-tag">Siz</span>
                            ) : null}
                          </div>
                          <small>{formatDate(user.createdAt)}</small>
                        </button>
                      );
                    })
                  )}
                </div>

                {selectedUser ? (
                  <form className="admin-edit-panel" onSubmit={submitUpdate}>
                    <div className="admin-edit-panel__head">
                      <h4>{selectedUser.displayName}</h4>
                      <p>{selectedUser.email}</p>
                    </div>

                    <label>
                      Vəzifə
                      <select
                        value={editRole}
                        onChange={(event) =>
                          setEditRole(event.target.value as StaffRoleCode)
                        }
                        required
                      >
                        {roles.map((role) => (
                          <option key={role.code} value={role.code}>
                            {roleLabels[role.code] ?? role.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(event) => setEditActive(event.target.checked)}
                        disabled={selectedUser.id === currentStaffId}
                      />
                      <span>
                        Hesab aktivdir
                        {selectedUser.id === currentStaffId
                          ? " (öz hesabınızı deaktiv edə bilməzsiniz)"
                          : ""}
                      </span>
                    </label>

                    <label>
                      Yeni şifrə (istəyə bağlı)
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                        autoComplete="new-password"
                        placeholder="Boş buraxsanız, şifrə dəyişməz"
                        minLength={editPassword.trim().length > 0 ? 12 : undefined}
                      />
                    </label>

                    <div className="admin-form-panel__actions">
                      <button type="submit">Dəyişiklikləri saxla</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSelectedUserId(null)}
                      >
                        Seçimi ləğv et
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="admin-roles-grid">
              {roles.map((role) => {
                const access = roleAccessSummary(role);

                return (
                  <article key={role.code} className="admin-role-card">
                    <header>
                      <h3>{roleLabels[role.code] ?? role.name}</h3>
                      <span className="admin-badge admin-badge--muted">
                        {role.code}
                      </span>
                    </header>
                    <p>{roleSummaries[role.code]}</p>

                    <div className="admin-role-access">
                      {access.map((area) => (
                        <div
                          key={area.id}
                          className={`admin-role-access__row${area.granted.length > 0 ? " is-granted" : ""}`}
                        >
                          <strong>{area.label}</strong>
                          {area.granted.length > 0 ? (
                            <ul>
                              {area.granted.map((code) => (
                                <li key={code}>
                                  {permissionLabels[code] ?? code}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="admin-role-access__none">Giriş yoxdur</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
