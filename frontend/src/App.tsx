import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import StaffDemo from "./StaffDemo";

interface HealthResponse {
  status: string;
  message: string;
}

interface Attraction {
  id: number;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;
  name: string | null;
  requested_language: string;
  content_language: string | null;
  fallback_used: boolean;
}

interface AttractionMedia {
  id: number;
  type: "image" | "audio";
  language: string | null;
  url: string;
  caption: string | null;
  credit: string;
  rights_reference: string;
  duration_seconds: number | null;
  display_order: number;
  fallback_used: boolean;
}

interface AttractionDetail {
  id: number;
  slug: string;
  area_code: string;
  latitude: number;
  longitude: number;
  trigger_radius_m: number;
  name: string;
  description: string;
  requested_language: string;
  content_language: string;
  fallback_used: boolean;
  media: AttractionMedia[];
  sources: unknown[];
}

interface RouteItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  area_code: string;
  estimated_minutes: number;
  verified_at: string | null;
}

interface RouteStop {
  id: number;
  order: number;
  attraction_id: number;
  attraction_slug: string;
  attraction_name: string | null;
  latitude: number;
  longitude: number;
  visit_minutes: number | null;
  travel_minutes_from_previous: number | null;
}

interface RouteDetail extends RouteItem {
  stops: RouteStop[];
}

interface LocationSuggestion {
  attraction_id: number;
  slug: string;
  area_code: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  distance_m: number;
  trigger_radius_m: number;
  content_language: string;
  fallback_used: boolean;
}

interface ChatCitation {
  title?: string;
  source_credit?: string;
  source_url?: string | null;
  document_id?: number;
  chunk_id?: number;
  attraction_id?: number;
  language_code?: string;
}

interface ChatBubble {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
}

interface AttractionListResponse {
  data: Attraction[];
}

interface AttractionDetailResponse {
  data: AttractionDetail;
}

interface RouteListResponse {
  data: RouteItem[];
}

interface RouteDetailResponse {
  data: RouteDetail;
}

interface VisitorSessionResponse {
  data: {
    token: string;
  };
}

interface LocationResponse {
  data: LocationSuggestion[];
  meta: {
    accuracy_m: number;
    manual_selection_recommended: boolean;
    reason: "low_accuracy" | null;
  };
}

function getSourceLabel(source: unknown, index: number): string {
  if (typeof source === "object" && source !== null) {
    const record = source as Record<string, unknown>;
    const label =
      record.title ??
      record.name ??
      record.source_credit ??
      record.source ??
      record.url;

    if (typeof label === "string" && label.trim()) {
      return label;
    }
  }

  if (typeof source === "string" && source.trim()) {
    return source;
  }

  return `Nguồn ${index + 1}`;
}

function readAssistantMessage(payload: unknown): ChatBubble {
  const root =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const data =
    typeof root.data === "object" && root.data !== null
      ? (root.data as Record<string, unknown>)
      : root;

  const assistant =
    typeof data.assistant_message === "object" &&
    data.assistant_message !== null
      ? (data.assistant_message as Record<string, unknown>)
      : data;

  const content =
    typeof assistant.content === "string"
      ? assistant.content
      : "Backend đã xử lý câu hỏi nhưng frontend chưa đọc được nội dung trả về.";

  const citations = Array.isArray(assistant.citations)
    ? (assistant.citations as ChatCitation[])
    : Array.isArray(data.citations)
      ? (data.citations as ChatCitation[])
      : [];

  return {
    role: "assistant",
    content,
    citations,
  };
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [visitorToken, setVisitorToken] = useState("");
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAttraction, setSelectedAttraction] =
    useState<AttractionDetail | null>(null);
  const [selectedRoute, setSelectedRoute] =
    useState<RouteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [locationSuggestions, setLocationSuggestions] =
    useState<LocationSuggestion[]>([]);
  const [locationMessage, setLocationMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const [chatAttractionId, setChatAttractionId] = useState<number | "">("");
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatBubble[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        setLoading(true);
        setError("");

        let token = sessionStorage.getItem("hue_visitor_token") ?? "";

        if (!token) {
          const sessionResponse = await fetch("/api/v1/visitor-sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              language_code: "vi",
            }),
          });

          if (!sessionResponse.ok) {
            throw new Error("Không thể tạo visitor session.");
          }

          const sessionBody =
            (await sessionResponse.json()) as VisitorSessionResponse;

          token = sessionBody.data.token;
          sessionStorage.setItem("hue_visitor_token", token);
        }

        setVisitorToken(token);

        const [healthResponse, attractionResponse, routeResponse] =
          await Promise.all([
            fetch("/api/v1/health/live"),
            fetch("/api/v1/attractions?language=vi&page=1&page_size=10"),
            fetch("/api/v1/routes?page=1&page_size=10"),
          ]);

        if (!healthResponse.ok) {
          throw new Error("Không thể kết nối backend.");
        }

        if (!attractionResponse.ok) {
          throw new Error("Không thể tải danh sách điểm tham quan.");
        }

        if (!routeResponse.ok) {
          throw new Error("Không thể tải danh sách tuyến tham quan.");
        }

        const healthData =
          (await healthResponse.json()) as HealthResponse;
        const attractionData =
          (await attractionResponse.json()) as AttractionListResponse;
        const routeData =
          (await routeResponse.json()) as RouteListResponse;

        setHealth(healthData);
        setAttractions(attractionData.data);
        setRoutes(routeData.data);

        if (attractionData.data.length > 0) {
          setChatAttractionId(attractionData.data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Đã xảy ra lỗi không xác định."
        );
      } finally {
        setLoading(false);
      }
    }

    void boot();
  }, []);

  async function openAttractionDetail(id: number) {
    try {
      setDetailLoading(true);
      setDetailError("");
      setSelectedRoute(null);
      setSelectedAttraction(null);

      const response = await fetch(
        `/api/v1/attractions/${id}?language=vi`
      );

      if (!response.ok) {
        throw new Error("Không thể tải chi tiết điểm tham quan.");
      }

      const body =
        (await response.json()) as AttractionDetailResponse;

      setSelectedAttraction(body.data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function openRouteDetail(id: number) {
    try {
      setDetailLoading(true);
      setDetailError("");
      setSelectedAttraction(null);
      setSelectedRoute(null);

      const response = await fetch(`/api/v1/routes/${id}`);

      if (!response.ok) {
        throw new Error("Không thể tải chi tiết tuyến tham quan.");
      }

      const body =
        (await response.json()) as RouteDetailResponse;

      setSelectedRoute(body.data);
    } catch (err) {
      setDetailError(
        err instanceof Error
          ? err.message
          : "Không thể tải chi tiết tuyến."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedAttraction(null);
    setSelectedRoute(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function requestLocationSuggestion(
    latitude: number,
    longitude: number,
    accuracyM: number
  ) {
    if (!visitorToken) {
      setLocationMessage("Visitor session chưa sẵn sàng.");
      return;
    }

    try {
      setLocationLoading(true);
      setLocationMessage("");
      setLocationSuggestions([]);

      const response = await fetch("/api/v1/location-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${visitorToken}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy_m: accuracyM,
          sampled_at: new Date().toISOString(),
        }),
      });

      const body = (await response.json()) as LocationResponse & {
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          body.error?.message ?? "Không thể lấy gợi ý vị trí."
        );
      }

      setLocationSuggestions(body.data);

      if (body.meta.manual_selection_recommended) {
        setLocationMessage(
          "GPS có độ chính xác thấp. Backend khuyến nghị người dùng chọn địa điểm thủ công."
        );
      } else if (body.data.length === 0) {
        setLocationMessage(
          "Không có điểm tham quan nào trong bán kính kích hoạt, hoặc điểm này đang trong thời gian cooldown."
        );
      } else {
        setLocationMessage(
          `Backend tìm thấy ${body.data.length} điểm tham quan gần vị trí này.`
        );
      }
    } catch (err) {
      setLocationMessage(
        err instanceof Error
          ? err.message
          : "Không thể xử lý vị trí."
      );
    } finally {
      setLocationLoading(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Trình duyệt không hỗ trợ Geolocation.");
      return;
    }

    setLocationLoading(true);
    setLocationMessage("Đang lấy vị trí từ trình duyệt...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void requestLocationSuggestion(
          position.coords.latitude,
          position.coords.longitude,
          Math.max(position.coords.accuracy, 1)
        );
      },
      () => {
        setLocationLoading(false);
        setLocationMessage(
          "Không lấy được vị trí. Hãy cấp quyền Location cho trình duyệt hoặc dùng nút mô phỏng demo."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function useDemoLocation() {
    const attraction = attractions[0];

    if (!attraction) {
      setLocationMessage("Chưa có attraction để mô phỏng vị trí.");
      return;
    }

    void requestLocationSuggestion(
      attraction.latitude,
      attraction.longitude,
      5
    );
  }

  async function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = chatQuestion.trim();

    if (!question || !visitorToken || chatAttractionId === "") {
      return;
    }

    const userBubble: ChatBubble = {
      role: "user",
      content: question,
    };

    setChatMessages((current) => [...current, userBubble]);
    setChatQuestion("");
    setChatError("");
    setChatLoading(true);

    try {
      const response = await fetch("/api/v1/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${visitorToken}`,
        },
        body: JSON.stringify({
          question,
          language: "vi",
          attraction_id: chatAttractionId,
        }),
      });

      const body = (await response.json()) as unknown;

      if (!response.ok) {
        const root =
          typeof body === "object" && body !== null
            ? (body as Record<string, unknown>)
            : {};
        const errorObject =
          typeof root.error === "object" && root.error !== null
            ? (root.error as Record<string, unknown>)
            : {};
        const message =
          typeof errorObject.message === "string"
            ? errorObject.message
            : "Chat backend trả về lỗi.";

        throw new Error(message);
      }

      const assistantBubble = readAssistantMessage(body);

      setChatMessages((current) => [
        ...current,
        assistantBubble,
      ]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : "Không thể gửi câu hỏi."
      );
    } finally {
      setChatLoading(false);
    }
  }

  const imageMedia =
    selectedAttraction?.media.filter(
      (item) => item.type === "image"
    ) ?? [];

  const audioMedia =
    selectedAttraction?.media.filter(
      (item) => item.type === "audio"
    ) ?? [];

  const overlayOpen =
    detailLoading ||
    Boolean(detailError) ||
    Boolean(selectedAttraction) ||
    Boolean(selectedRoute);

  const sessionReady = useMemo(
    () => visitorToken.length > 0,
    [visitorToken]
  );

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">Hue Tourism Guide</p>
          <h1>Khám phá Huế</h1>
          <p className="hero__description">
            Frontend demo đang lấy dữ liệu trực tiếp từ backend API.
          </p>

          <div className="hero-statuses">
            <div
              className={`status ${
                health?.status === "ok" ? "status--ok" : ""
              }`}
            >
              <span className="status__dot" />
              {health
                ? `Backend: ${health.status}`
                : "Đang kiểm tra backend..."}
            </div>

            <div className={`status ${sessionReady ? "status--ok" : ""}`}>
              <span className="status__dot" />
              {sessionReady
                ? "Visitor session: ready"
                : "Visitor session: loading"}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="section-heading">
          <div>
            <p className="eyebrow">Điểm tham quan</p>
            <h2>Địa điểm nổi bật</h2>
          </div>
          <span className="count">{attractions.length} địa điểm</span>
        </section>

        {loading && (
          <div className="state-box">Đang tải dữ liệu từ backend...</div>
        )}

        {error && (
          <div className="state-box state-box--error">{error}</div>
        )}

        <section className="grid">
          {attractions.map((attraction) => (
            <article className="card" key={attraction.id}>
              <div className="card__top">
                <span className="card__area">{attraction.area_code}</span>
                <span className="card__language">
                  {attraction.content_language ?? "N/A"}
                </span>
              </div>

              <h3>{attraction.name ?? "Chưa có tên"}</h3>
              <p className="card__slug">{attraction.slug}</p>

              <dl className="card__meta">
                <div>
                  <dt>Vĩ độ</dt>
                  <dd>{attraction.latitude}</dd>
                </div>
                <div>
                  <dt>Kinh độ</dt>
                  <dd>{attraction.longitude}</dd>
                </div>
                <div>
                  <dt>Trigger radius</dt>
                  <dd>{attraction.trigger_radius_m} m</dd>
                </div>
              </dl>

              <button
                className="card__button"
                type="button"
                onClick={() => void openAttractionDetail(attraction.id)}
              >
                Xem chi tiết
              </button>
            </article>
          ))}
        </section>

        <section className="section-block">
          <section className="section-heading">
            <div>
              <p className="eyebrow">Tuyến tham quan</p>
              <h2>Lộ trình gợi ý</h2>
            </div>
            <span className="count">{routes.length} tuyến</span>
          </section>

          <section className="route-grid">
            {routes.map((route) => (
              <article className="route-card" key={route.id}>
                <div className="card__top">
                  <span className="card__area">{route.area_code}</span>
                  <span className="route-time">
                    {route.estimated_minutes} phút
                  </span>
                </div>

                <h3>{route.name}</h3>
                <p>{route.description}</p>

                <div className="route-card__footer">
                  <span>
                    {route.verified_at ? "Đã xác minh" : "Chưa xác minh"}
                  </span>

                  <button
                    className="card__button"
                    type="button"
                    onClick={() => void openRouteDetail(route.id)}
                  >
                    Xem lộ trình
                  </button>
                </div>
              </article>
            ))}
          </section>
        </section>

        <section className="feature-section">
          <div className="feature-copy">
            <p className="eyebrow">Location Suggestions</p>
            <h2>Gợi ý theo vị trí</h2>
            <p>
              Browser lấy GPS, frontend gửi tọa độ + độ chính xác + thời gian
              lấy mẫu cho backend. Backend kiểm tra radius và Redis cooldown.
            </p>

            <div className="action-row">
              <button
                className="primary-action"
                type="button"
                onClick={useCurrentLocation}
                disabled={locationLoading || !sessionReady}
              >
                {locationLoading ? "Đang xử lý..." : "Dùng vị trí hiện tại"}
              </button>

              <button
                className="secondary-action"
                type="button"
                onClick={useDemoLocation}
                disabled={locationLoading || !sessionReady}
              >
                Mô phỏng tại attraction đầu tiên
              </button>
            </div>

            {locationMessage && (
              <div className="inline-message">{locationMessage}</div>
            )}
          </div>

          <div className="suggestion-list">
            {locationSuggestions.length === 0 ? (
              <div className="empty-feature">
                Kết quả gợi ý sẽ xuất hiện tại đây.
              </div>
            ) : (
              locationSuggestions.map((item) => (
                <article className="suggestion-card" key={item.attraction_id}>
                  <span>{item.distance_m} m</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <button
                    type="button"
                    onClick={() => void openAttractionDetail(item.attraction_id)}
                  >
                    Mở chi tiết
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="chat-section">
          <div className="chat-intro">
            <p className="eyebrow">Knowledge Chat</p>
            <h2>Hỏi về điểm tham quan</h2>
            <p>
              Câu hỏi được gửi cùng attraction context. Backend tìm knowledge
              phù hợp và trả nội dung kèm citation.
            </p>

            <label className="field-label" htmlFor="chat-attraction">
              Điểm tham quan
            </label>
            <select
              id="chat-attraction"
              value={chatAttractionId}
              onChange={(event) =>
                setChatAttractionId(Number(event.target.value))
              }
            >
              {attractions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name ?? item.slug}
                </option>
              ))}
            </select>
          </div>

          <div className="chat-box">
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-placeholder">
                  Thử hỏi: “Địa điểm này có gì đặc biệt?”
                </div>
              )}

              {chatMessages.map((message, index) => (
                <article
                  className={`chat-bubble chat-bubble--${message.role}`}
                  key={`${message.role}-${index}`}
                >
                  <strong>
                    {message.role === "user" ? "Bạn" : "Hue Guide"}
                  </strong>
                  <p>{message.content}</p>

                  {message.citations &&
                    message.citations.length > 0 && (
                      <div className="citation-list">
                        {message.citations.map((citation, citationIndex) => (
                          <span key={`${citation.title}-${citationIndex}`}>
                            {citation.title ??
                              citation.source_credit ??
                              `Citation ${citationIndex + 1}`}
                          </span>
                        ))}
                      </div>
                    )}
                </article>
              ))}

              {chatLoading && (
                <article className="chat-bubble chat-bubble--assistant">
                  <strong>Hue Guide</strong>
                  <p>Đang tìm knowledge phù hợp...</p>
                </article>
              )}
            </div>

            {chatError && (
              <div className="chat-error">{chatError}</div>
            )}

            <form className="chat-form" onSubmit={submitChat}>
              <input
                value={chatQuestion}
                onChange={(event) => setChatQuestion(event.target.value)}
                placeholder="Nhập câu hỏi..."
                disabled={!sessionReady || chatLoading}
              />

              <button
                type="submit"
                disabled={
                  !sessionReady ||
                  chatLoading ||
                  !chatQuestion.trim() ||
                  chatAttractionId === ""
                }
              >
                Gửi
              </button>
            </form>
          </div>
        </section>
        <StaffDemo />
      </main>

      {overlayOpen && (
        <div className="detail-overlay" onClick={closeDetail}>
          <section
            className="detail-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="detail-close"
              type="button"
              onClick={closeDetail}
              aria-label="Đóng"
            >
              ×
            </button>

            {detailLoading && (
              <div className="detail-state">
                Đang tải chi tiết từ backend...
              </div>
            )}

            {detailError && (
              <div className="detail-state detail-state--error">
                {detailError}
              </div>
            )}

            {selectedAttraction && (
              <>
                <div className="detail-header">
                  <div>
                    <p className="eyebrow">
                      {selectedAttraction.area_code}
                    </p>
                    <h2>{selectedAttraction.name}</h2>
                  </div>

                  <div className="detail-badges">
                    <span>{selectedAttraction.content_language}</span>
                    {selectedAttraction.fallback_used && (
                      <span>Fallback VI</span>
                    )}
                  </div>
                </div>

                <p className="detail-description">
                  {selectedAttraction.description}
                </p>

                <div className="detail-facts">
                  <div>
                    <span>Vĩ độ</span>
                    <strong>{selectedAttraction.latitude}</strong>
                  </div>
                  <div>
                    <span>Kinh độ</span>
                    <strong>{selectedAttraction.longitude}</strong>
                  </div>
                  <div>
                    <span>Bán kính gợi ý</span>
                    <strong>
                      {selectedAttraction.trigger_radius_m} m
                    </strong>
                  </div>
                </div>

                {imageMedia.length > 0 && (
                  <section className="detail-section">
                    <h3>Hình ảnh</h3>
                    <div className="media-grid">
                      {imageMedia.map((item) => (
                        <figure className="image-card" key={item.id}>
                          <img
                            src={item.url}
                            alt={item.caption ?? selectedAttraction.name}
                          />
                          <figcaption>
                            <strong>
                              {item.caption ?? "Hình ảnh điểm tham quan"}
                            </strong>
                            <span>{item.credit}</span>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </section>
                )}

                {audioMedia.length > 0 && (
                  <section className="detail-section">
                    <h3>Audio thuyết minh</h3>
                    <div className="audio-list">
                      {audioMedia.map((item) => (
                        <article className="audio-card" key={item.id}>
                          <div>
                            <strong>
                              {item.caption ?? "Audio thuyết minh"}
                            </strong>
                            <span>
                              Ngôn ngữ: {item.language ?? "N/A"}
                            </span>
                          </div>
                          <audio controls preload="metadata" src={item.url}>
                            Trình duyệt không hỗ trợ audio.
                          </audio>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <section className="detail-section">
                  <h3>Nguồn tham khảo</h3>
                  {selectedAttraction.sources.length > 0 ? (
                    <ul className="source-list">
                      {selectedAttraction.sources.map((source, index) => (
                        <li key={`${index}-${getSourceLabel(source, index)}`}>
                          {getSourceLabel(source, index)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">
                      Chưa có nguồn tham khảo hiển thị.
                    </p>
                  )}
                </section>
              </>
            )}

            {selectedRoute && (
              <>
                <div className="detail-header">
                  <div>
                    <p className="eyebrow">{selectedRoute.area_code}</p>
                    <h2>{selectedRoute.name}</h2>
                  </div>

                  <div className="detail-badges">
                    <span>{selectedRoute.estimated_minutes} phút</span>
                    <span>
                      {selectedRoute.verified_at
                        ? "Đã xác minh"
                        : "Chưa xác minh"}
                    </span>
                  </div>
                </div>

                <p className="detail-description">
                  {selectedRoute.description}
                </p>

                <section className="detail-section">
                  <h3>Các điểm dừng</h3>

                  <div className="stop-list">
                    {selectedRoute.stops.map((stop) => (
                      <article className="stop-card" key={stop.id}>
                        <div className="stop-order">{stop.order}</div>

                        <div className="stop-card__body">
                          <h4>
                            {stop.attraction_name ??
                              `Attraction #${stop.attraction_id}`}
                          </h4>

                          <p>{stop.attraction_slug}</p>

                          <div className="stop-meta">
                            <span>
                              Tham quan:{" "}
                              {stop.visit_minutes ?? "N/A"} phút
                            </span>
                            <span>
                              Di chuyển từ điểm trước:{" "}
                              {stop.travel_minutes_from_previous ?? 0} phút
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
