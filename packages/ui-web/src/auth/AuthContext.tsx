import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type UserRole =
  | 'darkstore_manager'
  | 'warehouse_clerk'
  | 'support_operator'
  | 'hq_admin'
  | 'finance'
  | 'analyst';

interface AuthState {
  token: string | null;
  role: UserRole | null;
  name: string | null;
}

interface AuthContextValue extends AuthState {
  login: (role: UserRole, name?: string) => void;
  loginKeycloak: (username: string, password: string, fallbackRole?: UserRole) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  keycloakEnabled: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const KEYCLOAK_URL = import.meta.env?.VITE_KEYCLOAK_URL ?? 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env?.VITE_KEYCLOAK_REALM ?? 'jomboy';
const KEYCLOAK_CLIENT = import.meta.env?.VITE_KEYCLOAK_CLIENT ?? 'jomboy-web';

const KC_ROLE_MAP: Record<string, UserRole> = {
  darkstore_manager: 'darkstore_manager',
  warehouse_clerk: 'warehouse_clerk',
  support: 'support_operator',
  hq_admin: 'hq_admin',
  finance: 'finance',
  analyst: 'analyst',
};

const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  darkstore_manager: 'Менеджер даркстора',
  warehouse_clerk: 'Кладовщик',
  support_operator: 'Оператор поддержки',
  hq_admin: 'HQ Аналитик',
  finance: 'Финансы',
  analyst: 'Аналитик',
};

function displayNameForRole(role: UserRole | null, fallback?: string | null): string {
  if (fallback && fallback !== 'Demo User') return fallback;
  if (role) return ROLE_DISPLAY_NAMES[role];
  return 'Пользователь';
}

function roleFromJwt(token: string, fallback: UserRole): UserRole {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      realm_access?: { roles?: string[] };
      preferred_username?: string;
    };
    for (const r of payload.realm_access?.roles ?? []) {
      if (KC_ROLE_MAP[r]) return KC_ROLE_MAP[r];
    }
  } catch {
    // not a JWT — dev mock token
  }
  return fallback;
}

export function AuthProvider({ children, defaultRole }: { children: ReactNode; defaultRole?: UserRole }) {
  const keycloakEnabled = import.meta.env?.VITE_KEYCLOAK_ENABLED === 'true';

  const [state, setState] = useState<AuthState>(() => {
    let token = localStorage.getItem('jomboy_token');
    let role = (localStorage.getItem('jomboy_role') as UserRole) ?? defaultRole ?? null;
    let name = localStorage.getItem('jomboy_name') ?? 'Demo User';

    if (!keycloakEnabled) {
      if (role && !token) {
        token = `mock-jwt-${role}`;
        localStorage.setItem('jomboy_token', token);
        localStorage.setItem('jomboy_role', role);
        name = displayNameForRole(role, name);
        localStorage.setItem('jomboy_name', name);
      } else if (!role && defaultRole) {
        role = defaultRole;
        token = `mock-jwt-${defaultRole}`;
        localStorage.setItem('jomboy_token', token);
        localStorage.setItem('jomboy_role', defaultRole);
        name = displayNameForRole(defaultRole, name);
        localStorage.setItem('jomboy_name', name);
      } else if (role && (name === 'Demo User' || !name)) {
        name = displayNameForRole(role, name);
        localStorage.setItem('jomboy_name', name);
      }
    } else if (token && token.includes('.')) {
      role = roleFromJwt(token, role ?? defaultRole ?? 'darkstore_manager');
    }

    return { token, role, name };
  });

  const login = useCallback((role: UserRole, name?: string) => {
    const token = `mock-jwt-${role}`;
    const displayName = displayNameForRole(role, name);
    localStorage.setItem('jomboy_token', token);
    localStorage.setItem('jomboy_role', role);
    localStorage.setItem('jomboy_name', displayName);
    setState({ token, role, name: displayName });
  }, []);

  const loginKeycloak = useCallback(async (username: string, password: string, fallbackRole: UserRole = defaultRole ?? 'darkstore_manager') => {
    const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: KEYCLOAK_CLIENT,
      username,
      password,
    });
    const res = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!res.ok) throw new Error('Keycloak login failed');
    const data = (await res.json()) as { access_token: string };
    const role = roleFromJwt(data.access_token, fallbackRole);
    localStorage.setItem('jomboy_token', data.access_token);
    localStorage.setItem('jomboy_role', role);
    localStorage.setItem('jomboy_name', username);
    setState({ token: data.access_token, role, name: username });
  }, [defaultRole]);

  const logout = useCallback(() => {
    localStorage.removeItem('jomboy_token');
    localStorage.removeItem('jomboy_role');
    localStorage.removeItem('jomboy_name');
    setState({ token: null, role: null, name: null });
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => !!state.token && !!state.role && roles.includes(state.role),
    [state.token, state.role],
  );

  return (
    <AuthContext.Provider value={{ ...state, login, loginKeycloak, logout, hasRole, keycloakEnabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function RoleGuard({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { hasRole, login, loginKeycloak, keycloakEnabled } = useAuth();
  if (!hasRole(...roles)) {
    const kcUser = roles.includes('support_operator') ? 'support' : roles.includes('warehouse_clerk') ? 'clerk' : 'director';
    const kcPass = kcUser === 'support' ? 'support123' : kcUser === 'clerk' ? 'clerk123' : 'director123';
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p>Требуется авторизация</p>
        {keycloakEnabled ? (
          <button
            type="button"
            onClick={() => loginKeycloak(kcUser, kcPass, roles[0]).catch(() => login(roles[0]))}
          >
            Keycloak Login ({kcUser})
          </button>
        ) : (
          <button type="button" onClick={() => login(roles[0])}>
            Dev Login ({roles[0]})
          </button>
        )}
      </div>
    );
  }
  return <>{children}</>;
}
