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

interface DemoResourceIds {
  attractionId: number;
  localizationId: number;
  slug: string;
  name: string;
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

function findPositiveInteger(
  payload: unknown,
  keys: string[]
): number | null {
  const visited = new Set<object>();

  function walk(value: unknown): number | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    if (visited.has(value)) {
      return null;
    }

    visited.add(value);
    const record = value as Record<string, unknown>;

    for (const key of keys) {
      const candidate = record[key];
      const numeric = Number(candidate);

      if (Number.isInteger(numeric) && numeric > 0) {
        return numeric;
      }
    }

    for (const nested of Object.values(record)) {
      const found = walk(nested);
      if (found !== null) return found;
    }

    return null;
  }

  return walk(payload);
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

  const [demoIds, setDemoIds] = useState<DemoResourceIds | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoStatus, setDemoStatus] = useState("Chưa tạo dữ liệu demo.");

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

  async function callWorkflow(
    targetResource: StaffResource,
    id: number,
    action: "submit" | "approve" | "reject" | "publish"
  ): Promise<unknown> {
    if (!csrfToken) {
      throw new Error("CSRF token chưa sẵn sàng.");
    }

    const endpointAction =
      action === "approve" || action === "reject"
        ? "review"
        : action;

    const response = await fetch(
      `/api/v1/staff/${targetResource}/${id}/${endpointAction}`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body:
          action === "approve" || action === "reject"
            ? JSON.stringify({ decision: action })
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

    return body;
  }

  async function createDemoAttraction() {
    if (!staff || !csrfToken) {
      setDemoStatus("Hãy đăng nhập staff trước.");
      return;
    }

    try {
      setDemoLoading(true);
      setDemoIds(null);

      const suffix = Date.now();
      const slug = `demo-workflow-${suffix}`;
      const name = `Điểm demo workflow ${new Date().toLocaleTimeString("vi-VN")}`;

      setDemoStatus("1/2 Đang tạo attraction draft...");

      const attractionResponse = await fetch("/api/v1/staff/attractions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          slug,
          area_code: "HUE_DEMO",
          latitude: 16.4637,
          longitude: 107.5909,
          trigger_radius_m: 50,
        }),
      });

      const attractionBody = (await attractionResponse.json()) as unknown;

      if (!attractionResponse.ok) {
        const root = getObject(attractionBody);
        const error = root ? getObject(root.error) : null;
        throw new Error(
          error && typeof error.message === "string"
            ? error.message
            : `HTTP ${attractionResponse.status}`
        );
      }

      const attractionId = findPositiveInteger(attractionBody, [
        "attraction_id",
        "attractionId",
        "id",
      ]);

      if (!attractionId) {
        throw new Error("Không đọc được attraction_id từ response.");
      }

      setDemoStatus(
        `2/2 Attraction #${attractionId} đã tạo. Đang thêm localization VI...`
      );

      const localizationResponse = await fetch(
        `/api/v1/staff/attractions/${attractionId}/localizations/vi`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({
            name,
            description:
              "Dữ liệu dùng để demo quy trình staff: tạo bản nháp, gửi duyệt, phê duyệt và xuất bản.",
            source_references: [
              {
                title: "Hue Tourism Guide Demo Source",
                source_credit: "Hue Tourism Guide Project",
                source_url: "https://example.com/hue-tourism-demo-source",
              },
            ],
          }),
        }
      );

      const localizationBody =
        (await localizationResponse.json()) as unknown;

      if (!localizationResponse.ok) {
        const root = getObject(localizationBody);
        const error = root ? getObject(root.error) : null;
        throw new Error(
          error && typeof error.message === "string"
            ? error.message
            : `HTTP ${localizationResponse.status}`
        );
      }

      const localizationId = findPositiveInteger(localizationBody, [
        "localization_id",
        "attraction_localization_id",
        "localizationId",
        "id",
      ]);

      if (!localizationId) {
        throw new Error(
          `Attraction #${attractionId} đã tạo nhưng không đọc được localization_id.`
        );
      }

      setDemoIds({ attractionId, localizationId, slug, name });
      setResource("attractions");
      setResourceId(String(attractionId));
      setDemoStatus(
        `Draft PASS: Attraction #${attractionId}, Localization #${localizationId}.`
      );
    } catch (error) {
      setDemoStatus(
        error instanceof Error
          ? `Tạo demo thất bại: ${error.message}`
          : "Tạo demo thất bại."
      );
    } finally {
      setDemoLoading(false);
    }
  }

  async function submitDemoResources() {
    if (!demoIds) return;

    try {
      setDemoLoading(true);
      setDemoStatus(`Đang Submit Attraction #${demoIds.attractionId}...`);
      await callWorkflow("attractions", demoIds.attractionId, "submit");
      setDemoStatus(`Đang Submit Localization #${demoIds.localizationId}...`);
      await callWorkflow("localizations", demoIds.localizationId, "submit");
      setDemoStatus("Submit PASS: cả Attraction và Localization đã vào review.");
    } catch (error) {
      setDemoStatus(
        error instanceof Error ? `Submit thất bại: ${error.message}` : "Submit thất bại."
      );
    } finally {
      setDemoLoading(false);
    }
  }

  async function approveDemoResources() {
    if (!demoIds) return;

    try {
      setDemoLoading(true);
      setDemoStatus(`Đang Approve Attraction #${demoIds.attractionId}...`);
      await callWorkflow("attractions", demoIds.attractionId, "approve");
      setDemoStatus(`Đang Approve Localization #${demoIds.localizationId}...`);
      await callWorkflow("localizations", demoIds.localizationId, "approve");
      setDemoStatus("Approve PASS: cả Attraction và Localization đã được duyệt.");
    } catch (error) {
      setDemoStatus(
        error instanceof Error ? `Approve thất bại: ${error.message}` : "Approve thất bại."
      );
    } finally {
      setDemoLoading(false);
    }
  }

  async function publishDemoResources() {
    if (!demoIds) return;

    try {
      setDemoLoading(true);
      setDemoStatus(`Đang Publish Localization #${demoIds.localizationId}...`);
      await callWorkflow("localizations", demoIds.localizationId, "publish");
      setDemoStatus(`Đang Publish Attraction #${demoIds.attractionId}...`);
      await callWorkflow("attractions", demoIds.attractionId, "publish");
      setDemoStatus(
        `Publish PASS 🎉 ${demoIds.name}. Ctrl+F5 để kiểm tra phía Visitor.`
      );
    } catch (error) {
      setDemoStatus(
        error instanceof Error ? `Publish thất bại: ${error.message}` : "Publish thất bại."
      );
    } finally {
      setDemoLoading(false);
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

        <section className="guided-demo">
          <div className="guided-demo__header">
            <div>
              <p className="eyebrow">Guided Demo</p>
              <h3>Demo publish từ đầu đến cuối</h3>
            </div>
            <span className={csrfToken ? "csrf-ready" : "csrf-waiting"}>
              CSRF: {csrfToken ? "ready" : "chưa có"}
            </span>
          </div>

          <p className="guided-demo__description">
            Tạo Attraction + localization VI bằng API thật, rồi chạy workflow.
          </p>

          <div className="guided-demo__steps">
            <button type="button" onClick={() => void createDemoAttraction()} disabled={!staff || demoLoading}>
              1. Tạo Draft
            </button>
            <button type="button" onClick={() => void submitDemoResources()} disabled={!staff || !demoIds || demoLoading}>
              2. Submit
            </button>
            <button type="button" onClick={() => void approveDemoResources()} disabled={!staff || !demoIds || demoLoading}>
              3. Approve
            </button>
            <button type="button" onClick={() => void publishDemoResources()} disabled={!staff || !demoIds || demoLoading}>
              4. Publish
            </button>
          </div>

          {demoIds && (
            <div className="demo-ids">
              <span>Attraction #{demoIds.attractionId}</span>
              <span>Localization #{demoIds.localizationId}</span>
              <span>{demoIds.slug}</span>
            </div>
          )}

          <div className="guided-demo__status">
            {demoLoading ? "Đang gọi backend... " : ""}
            {demoStatus}
          </div>
        </section>
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
