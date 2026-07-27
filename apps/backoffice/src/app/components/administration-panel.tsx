"use client";

import { FormEvent, useMemo, useState } from "react";

import { formatAzDateTime } from "../../lib/format-az-date";
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
  currentStaffMfaEnabled: boolean;
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
  onMfaSetup: () => Promise<{ secret: string; otpauthUrl: string }>;
  onMfaEnable: (
    code: string,
  ) => Promise<{ enabled: true; recoveryCodes: string[] }>;
  onMfaDisable: (payload: {
    code?: string;
    recoveryCode?: string;
  }) => Promise<{ enabled: false }>;
  onMfaStatusRefresh: () => Promise<void>;
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
  CASHIER: "POS satışı və kataloq oxuma.",
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
    id: "customers",
    label: "Müştərilər",
    permissions: ["customers.read"],
  },
  {
    id: "inquiries",
    label: "Sorğular",
    permissions: ["inquiries.read", "inquiries.write"],
  },
  {
    id: "credit-applications",
    label: "Kredit müraciətləri",
    permissions: ["credit-applications.manage"],
  },
  {
    id: "support-messages",
    label: "Mesajlar",
    permissions: ["support-messages.manage"],
  },
  {
    id: "pos",
    label: "POS / Kassa",
    // Növbəsiz POS: cash-shift.* və istifadə olunmayan sales.manual-discount
    // admin təyin siyahısından çıxarılıb (Permission enum/seed saxlanır).
    permissions: [
      "cash-register.manage",
      "pos.sale",
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
  "inventory.receipt": "Məhsul qəbulu",
  "inventory.adjustment": "Stok düzəlişi",
  "inventory.transfer": "Stok transferi",
  "orders.read": "Sifarişləri oxuma",
  "fulfillment.write": "Çatdırılma və pickup konfiqurasiyası",
  "customers.read": "Müştəriləri oxuma (qeydiyyatlı və qeydiyyatsız)",
  "inquiries.read": "Ön sifariş və stok bildirişi sorğularını oxuma",
  "inquiries.write": "Sorğu statusunu yeniləmə (bağla / ləğv et)",
  "credit-applications.manage": "Kredit müraciətlərini idarə etmə",
  "support-messages.manage": "Müştəri mesajlarını idarə etmə",
  "cash-register.manage": "Kassa qeydiyyatı",
  "pos.sale": "POS satışı",
  "sales.refund": "Qaytarma",
  "reports.read": "Hesabat oxuma və export",
  "audit.read": "Audit jurnalı",
  "staff.manage": "Əməkdaş və vəzifə idarəetməsi",
};

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
  currentStaffMfaEnabled,
  canManageStaff,
  onCreateStaff,
  onUpdateStaff,
  onMfaSetup,
  onMfaEnable,
  onMfaDisable,
  onMfaStatusRefresh,
  run,
}: AdministrationPanelProps) {
  const [selectedRoleCode, setSelectedRoleCode] = useState<StaffRoleCode>("MANAGER");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<StaffRoleCode>("MANAGER");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaOtpauthUrl, setMfaOtpauthUrl] = useState<string | null>(null);
  const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[] | null>(
    null,
  );
  const [mfaCode, setMfaCode] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");

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

  function startMfaSetup() {
    void run(
      () => onMfaSetup(),
      "MFA qeydiyyatı başladı — secret-i authenticator-a əlavə edin",
      {
        refresh: false,
        onSuccess: (result) => {
          setMfaSecret(result.secret);
          setMfaOtpauthUrl(result.otpauthUrl);
          setMfaRecoveryCodes(null);
          setMfaCode("");
        },
      },
    );
  }

  function submitMfaEnable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = mfaCode.trim();
    if (code.length !== 6) return;
    void run(
      () => onMfaEnable(code),
      "MFA aktivləşdirildi — recovery kodları saxlayın",
      {
        refresh: false,
        onSuccess: (result) => {
          setMfaRecoveryCodes(result.recoveryCodes);
          setMfaSecret(null);
          setMfaOtpauthUrl(null);
          setMfaCode("");
          void onMfaStatusRefresh();
        },
      },
    );
  }

  function submitMfaDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = mfaDisableCode.trim();
    if (code.length === 0) return;
    const payload =
      code.length === 6 ? { code } : { recoveryCode: code };
    void run(() => onMfaDisable(payload), "MFA deaktiv edildi", {
      refresh: false,
      onSuccess: () => {
        setMfaDisableCode("");
        setMfaSecret(null);
        setMfaOtpauthUrl(null);
        setMfaRecoveryCodes(null);
        void onMfaStatusRefresh();
      },
    });
  }

  const mfaCard = (
    <article className="operation-card admin-mfa-card" aria-label="MFA təhlükəsizliyi">
      <div className="admin-form-panel__head">
        <h3>İki faktorlu doğrulama (TOTP)</h3>
        <p>
          Opsional TOTP MFA (D-011). Authenticator tətbiqi ilə aktivləşdirin;
          launch məcburiliyi Security imzasından sonradır.
        </p>
      </div>
      <p className="card-note">
        Status:{" "}
        <strong>
          {currentStaffMfaEnabled ? "Aktiv" : "Deaktiv"}
        </strong>
      </p>
      {!currentStaffMfaEnabled ? (
        <>
          {mfaSecret === null ? (
            <div className="admin-form-panel__actions">
              <button type="button" onClick={startMfaSetup}>
                MFA quraşdır
              </button>
            </div>
          ) : (
            <form className="admin-mfa-enroll" onSubmit={submitMfaEnable}>
              <p className="card-note">
                Authenticator-a secret əlavə edin və ya otpauth URL-dən QR oxudun.
              </p>
              <label htmlFor="mfa-secret">Secret</label>
              <input
                id="mfa-secret"
                value={mfaSecret}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
              {mfaOtpauthUrl !== null && (
                <>
                  <label htmlFor="mfa-otpauth">otpauth URL</label>
                  <input
                    id="mfa-otpauth"
                    value={mfaOtpauthUrl}
                    readOnly
                    onFocus={(event) => event.currentTarget.select()}
                  />
                </>
              )}
              <label htmlFor="mfa-enable-code">Authenticator kodu</label>
              <input
                id="mfa-enable-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                required
              />
              <div className="admin-form-panel__actions">
                <button type="submit">Aktivləşdir</button>
                <button
                  type="button"
                  className="bo-btn-reset admin-mfa-cancel"
                  onClick={() => {
                    setMfaSecret(null);
                    setMfaOtpauthUrl(null);
                    setMfaCode("");
                  }}
                >
                  Ləğv et
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <form className="admin-mfa-enroll" onSubmit={submitMfaDisable}>
          <label htmlFor="mfa-disable-code">
            Deaktiv etmək üçün TOTP və ya recovery kod
          </label>
          <input
            id="mfa-disable-code"
            value={mfaDisableCode}
            onChange={(event) => setMfaDisableCode(event.target.value)}
            autoComplete="one-time-code"
            placeholder="6 rəqəmli kod və ya recovery"
            required
          />
          <div className="admin-form-panel__actions">
            <button type="submit">MFA-nı söndür</button>
          </div>
        </form>
      )}
      {mfaRecoveryCodes !== null && mfaRecoveryCodes.length > 0 && (
        <div className="admin-mfa-recovery">
          <p className="card-note">
            Recovery kodları yalnız bir dəfə göstərilir — təhlükəsiz yerdə
            saxlayın.
          </p>
          <ul>
            {mfaRecoveryCodes.map((code) => (
              <li key={code}>
                <code>{code}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );

  if (!canManageStaff) {
    return (
      <section className="admin-section" aria-label="İdarə etmə">
        {mfaCard}
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
      {mfaCard}
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
                          <small>{formatAzDateTime(user.createdAt, user.createdAt)}</small>
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
