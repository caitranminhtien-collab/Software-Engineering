import { useState } from "react";
import type { FormEvent } from "react";
import "./StaffDemo.css";

type StaffResource =
  | "attractions"
  | "localizations"
  | "media"
  | "routes"
  | "knowledge-documents";

interface StaffIdentity {
  email: string;
  role: string;
  active: boolean | null;
}

function getObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readStaffIdentity(payload: unknown): StaffIdentity {
  const root = getObject(payload) ?? {};
  const data = getObject(root.data) ?? root;
  const staff =
    getObject(data.staff) ??
    getObject(data.user) ??
    data;

  return {
    email:
      typeof staff.email === "string"
        ? staff.email
        : "Staff session active",

    role:
      typeof staff.role === "string"
        ? staff.role
        : "unknown",

    active:
      typeof staff.active === "boolean"
        ? staff.active
        : typeof staff.is_active === "boolean"
          ? staff.is_active
          : null,
  };
}

function readCsrfToken(payload: unknown): string {
  const root = getObject(payload) ?? {};
  const data = getObject(root.data) ?? root;

  const candidate =
    data.csrf_token ??
    data.csrfToken ??
    root.csrf_token ??
    root.csrfToken;

  return typeof candidate === "string" ? candidate : "";
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as unknown;
    const root = getObject(body);
    const error = root ? getObject(root.error) : null;

    if (error && typeof error.message === "string") {
      return error.message;
    }
  } catch {
    // Ignore malformed/non-JSON error response.
  }

  return `Request failed with HTTP ${response.status}`;
}

function StaffDemo() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [staff, setStaff] = useState<StaffIdentity | null>(null);
  const [csrfToken, setCsrfToken] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [resource, setResource] =
    useState<StaffResource>("attractions");
  const [resourceId, setResourceId] = useState("");
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowResult, setWorkflowResult] = useState("");

  async function loadSessionAndCsrf() {
    const [meResponse, csrfResponse] = await Promise.all([
      fetch("/api/v1/staff/auth/me", {
        credentials: "include",
      }),
      fetch("/api/v1/staff/auth/csrf", {
        credentials: "include",
      }),
    ]);

    if (!meResponse.ok) {
      throw new Error(await readErrorMessage(meResponse));
    }

    if (!csrfResponse.ok) {
      throw new Error(await readErrorMessage(csrfResponse));
    }

    const meBody = (await meResponse.json()) as unknown;
    const csrfBody = (await csrfResponse.json()) as unknown;

    const token = readCsrfToken(csrfBody);

    if (!token) {
      throw new Error("Backend không trả CSRF token.");
    }

    setStaff(readStaffIdentity(meBody));
    setCsrfToken(token);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Nhập email và password staff.");
      return;
    }

    try {
      setLoginLoading(true);
      setMessage("");
      setWorkflowResult("");

      const response = await fetch("/api/v1/staff/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      await loadSessionAndCsrf();

      setPassword("");
      setMessage("Đăng nhập thành công. Server-side session và CSRF đã sẵn sàng.");
    } catch (error) {
      setStaff(null);
      setCsrfToken("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể đăng nhập."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function refreshSession() {
    try {
      setLoginLoading(true);
      setMessage("");
      await loadSessionAndCsrf();
      setMessage("Staff session vẫn hợp lệ.");
    } catch (error) {
      setStaff(null);
      setCsrfToken("");
      setMessage(
        error instanceof Error
          ? error.message
          : "Session không hợp lệ."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    if (!csrfToken) {
      return;
    }

    try {
      setLoginLoading(true);
      setMessage("");

      const response = await fetch("/api/v1/staff/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      setStaff(null);
      setCsrfToken("");
      setWorkflowResult("");
      setMessage("Đã logout và hủy staff session.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể logout."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function runWorkflow(
    action: "submit" | "approve" | "reject" | "publish"
  ) {
    const id = Number(resourceId);

    if (!Number.isInteger(id) || id <= 0) {
      setWorkflowResult("Resource ID phải là số nguyên dương.");
      return;
    }

    if (!csrfToken) {
      setWorkflowResult("Hãy đăng nhập staff trước.");
      return;
    }

    try {
      setWorkflowLoading(true);
      setWorkflowResult("");

      const endpointAction =
        action === "approve" || action === "reject"
          ? "review"
          : action;

      const response = await fetch(
        `/api/v1/staff/${resource}/${id}/${endpointAction}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body:
            action === "approve" || action === "reject"
              ? JSON.stringify({
                  decision: action,
                })
              : undefined,
        }
      );

      const body = (await response.json()) as unknown;

      if (!response.ok) {
        const root = getObject(body);
        const error = root ? getObject(root.error) : null;
        const errorMessage =
          error && typeof error.message === "string"
            ? error.message
            : `HTTP ${response.status}`;

        throw new Error(errorMessage);
      }

      setWorkflowResult(JSON.stringify(body, null, 2));
    } catch (error) {
      setWorkflowResult(
        error instanceof Error
          ? `Backend từ chối: ${error.message}`
          : "Workflow request thất bại."
      );
    } finally {
      setWorkflowLoading(false);
    }
  }

  return (
    <section className="staff-demo">
      <div className="staff-demo__intro">
        <p className="eyebrow">Staff / Admin Demo</p>
        <h2>Quản trị nội dung</h2>
        <p>
          Phần này dùng API thật để kiểm tra staff login, server-side session,
          CSRF, RBAC và workflow submit → review → publish.
        </p>

        {!staff ? (
          <form className="staff-login" onSubmit={login}>
            <label>
              <span>Email staff</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="staff@example.com"
                autoComplete="username"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" disabled={loginLoading}>
              {loginLoading ? "Đang đăng nhập..." : "Đăng nhập staff"}
            </button>
          </form>
        ) : (
          <div className="staff-session">
            <div>
              <span>Staff session</span>
              <strong>{staff.email}</strong>
              <small>Role: {staff.role}</small>
            </div>

            <div className="staff-session__actions">
              <button
                type="button"
                onClick={() => void refreshSession()}
                disabled={loginLoading}
              >
                Kiểm tra /me
              </button>

              <button
                type="button"
                onClick={() => void logout()}
                disabled={loginLoading}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {message && <div className="staff-message">{message}</div>}
      </div>

      <div className="workflow-demo">
        <div className="workflow-demo__header">
          <div>
            <p className="eyebrow">Workflow Tester</p>
            <h3>Thử workflow backend</h3>
          </div>

          <span className={csrfToken ? "csrf-ready" : "csrf-waiting"}>
            CSRF: {csrfToken ? "ready" : "chưa có"}
          </span>
        </div>

        <p className="workflow-help">
          Nhập ID của một resource demo đang ở trạng thái phù hợp. Backend sẽ
          tự kiểm tra role, CSRF và business rules; frontend không bypass luật.
        </p>

        <div className="workflow-fields">
          <label>
            <span>Resource</span>
            <select
              value={resource}
              onChange={(event) =>
                setResource(event.target.value as StaffResource)
              }
              disabled={!staff || workflowLoading}
            >
              <option value="attractions">Attractions</option>
              <option value="localizations">Localizations</option>
              <option value="media">Media</option>
              <option value="routes">Routes</option>
              <option value="knowledge-documents">
                Knowledge documents
              </option>
            </select>
          </label>

          <label>
            <span>Resource ID</span>
            <input
              type="number"
              min="1"
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              placeholder="Ví dụ: 4"
              disabled={!staff || workflowLoading}
            />
          </label>
        </div>

        <div className="workflow-actions">
          <button
            type="button"
            onClick={() => void runWorkflow("submit")}
            disabled={!staff || workflowLoading}
          >
            Submit
          </button>

          <button
            type="button"
            onClick={() => void runWorkflow("approve")}
            disabled={!staff || workflowLoading}
          >
            Approve
          </button>

          <button
            type="button"
            onClick={() => void runWorkflow("reject")}
            disabled={!staff || workflowLoading}
          >
            Reject
          </button>

          <button
            type="button"
            onClick={() => void runWorkflow("publish")}
            disabled={!staff || workflowLoading}
          >
            Publish
          </button>
        </div>

        <pre className="workflow-result">
          {workflowLoading
            ? "Đang gọi backend..."
            : workflowResult ||
              "Kết quả workflow hoặc lỗi từ backend sẽ hiện ở đây."}
        </pre>
      </div>
    </section>
  );
}

export default StaffDemo;
