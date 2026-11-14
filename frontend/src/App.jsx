import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  HeartPulse,
  ChartNoAxesCombined,
  Target,
  ShoppingBag,
  MessageCircle,
  Settings,
  LogOut,
  Bell,
  Search,
  Plus,
  Upload,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  Trash2,
  CalendarDays,
  Send,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import api from "./api";

/* =========================================================
   HELPERS
   ========================================================= */

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const dateToday = () => new Date().toISOString().slice(0, 10);

const chartColors = [
  "#4169e1",
  "#27b98a",
  "#f3a64a",
  "#9b83df",
  "#e27f91",
  "#9aa6b8",
];

const nav = [
  ["Overview", "/", LayoutDashboard],
  ["Transactions", "/transactions", ArrowLeftRight],
  ["Cash Flow Forecast", "/forecast", TrendingUp],
  ["Financial Health", "/health", HeartPulse],
  ["Spending Insights", "/insights", ChartNoAxesCombined],
  ["Savings Challenges", "/challenges", Target],
  ["Before You Buy", "/purchase", ShoppingBag],
  ["AI Finance Assistant", "/assistant", MessageCircle],
  ["Settings", "/settings", Settings],
];

/* =========================================================
   AUTHENTICATION
   ========================================================= */

function Auth({ mode = "login", onAuth }) {
  const [isLogin, setLogin] = useState(mode === "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navg = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { data } = await api.post(
        isLogin ? "/auth/login" : "/auth/register",
        isLogin ? { email, password } : { name, email, password },
      );

      localStorage.setItem("nexwealth_token", data.access_token);
      localStorage.setItem("nexwealth_user", JSON.stringify(data.user));
      onAuth(data.user);
      navg("/");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not sign in. Check the API is running.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-art">
        <div className="brand large">
          <span className="brand-mark">N</span>
          NexWealth
        </div>

        <div className="auth-copy">
          <span className="eyebrow">
            A LITTLE CLARITY. A WEALTH OF POSSIBILITY.
          </span>

          <h1>
            Predict tomorrow's cash flow. Make smarter money decisions today.
          </h1>

          <p>
            Your AI-powered companion for a calmer, more confident financial
            future.
          </p>

          <div className="auth-illustration-wrap">
            <img
              src="/images/nexwealth-auth-illustration.png"
              alt="NexWealth savings and financial growth illustration"
              className="auth-illustration"
            />
          </div>
        </div>

        <div className="auth-bottom">© 2026 NexWealth · Built around you</div>
      </div>

      <div className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>{isLogin ? "Welcome back." : "Let’s start with you."}</h2>
          <p>
            {isLogin
              ? "Sign in to see your financial picture."
              : "Create your free account and find your financial clarity."}
          </p>

          {!isLogin && (
            <label>
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                required
                minLength="2"
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength="8"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button className="btn primary full" disabled={busy}>
            {busy
              ? "Please wait…"
              : isLogin
                ? "Sign in to NexWealth →"
                : "Create my account →"}
          </button>

          <div className="auth-switch">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setLogin(!isLogin)}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>

          <div className="privacy-note">
            <ShieldCheck size={16} />
            Your financial data stays private to your account.
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   APP SHELL
   ========================================================= */

function Shell({ user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();

  // Global search
  const [search, setSearch] = useState("");
  const [transactionResults, setTransactionResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Notifications
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const readKey = `nexwealth_read_alerts_${user?.id || "user"}`;

  const [readAlertIds, setReadAlertIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(readKey) || "[]");
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  // Search actual transactions
  useEffect(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      setTransactionResults([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");

      try {
        const { data } = await api.get("/transactions");

        const matches = (Array.isArray(data) ? data : [])
          .filter((item) => {
            const searchableText = [
              item.description,
              item.category,
              item.type,
              item.date,
              item.amount,
            ]
              .join(" ")
              .toLowerCase();

            return searchableText.includes(term);
          })
          .slice(0, 6);

        if (!cancelled) {
          setTransactionResults(matches);
        }
      } catch {
        if (!cancelled) {
          setTransactionResults([]);
          setSearchError("Could not search transactions.");
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  // Fetch real notifications from the backend
  async function loadNotifications() {
    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const { data } = await api.get("/alerts");
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch (err) {
      setNotificationsError(
        err.response?.data?.detail || "Could not load notifications.",
      );
    } finally {
      setNotificationsLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const unreadCount = alerts.filter(
    (item) => !readAlertIds.includes(String(item.id)),
  ).length;

  function markAlertRead(id) {
    const next = [...new Set([...readAlertIds, String(id)])];

    setReadAlertIds(next);
    localStorage.setItem(readKey, JSON.stringify(next));
  }

  function markAllRead() {
    const next = [
      ...new Set([...readAlertIds, ...alerts.map((item) => String(item.id))]),
    ];

    setReadAlertIds(next);
    localStorage.setItem(readKey, JSON.stringify(next));
  }

  // Find matching application pages
  const matchedPages = nav.filter(([label]) =>
    label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  function openPage(path) {
    navigate(path);
    setSearch("");
    setTransactionResults([]);
  }

  function openTransaction(item) {
    navigate(`/transactions?q=${encodeURIComponent(item.description)}`);
    setSearch("");
    setTransactionResults([]);
  }

  function handleSearchKeyDown(e) {
    if (e.key === "Escape") {
      setSearch("");
      setTransactionResults([]);
    }

    if (e.key === "Enter") {
      if (matchedPages.length > 0) {
        openPage(matchedPages[0][1]);
      } else if (transactionResults.length > 0) {
        openTransaction(transactionResults[0]);
      }
    }
  }

  useEffect(() => {
    setNotificationsOpen(false);
  }, [loc.pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "show" : ""}`}>
        <div className="brand">
          <span className="brand-mark">N</span>
          NexWealth
        </div>

        <div className="side-label">PERSONAL FINANCE</div>

        <nav>
          {nav.map(([label, path, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={17} />
            <b>A little clarity.</b>
            <span>A lot more confidence.</span>
          </div>

          <button className="user-mini" onClick={onLogout}>
            <div className="avatar">{(user?.name || "A")[0].toUpperCase()}</div>
            <div>
              <b>{user?.name || "Alex Morgan"}</b>
              <small>Personal account</small>
            </div>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>

          {/* GLOBAL SEARCH */}
          <div className="search-wrap">
            <div className="search-global">
              <Search size={17} />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search transactions, insights and more..."
                autoComplete="off"
              />

              {search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setSearch("");
                    setTransactionResults([]);
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {search.trim() && (
              <div className="search-results">
                {searching && (
                  <div className="search-status">
                    Searching your transactions...
                  </div>
                )}

                {!searching && matchedPages.length > 0 && (
                  <div className="search-result-group">
                    <span className="search-group-title">PAGES</span>

                    {matchedPages.map(([label, path, Icon]) => (
                      <button
                        type="button"
                        className="search-result-item"
                        key={path}
                        onClick={() => openPage(path)}
                      >
                        <Icon size={17} />
                        <span>{label}</span>
                        <small>Open page →</small>
                      </button>
                    ))}
                  </div>
                )}

                {!searching && transactionResults.length > 0 && (
                  <div className="search-result-group">
                    <span className="search-group-title">TRANSACTIONS</span>

                    {transactionResults.map((item) => (
                      <button
                        type="button"
                        className="search-result-item"
                        key={item.id}
                        onClick={() => openTransaction(item)}
                      >
                        <Wallet size={17} />

                        <span className="search-transaction-info">
                          <b>{item.description}</b>
                          <small>
                            {item.category} · {item.date}
                          </small>
                        </span>

                        <strong>
                          {item.type === "income" ? "+" : "−"}
                          {money(item.amount)}
                        </strong>
                      </button>
                    ))}
                  </div>
                )}

                {!searching &&
                  !matchedPages.length &&
                  !transactionResults.length && (
                    <div className="search-status">
                      {searchError ||
                        "No matching pages or transactions found."}
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* TOP ACTIONS */}
          <div className="top-actions">
            <div className="notification-wrap">
              <button
                className="icon-btn notification-button"
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  loadNotifications();
                }}
              >
                <Bell size={19} />

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-menu">
                  <div className="notification-menu-head">
                    <div>
                      <b>Notifications</b>
                      <small>
                        {unreadCount > 0
                          ? `${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`
                          : "You're all caught up"}
                      </small>
                    </div>

                    <button type="button" onClick={loadNotifications}>
                      Refresh
                    </button>
                  </div>

                  {notificationsLoading && (
                    <div className="notification-empty">
                      Loading notifications...
                    </div>
                  )}

                  {!notificationsLoading && notificationsError && (
                    <div className="notification-empty notification-error">
                      {notificationsError}
                    </div>
                  )}

                  {!notificationsLoading &&
                    !notificationsError &&
                    alerts.length === 0 && (
                      <div className="notification-empty">
                        <CheckCircle2 size={26} />
                        <b>No unusual spending detected</b>
                        <span>
                          Spending alerts will appear here when unusual
                          transactions are detected.
                        </span>
                      </div>
                    )}

                  {!notificationsLoading &&
                    !notificationsError &&
                    alerts.length > 0 && (
                      <>
                        <div className="notification-list">
                          {alerts.map((item) => {
                            const isRead = readAlertIds.includes(
                              String(item.id),
                            );

                            return (
                              <button
                                type="button"
                                key={item.id}
                                className={`notification-item ${
                                  isRead ? "read" : "unread"
                                }`}
                                onClick={() => {
                                  markAlertRead(item.id);
                                  setNotificationsOpen(false);
                                  navigate("/insights");
                                }}
                              >
                                <span className="notification-alert-icon">
                                  <AlertTriangle size={17} />
                                </span>

                                <span className="notification-content">
                                  <b>{item.description}</b>
                                  <strong>
                                    {money(item.amount)} · {item.category}
                                  </strong>
                                  <small>{item.message}</small>
                                  <small>{item.date}</small>
                                </span>

                                {!isRead && <span className="unread-dot" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="notification-menu-foot">
                          <button type="button" onClick={markAllRead}>
                            Mark all as read
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              navigate("/insights");
                            }}
                          >
                            View insights →
                          </button>
                        </div>
                      </>
                    )}
                </div>
              )}
            </div>

            <div className="avatar">{(user?.name || "A")[0].toUpperCase()}</div>

            <span className="user-name">{user?.name || "Alex Morgan"}</span>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

/* =========================================================
   SHARED COMPONENTS
   ========================================================= */

function PageHead({ title, subtitle, action }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">PERSONAL FINANCE</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Metric({ label, value, change, icon: Icon, tone = "blue" }) {
  return (
    <div className="metric card">
      <div className="metric-head">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <small className={change?.startsWith("↓") ? "positive" : "muted"}>
        {change || "Based on your recorded activity"}
      </small>
    </div>
  );
}

function useLoad(path, initial) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      setLoading(true);
      const r = await api.get(path);
      setData(r.data);
      setError("");
    } catch (e) {
      setError(e.response?.data?.detail || "Could not load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [path]);

  return { data, setData, loading, error, reload };
}

function Empty({ text }) {
  return (
    <div className="empty">
      <Wallet size={25} />
      <p>{text}</p>
    </div>
  );
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function Dashboard() {
  const navigate = useNavigate();
  const { data: d, loading, reload } = useLoad("/dashboard", {});
  const { data: analytics, reload: reloadAnalytics } = useLoad("/analytics", {
    categories: [],
    monthly: [],
  });

  const forecast = d.forecast || [];
  const categories = analytics.categories || [];
  const monthly = analytics.monthly || [];

  return (
    <div className="page">
      <PageHead
        title={`Good ${
          new Date().getHours() < 12
            ? "Morning"
            : new Date().getHours() < 17
              ? "Afternoon"
              : "Evening"
        }, ${(d.name || "there").split(" ")[0]}!`}
        subtitle="Here’s your financial overview."
        action={
          <button
            className="btn primary"
            onClick={() => navigate("/transactions?add=1")}
          >
            <Plus size={17} />
            Add Transaction
          </button>
        }
      />
      <div className="dashboard-welcome-banner">
        <div className="dashboard-welcome-copy">
          <span className="eyebrow">YOUR FINANCIAL JOURNEY</span>

          <h2>
            Small steps today.
            <br />
            Bigger possibilities tomorrow.
          </h2>

          <p>
            Track your money, build better habits and move closer to your
            financial goals.
          </p>
        </div>

        <img
          src="/images/nexwealth-dashboard-illustration.png"
          alt="Managing personal finances"
        />
      </div>
      <div className="metric-grid">
        <Metric
          label="Total Balance"
          value={money(d.balance)}
          change="↑ Your recorded net balance"
          icon={Wallet}
        />
        <Metric
          label="Monthly Income"
          value={money(d.monthly_income)}
          change="Income this month"
          icon={ArrowDownRight}
          tone="green"
        />
        <Metric
          label="Monthly Expenses"
          value={money(d.monthly_expenses)}
          change="Expenses this month"
          icon={ArrowUpRight}
          tone="orange"
        />
        <Metric
          label="Safe to Spend"
          value={money(d.safe_to_spend)}
          change="After recorded goals reserve"
          icon={ShieldCheck}
          tone="purple"
        />
      </div>

      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="section-title">
            <div>
              <h3>Cash flow forecast</h3>
              <p>Your next 30 days, in perspective</p>
            </div>
            <span className="pill">
              <span className="dot" /> Estimate
            </span>
          </div>

          {forecast.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient
                      id="forecastFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#4169e1"
                        stopOpacity={0.22}
                      />
                      <stop offset="95%" stopColor="#4169e1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#edf0f6"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => v.slice(5)}
                    tick={{ fontSize: 11, fill: "#8b95a8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    tick={{ fontSize: 11, fill: "#8b95a8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={(v) => money(v)} />
                  <Area
                    type="monotone"
                    dataKey="predicted_balance"
                    stroke="#4169e1"
                    strokeWidth={3}
                    fill="url(#forecastFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="Add transactions to create your cash-flow forecast." />
          )}

          <div className="chart-foot">
            <span>
              ↗ Your balance estimate is based on recent transactions.
            </span>
            <a href="/forecast">View forecast →</a>
          </div>
        </section>

        <section className="card health-card">
          <div className="section-title">
            <div>
              <h3>Financial health</h3>
              <p>The habits behind your score</p>
            </div>
            <span className="sparkle">
              <Sparkles size={18} />
            </span>
          </div>

          <div
            className="score-ring"
            style={{ "--score": `${d.health?.score || 0}%` }}
          >
            <div>
              <b>{d.health?.score ?? "—"}</b>
              <small>/100</small>
            </div>
          </div>

          <h4>{d.health?.label || "Add transactions to begin"}</h4>
          <p className="muted center">
            {d.health?.explanation ||
              "Your score will appear when you add activity."}
          </p>
          <a className="link-center" href="/health">
            View detailed analysis →
          </a>
        </section>
      </div>

      <div className="dashboard-grid dashboard-analytics-grid">
        <section className="card chart-card">
          <div className="section-title">
            <div>
              <h3>Spending Breakdown</h3>
              <p>See where your money goes</p>
            </div>
            <span className="pill">By category</span>
          </div>

          {categories.length > 0 ? (
            <div className="donut-area">
              <ResponsiveContainer width="55%" height={260}>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {categories.map((item, index) => (
                      <Cell
                        key={`dashboard-category-${index}`}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money(value)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="legend">
                {categories.map((item, index) => (
                  <div key={`dashboard-legend-${index}`}>
                    <i
                      style={{
                        background: chartColors[index % chartColors.length],
                      }}
                    />
                    <span>{item.category}</span>
                    <b>{money(item.amount)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="Add expenses to see your spending breakdown." />
          )}

          <div className="chart-foot">
            <span>Understand your biggest spending categories.</span>
            <a href="/insights">View insights →</a>
          </div>
        </section>

        <section className="card chart-card">
          <div className="section-title">
            <div>
              <h3>Monthly Activity</h3>
              <p>Income compared with expenses</p>
            </div>
            <span className="pill">Monthly</span>
          </div>

          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthly}
                margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#edf0f6"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#8b95a8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 11, fill: "#8b95a8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => money(value)} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#27b98a"
                  radius={[5, 5, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#4169e1"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="Monthly activity will appear when you add transactions." />
          )}

          <div className="chart-foot">
            <span>
              <i className="green-dot">●</i> Income &nbsp;&nbsp;
              <i style={{ color: "#4169e1" }}>●</i> Expenses
            </span>
            <a href="/insights">View details →</a>
          </div>
        </section>
      </div>

      <div className="bottom-grid">
        <section className="card">
          <div className="section-title">
            <div>
              <h3>Recent transactions</h3>
              <p>Every transaction. A clearer picture.</p>
            </div>
            <a href="/transactions">View all →</a>
          </div>
          <TransactionList items={d.recent_transactions || []} />
        </section>

        <section className="card insights-card">
          <div className="section-title">
            <div>
              <h3>
                <Sparkles size={17} /> Your next best moves
              </h3>
              <p>Small changes add up.</p>
            </div>
          </div>

          <div className="insight">
            <span className="insight-num">01</span>
            <div>
              <b>Build a clear picture</b>
              <p>Add regular income and bills to improve your forecast.</p>
            </div>
          </div>

          <div className="insight">
            <span className="insight-num">02</span>
            <div>
              <b>Make saving automatic</b>
              <p>Start with a small weekly savings goal.</p>
            </div>
          </div>

          <a href="/assistant" className="btn soft full">
            Ask your AI assistant <ArrowUpRight size={16} />
          </a>
        </section>
      </div>

      {loading && (
        <div className="loading-line">Refreshing your financial picture…</div>
      )}
    </div>
  );
}

/* =========================================================
   TRANSACTION LIST
   ========================================================= */

function TransactionList({ items = [], onDelete }) {
  if (!items.length) {
    return (
      <Empty text="No transactions yet. Add your first transaction or import a CSV." />
    );
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>TRANSACTION</th>
            <th>DATE</th>
            <th>CATEGORY</th>
            <th>AMOUNT</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.id}>
              <td>
                <b>{x.description}</b>
                <small>{x.type}</small>
              </td>
              <td>{x.date}</td>
              <td>
                <span className="category-tag">{x.category}</span>
              </td>
              <td className={x.type === "income" ? "amount-in" : "amount-out"}>
                {x.type === "income" ? "+" : "−"}
                {money(x.amount)}
              </td>
              {onDelete && (
                <td>
                  <button className="tiny-icon" onClick={() => onDelete(x.id)}>
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* =========================================================
   TRANSACTIONS
   ========================================================= */

function Transactions() {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: items, reload } = useLoad("/transactions", []);

  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get("q") || "";
  const shouldOpenModal = queryParams.get("add") === "1";

  const [show, setShow] = useState(false);

  const [form, setForm] = useState({
    date: dateToday(),
    description: "",
    category: "Auto",
    amount: "",
    type: "expense",
  });

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Open Add Transaction modal from Dashboard
  useEffect(() => {
    if (shouldOpenModal) {
      setShow(true);
    }
  }, [shouldOpenModal]);

  // Close modal and remove the add query parameter
  function closeAddModal() {
    setShow(false);

    queryParams.delete("add");

    const remainingQuery = queryParams.toString();

    navigate(
      `${location.pathname}${remainingQuery ? `?${remainingQuery}` : ""}`,
      { replace: true },
    );
  }

  // Filter transactions from global search
  const filteredItems = items.filter((item) => {
    const searchableText = [
      item.description,
      item.category,
      item.type,
      item.date,
      item.amount,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query.toLowerCase());
  });

  // Add transaction
  async function add(e) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setMsg("");

    try {
      await api.post("/transactions", {
        ...form,
        amount: Number(form.amount),
      });

      setForm({
        date: dateToday(),
        description: "",
        category: "Auto",
        amount: "",
        type: "expense",
      });

      closeAddModal();

      await reload();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Could not save transaction.");
    } finally {
      setBusy(false);
    }
  }

  // Delete transaction
  async function del(id) {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      await api.delete(`/transactions/${id}`);
      await reload();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Could not delete transaction.");
    }
  }

  // CSV upload
  async function upload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      const { data } = await api.post("/transactions/upload", fd);

      setMsg(
        `${data.imported} imported · ${data.duplicates_skipped} duplicates skipped`,
      );

      await reload();
    } catch (err) {
      setMsg(err.response?.data?.detail || "CSV import failed.");
    }

    e.target.value = "";
  }

  return (
    <div className="page">
      <PageHead
        title="Transactions"
        subtitle="Your money, organised in one place."
        action={
          <div className="action-row">
            <label className="btn secondary file-btn">
              <Upload size={16} />
              Upload CSV
              <input type="file" accept=".csv" hidden onChange={upload} />
            </label>

            <button
              className="btn primary"
              onClick={() => {
                setMsg("");
                setShow(true);
              }}
            >
              <Plus size={17} />
              Add transaction
            </button>
          </div>
        }
      />

      {msg && <div className="notice">{msg}</div>}

      <div className="card table-card">
        <div className="section-title">
          <div>
            <h3>All transactions</h3>
            <p>
              {query
                ? `Search results for "${query}"`
                : "Every detail, accounted for."}
            </p>
          </div>

          <div className="action-row">
            <span className="pill">{filteredItems.length} records</span>

            {query && (
              <button
                className="btn secondary"
                onClick={() => navigate("/transactions")}
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <TransactionList items={filteredItems} onDelete={del} />
        ) : (
          <Empty
            text={
              query
                ? `No transactions found for "${query}".`
                : "No transactions yet. Add your first transaction or import a CSV."
            }
          />
        )}
      </div>

      {show && (
        <Modal title="Add transaction" close={closeAddModal}>
          <form className="form-grid" onSubmit={add}>
            <label>
              Description
              <input
                required
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                placeholder="Lunch with friends"
              />
            </label>

            <label>
              Amount (₹)
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value,
                  })
                }
              />
            </label>

            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    date: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Type
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              Category
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
              >
                {[
                  "Auto",
                  "Food",
                  "Travel",
                  "Shopping",
                  "Bills",
                  "Entertainment",
                  "Other",
                ].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            {msg && <div className="error span2">{msg}</div>}

            <button
              type="submit"
              className="btn primary full span2"
              disabled={busy}
            >
              {busy ? "Saving..." : "Save transaction"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, close, children }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal">
        <div className="section-title">
          <h3>{title}</h3>
          <button className="tiny-icon" onClick={close}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   CASH FLOW FORECAST
   ========================================================= */

function Forecast() {
  const { data: d } = useLoad("/forecast?days=30", {});

  const [days, setDays] = useState(30);
  const [chart, setChart] = useState([]);
  const [chartError, setChartError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        setChartError("");

        const response = await api.get(`/forecast?days=${days}`);

        if (!cancelled) {
          setChart(response.data.forecast || []);
        }
      } catch (error) {
        if (!cancelled) {
          setChart([]);
          setChartError(
            error.response?.data?.detail || "Could not load forecast data.",
          );
        }
      }
    }

    loadForecast();

    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="page">
      <PageHead
        title="Cash Flow Forecast"
        subtitle="See your income, expenses and projected balance together."
      />

      <div className="metric-grid three">
        <Metric
          label="Current balance"
          value={money(d.current_balance)}
          icon={Wallet}
        />

        <Metric
          label="Estimated daily net"
          value={money(d.estimated_daily_net_change)}
          icon={TrendingUp}
          tone="green"
        />

        <Metric
          label="Forecast horizon"
          value={`${days} days`}
          icon={CalendarDays}
          tone="purple"
        />
      </div>

      <section className="card chart-card">
        <div className="section-title">
          <div>
            <h3>Cash Flow Overview</h3>
            <p>
              Compare your projected balance with estimated income and expenses.
            </p>
          </div>

          <select
            className="select-small"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value="7">7 days</option>
            <option value="15">15 days</option>
            <option value="30">30 days</option>
          </select>
        </div>

        {chartError ? (
          <div className="error">{chartError}</div>
        ) : chart.length > 0 ? (
          <div className="chart-wrap tall">
            <ResponsiveContainer width="100%" height={360}>
              <LineChart
                data={chart}
                margin={{
                  top: 15,
                  right: 25,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#edf0f6"
                />

                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => value.slice(5)}
                  tick={{ fontSize: 11, fill: "#8792a7" }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* Left axis: projected balance */}
                <YAxis
                  yAxisId="balance"
                  orientation="left"
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 11, fill: "#4169e1" }}
                  axisLine={false}
                  tickLine={false}
                />

                {/* Right axis: daily income and expenses */}
                <YAxis
                  yAxisId="flow"
                  orientation="right"
                  tickFormatter={(value) => `₹${Math.round(value)}`}
                  tick={{ fontSize: 11, fill: "#8792a7" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value, name) => [money(value), name]}
                  labelFormatter={(value) => `Date: ${value}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #edf0f6",
                    boxShadow: "0 5px 20px rgba(30,48,85,.08)",
                  }}
                />

                <Legend verticalAlign="bottom" height={40} />

                {/* Projected balance */}
                <Line
                  yAxisId="balance"
                  type="monotone"
                  dataKey="predicted_balance"
                  name="Projected Balance"
                  stroke="#4169e1"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />

                {/* Estimated income */}
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="estimated_income"
                  name="Estimated Income"
                  stroke="#27b98a"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />

                {/* Estimated expenses */}
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="estimated_expenses"
                  name="Estimated Expenses"
                  stroke="#f3a64a"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty text="No forecast data available yet." />
        )}

        <div className="disclaimer">
          <AlertTriangle size={16} />
          {d.disclaimer ||
            "Income and expense values are estimates based on recent activity, not guaranteed future transactions."}
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   FINANCIAL HEALTH
   ========================================================= */

function Health() {
  const { data: d } = useLoad("/health-score", {});

  return (
    <div className="page">
      <PageHead
        title="Financial Health"
        subtitle="Small habits. Stronger financial wellbeing."
      />

      <div className="health-layout">
        <section className="card health-large">
          <div className="eyebrow">YOUR FINANCIAL HEALTH</div>
          <div
            className="score-ring big"
            style={{ "--score": `${d.score || 0}%` }}
          >
            <div>
              <b>{d.score ?? "—"}</b>
              <small>/100</small>
            </div>
          </div>
          <h2>{d.label || "Building your picture"}</h2>
          <p className="muted center">{d.explanation}</p>
        </section>

        <section className="card breakdown">
          <h3>The habits behind your score</h3>

          {Object.entries(d.breakdown || {}).map(([k, v]) => (
            <div className="bar-row" key={k}>
              <div>
                <span>
                  {k
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <b>{v}/100</b>
              </div>
              <div className="progress">
                <i style={{ width: `${v}%` }} />
              </div>
            </div>
          ))}

          <div className="notice">
            <Sparkles size={16} />
            Build an emergency fund and keep tracking transactions to strengthen
            your financial habits.
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   SPENDING INSIGHTS - REDESIGNED
   ========================================================= */

function Insights() {
  const { data: d } = useLoad("/analytics", {
    categories: [],
    monthly: [],
  });

  const { data: a } = useLoad("/alerts", {
    alerts: [],
  });

  const alerts = a.alerts || [];
  const categories = d.categories || [];
  const monthly = d.monthly || [];

  const totalSpending = categories.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const highestCategory = [...categories].sort(
    (x, y) => Number(y.amount) - Number(x.amount),
  )[0];

  return (
    <div className="page insights-page">
      <style>{`
        .insights-page .insight-summary {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:16px;
          margin-bottom:24px;
        }
        .insights-page .summary-card {
          background:linear-gradient(135deg,#fff,#f7f8ff);
          border:1px solid #e9edf7;
          border-radius:16px;
          padding:20px;
          min-width:0;
        }
        .insights-page .summary-label {
          color:#8490a5;
          font-size:13px;
          margin-bottom:12px;
        }
        .insights-page .summary-value {
          font-size:24px;
          font-weight:750;
          color:#17233d;
          overflow-wrap:anywhere;
        }
        .insights-page .summary-icon {
          width:38px;height:38px;
          display:grid;place-items:center;
          border-radius:12px;margin-bottom:15px;
        }
        .insights-page .summary-icon.blue {background:#eaf0ff;color:#4169e1}
        .insights-page .summary-icon.green {background:#e6f8f0;color:#20a878}
        .insights-page .summary-icon.orange {background:#fff2e4;color:#ed912e}
        .insights-page .insights-main-grid {
          display:grid;
          grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
          gap:20px;align-items:stretch;
        }
        .insights-page .insight-card {
          background:#fff;border:1px solid #e9edf5;
          border-radius:18px;padding:23px;min-width:0;
          box-shadow:0 5px 20px rgba(30,48,85,.035);
        }
        .insights-page .insight-card-heading {
          display:flex;justify-content:space-between;
          align-items:flex-start;gap:12px;margin-bottom:20px;
        }
        .insights-page .insight-card-heading h3 {
          margin:0 0 6px;color:#17233d;font-size:17px;
        }
        .insights-page .insight-card-heading p {
          margin:0;color:#8792a7;font-size:13px;
        }
        .insights-page .insight-tag {
          background:#f0f3ff;color:#4169e1;
          padding:7px 11px;border-radius:20px;
          font-size:11px;font-weight:700;white-space:nowrap;
        }
        .insights-page .spending-center {
          display:flex;align-items:center;justify-content:center;
          flex-direction:column;text-align:center;pointer-events:none;
        }
        .insights-page .spending-center strong {
          font-size:19px;color:#17233d;
        }
        .insights-page .spending-center span {
          color:#8792a7;font-size:11px;margin-top:4px;
        }
        .insights-page .insight-donut {
          display:flex;align-items:center;justify-content:center;
          gap:15px;min-height:280px;
        }
        .insights-page .insight-legend {
          flex:1;min-width:0;display:flex;
          flex-direction:column;gap:13px;
        }
        .insights-page .legend-item {
          display:grid;grid-template-columns:9px minmax(0,1fr) auto;
          gap:9px;align-items:center;font-size:12px;color:#758198;
        }
        .insights-page .legend-dot {
          width:9px;height:9px;border-radius:3px;
        }
        .insights-page .legend-item b {
          color:#273650;font-size:11px;white-space:nowrap;
        }
        .insights-page .alerts-panel {
          display:flex;flex-direction:column;
          padding:0;overflow:hidden;
        }
        .insights-page .alerts-header {
          padding:23px 23px 17px;border-bottom:1px solid #edf0f6;
        }
        .insights-page .alerts-title-row {
          display:flex;justify-content:space-between;
          align-items:center;gap:12px;
        }
        .insights-page .alerts-title {
          display:flex;align-items:center;gap:10px;
        }
        .insights-page .alerts-title h3 {
          font-size:17px;color:#17233d;margin:0;
        }
        .insights-page .alerts-icon {
          width:36px;height:36px;display:grid;place-items:center;
          border-radius:11px;background:#fff3e6;color:#ed8a25;
        }
        .insights-page .alert-count {
          background:#fff0e4;color:#d97716;border-radius:20px;
          padding:6px 10px;font-size:11px;font-weight:750;
        }
        .insights-page .alerts-header p {
          margin:10px 0 0;font-size:13px;color:#8792a7;
        }
        .insights-page .alerts-list {
          max-height:480px;overflow-y:auto;
        }
        .insights-page .alert-item {
          display:flex;gap:13px;padding:17px 22px;
          border-bottom:1px solid #edf0f6;
          transition:background .2s ease;
        }
        .insights-page .alert-item:hover {background:#fafbff}
        .insights-page .alert-symbol {
          flex-shrink:0;width:32px;height:32px;
          display:grid;place-items:center;border-radius:10px;
          background:#fff4e8;color:#e88924;
        }
        .insights-page .alert-content {min-width:0;flex:1}
        .insights-page .alert-content strong {
          display:block;color:#25344e;font-size:13px;
          line-height:1.5;overflow-wrap:anywhere;
        }
        .insights-page .alert-content p {
          margin:5px 0 0;color:#8994a8;
          font-size:12px;line-height:1.5;
        }
        .insights-page .alert-empty {
          padding:35px 20px;text-align:center;color:#7d899e;
        }
        .insights-page .alert-empty svg {
          color:#25b486;margin-bottom:10px;
        }
        .insights-page .monthly-card {margin-top:22px}
        .insights-page .monthly-legend {
          display:flex;gap:18px;flex-wrap:wrap;
          margin-top:15px;color:#7f8ba0;font-size:12px;
        }
        .insights-page .monthly-legend span {
          display:flex;align-items:center;gap:7px;
        }
        .insights-page .monthly-legend i {
          width:9px;height:9px;border-radius:3px;
        }
        @media(max-width:1050px) {
          .insights-page .insights-main-grid {grid-template-columns:1fr}
        }
        @media(max-width:650px) {
          .insights-page .insight-summary {grid-template-columns:1fr}
          .insights-page .insight-donut {flex-direction:column}
          .insights-page .insight-legend {width:100%}
          .insights-page .insight-card {padding:17px}
          .insights-page .alerts-header {padding:18px}
          .insights-page .alert-item {padding:15px 17px}
        }
      `}</style>

      <PageHead
        title="Spending Insights"
        subtitle="Know where your money goes. And where it could take you."
      />

      <div className="insight-summary">
        <div className="summary-card">
          <div className="summary-icon blue">
            <Wallet size={19} />
          </div>
          <div className="summary-label">Total recorded spending</div>
          <div className="summary-value">{money(totalSpending)}</div>
        </div>

        <div className="summary-card">
          <div className="summary-icon green">
            <ChartNoAxesCombined size={19} />
          </div>
          <div className="summary-label">Spending categories</div>
          <div className="summary-value">{categories.length}</div>
        </div>

        <div className="summary-card">
          <div className="summary-icon orange">
            <AlertTriangle size={19} />
          </div>
          <div className="summary-label">Unusual spending alerts</div>
          <div className="summary-value">{alerts.length}</div>
        </div>
      </div>

      <div className="insights-main-grid">
        <section className="insight-card">
          <div className="insight-card-heading">
            <div>
              <h3>Where your money went</h3>
              <p>Your expense breakdown by category</p>
            </div>
            <span className="insight-tag">SPENDING</span>
          </div>

          {categories.length > 0 ? (
            <div className="insight-donut">
              <div style={{ width: "55%", minWidth: 0, position: "relative" }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={72}
                      outerRadius={105}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {categories.map((x, i) => (
                        <Cell
                          key={`insight-category-${i}`}
                          fill={chartColors[i % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div
                  className="spending-center"
                  style={{
                    position: "absolute",
                    inset: 0,
                    justifyContent: "center",
                  }}
                >
                  <strong>{money(totalSpending)}</strong>
                  <span>Total expenses</span>
                </div>
              </div>

              <div className="insight-legend">
                {categories.map((x, i) => (
                  <div className="legend-item" key={`insight-legend-${i}`}>
                    <i
                      className="legend-dot"
                      style={{
                        background: chartColors[i % chartColors.length],
                      }}
                    />
                    <span>{x.category}</span>
                    <b>{money(x.amount)}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Empty text="Add expenses to see your spending breakdown." />
          )}

          {highestCategory && (
            <div className="notice" style={{ marginTop: 15 }}>
              <Sparkles size={16} />
              Your highest recorded spending category is{" "}
              <b>{highestCategory.category}</b>.
            </div>
          )}
        </section>

        <section className="insight-card alerts-panel">
          <div className="alerts-header">
            <div className="alerts-title-row">
              <div className="alerts-title">
                <span className="alerts-icon">
                  <AlertTriangle size={19} />
                </span>
                <h3>Spending alerts</h3>
              </div>
              {alerts.length > 0 && (
                <span className="alert-count">
                  {alerts.length} {alerts.length === 1 ? "ALERT" : "ALERTS"}
                </span>
              )}
            </div>
            <p>Transactions that differ from your usual spending pattern.</p>
          </div>

          {alerts.length > 0 ? (
            <div className="alerts-list">
              {alerts.map((x, index) => (
                <div className="alert-item" key={x.id || index}>
                  <span className="alert-symbol">
                    <AlertTriangle size={17} />
                  </span>
                  <div className="alert-content">
                    <strong>
                      {x.description || "Unusual transaction"} ·{" "}
                      {money(x.amount)}
                    </strong>
                    <p>
                      {x.message ||
                        "This expense differs from your recent transactions."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert-empty">
              <CheckCircle2 size={30} />
              <h4>No unusual spending detected</h4>
              <p>Your recorded transactions look normal.</p>
            </div>
          )}
        </section>
      </div>

      <section className="insight-card monthly-card">
        <div className="insight-card-heading">
          <div>
            <h3>Monthly activity</h3>
            <p>Compare your recorded income and expenses.</p>
          </div>
          <span className="insight-tag">MONTHLY OVERVIEW</span>
        </div>

        {monthly.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={monthly}
                margin={{ top: 15, right: 10, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#edf0f6"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#8792a7" }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  tick={{ fontSize: 11, fill: "#8792a7" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => money(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #edf0f6",
                    boxShadow: "0 5px 20px rgba(30,48,85,.08)",
                  }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#27b98a"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={35}
                />
                <Bar
                  dataKey="expenses"
                  name="Expenses"
                  fill="#4169e1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={35}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="monthly-legend">
              <span>
                <i style={{ background: "#27b98a" }} /> Income
              </span>
              <span>
                <i style={{ background: "#4169e1" }} /> Expenses
              </span>
            </div>
          </>
        ) : (
          <Empty text="Monthly activity will appear when you add transactions." />
        )}
      </section>
    </div>
  );
}

/* =========================================================
   SAVINGS CHALLENGES
   ========================================================= */

function Challenges() {
  const { data: items, reload } = useLoad("/challenges", []);

  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("Save ₹50 every day");
  const [amount, setAmount] = useState(50);
  const [days, setDays] = useState(30);

  // Separate contribution popup state
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("50");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setError("");

    try {
      await api.post("/challenges", {
        title,
        daily_amount: Number(amount),
        duration_days: Number(days),
      });

      setShow(false);
      await reload();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create challenge.");
    } finally {
      setBusy(false);
    }
  }

  function openContribution(challenge) {
    setSelectedChallenge(challenge);
    setContributionAmount("50");
    setError("");
  }

  async function contribute(e) {
    e.preventDefault();

    if (busy || !selectedChallenge) return;

    const value = Number(contributionAmount);

    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter an amount greater than ₹0.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await api.post(`/challenges/${selectedChallenge.id}/contributions`, {
        amount: value,
        note: "Savings contribution",
      });

      setSelectedChallenge(null);
      await reload();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add savings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHead
        title="Savings Challenges"
        subtitle="Turn a little every day into something meaningful."
        action={
          <button
            className="btn primary"
            onClick={() => {
              setError("");
              setShow(true);
            }}
          >
            <Plus size={17} />
            New challenge
          </button>
        }
      />

      <div className="challenge-grid">
        {items.map((c) => (
          <div className="card challenge-card" key={c.id}>
            <div className="challenge-icon">
              <Target size={22} />
            </div>

            <span className="pill">{c.active ? "Active" : "Completed"}</span>

            <h3>{c.title}</h3>

            <p className="muted">
              {money(c.daily_amount)} per day · {c.duration_days} days
            </p>

            <div className="progress">
              <i style={{ width: `${c.progress}%` }} />
            </div>

            <div className="progress-foot">
              <b>{money(c.saved_amount)} saved</b>
              <span>
                {c.progress}% of {money(c.target_amount)}
              </span>
            </div>

            <button
              className="btn secondary full"
              disabled={busy || !c.active}
              onClick={() => openContribution(c)}
            >
              ＋ Add savings
            </button>
          </div>
        ))}

        {!items.length && (
          <div className="card empty">
            <Target size={28} />
            <p>
              No active challenges yet. Create your first small savings goal.
            </p>
          </div>
        )}
      </div>

      {/* Create Challenge Modal */}
      {show && (
        <Modal
          title="Create a savings challenge"
          close={() => !busy && setShow(false)}
        >
          <form className="form-grid" onSubmit={create}>
            <label className="span2">
              Challenge name
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label>
              Daily savings (₹)
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>

            <label>
              Duration (days)
              <input
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
            </label>

            {error && <div className="error span2">{error}</div>}

            <button className="btn primary full span2" disabled={busy}>
              {busy ? "Creating..." : "Create challenge"}
            </button>
          </form>
        </Modal>
      )}

      {/* Add Savings Modal */}
      {selectedChallenge && (
        <Modal
          title="Add savings"
          close={() => !busy && setSelectedChallenge(null)}
        >
          <form className="form-grid" onSubmit={contribute}>
            <div className="span2">
              <p className="muted">
                Challenge: <strong>{selectedChallenge.title}</strong>
              </p>

              <p className="muted">
                Current savings: {money(selectedChallenge.saved_amount)}
              </p>
            </div>

            <label className="span2">
              Contribution amount (₹)
              <input
                type="number"
                min="1"
                step="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                required
                autoFocus
              />
            </label>

            {error && <div className="error span2">{error}</div>}

            <button
              type="submit"
              className="btn primary full span2"
              disabled={busy}
            >
              {busy ? "Adding savings..." : "Confirm contribution"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =========================================================
   BEFORE YOU BUY
   ========================================================= */

function Purchase() {
  const [name, setName] = useState("Wireless Headphones");
  const [price, setPrice] = useState(2000);
  const [cat, setCat] = useState("Electronics");
  const [result, setResult] = useState(null);

  async function simulate(e) {
    e.preventDefault();
    const { data } = await api.post("/simulate", {
      product_name: name,
      price: Number(price),
      category: cat,
    });
    setResult(data);
  }

  return (
    <div className="page">
      <PageHead
        title="Before You Buy"
        subtitle="Make room for what matters, before you buy."
      />

      <div className="purchase-layout">
        <section className="card purchase-form">
          <div className="eyebrow">A QUICK CHECK BEFORE YOU BUY</div>
          <h2>See the impact before you commit.</h2>
          <p className="muted">Nothing is purchased. This is just a preview.</p>

          <form onSubmit={simulate}>
            <label>
              Product name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label>
              Purchase price (₹)
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
            <label>
              Purchase category
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option>Electronics</option>
                <option>Shopping</option>
                <option>Travel</option>
                <option>Entertainment</option>
                <option>Other</option>
              </select>
            </label>
            <button className="btn primary full">
              <Sparkles size={16} /> Simulate purchase
            </button>
          </form>
        </section>

        <section className="card result-card">
          <div className="result-icon">
            <ShoppingBag size={23} />
          </div>
          <h3>
            {result
              ? result.message
              : "A thoughtful decision starts with a little clarity."}
          </h3>
          <p className="muted">
            {result
              ? result.product_name
              : "Enter a product and price to see how it may affect your balance."}
          </p>

          {result && (
            <>
              <div className="result-stats">
                <div>
                  <small>Current balance</small>
                  <b>{money(result.current_balance)}</b>
                </div>
                <div>
                  <small>After purchase</small>
                  <b>{money(result.balance_after_purchase)}</b>
                </div>
                <div>
                  <small>Safe to spend</small>
                  <b>{money(result.safe_to_spend)}</b>
                </div>
              </div>
              <div className={result.affordable ? "notice" : "warning"}>
                {result.affordable
                  ? "✓ Within estimated safe-to-spend amount"
                  : "! This purchase exceeds your estimated safe-to-spend amount."}
              </div>
              <p className="disclaimer">{result.disclaimer}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* =========================================================
   GEMINI AI FINANCE ASSISTANT
   ========================================================= */

function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I’m your NexWealth assistant. Ask me about your recorded income, expenses or savings habits.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text = input) {
    if (!text.trim()) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);

    try {
      const { data } = await api.post("/chat", { message: text });
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I could not reach the assistant right now. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page assistant-page">
      <PageHead
        title="AI Finance Assistant"
        subtitle="A little guidance for every money decision."
      />

      <section className="card chat-card">
        <div className="chat-head">
          <div className="assistant-avatar">
            <Sparkles />
          </div>
          <div>
            <b>NexWealth Assistant</b>
            <small>
              <i className="green-dot">●</i> Here to help you move forward
            </small>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((m, index) => (
            <div className={`bubble ${m.role}`} key={index}>
              {m.text}
            </div>
          ))}
          {busy && <div className="bubble assistant">Thinking…</div>}
        </div>

        <div className="suggestions">
          {[
            "How much did I spend this month?",
            "How can I save more money?",
            "Predict my balance next month.",
          ].map((x) => (
            <button key={x} onClick={() => send(x)}>
              {x}
            </button>
          ))}
        </div>

        <form
          className="chat-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your money…"
          />
          <button className="btn primary" disabled={busy}>
            <Send size={17} />
          </button>
        </form>

        <p className="disclaimer">
          AI can make mistakes. Check important details. This assistant is
          informational, not financial advice.
        </p>
      </section>
    </div>
  );
}

/* =========================================================
   SETTINGS
   ========================================================= */


function ContactSupport() {
  const phone = "+918951768360";
  const whatsappMessage = encodeURIComponent(
    "Hello NexWealth, I have a finance-related query. Could you please help me?"
  );

  return (
    <section className="contact-support-card">
      <div className="contact-support-info">
        <div className="contact-support-icon">
          <MessageCircle size={24} />
        </div>

        <div>
          <span className="eyebrow">WE'RE HERE TO HELP</span>
          <h3>Have a financial question?</h3>
          <p>
            Contact us for assistance with your financial queries
            and NexWealth-related questions.
          </p>
          <strong className="contact-phone">
            +91 89517 68360
          </strong>
        </div>
      </div>

      <div className="contact-support-actions">
        <a href={`tel:${phone}`} className="contact-action call">
          <PhoneIcon />
          Call Now
        </a>

        <a
          href={`https://wa.me/918951768360?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="contact-action whatsapp"
        >
          <MessageCircle size={17} />
          WhatsApp
        </a>
      </div>
    </section>
  );
}

function PhoneIcon() {
  return <icon-placeholder />;
}


function SettingsPage({ user, onLogout }) {
  return (
    <div className="page">
      <PageHead
        title="Settings"
        subtitle="Your account, your preferences, your peace of mind."
      />

      <section className="card settings-card">
        <h3>Personal profile</h3>

        <div className="profile-row">
          <div className="avatar big-avatar">
            {(user?.name || "A")[0].toUpperCase()}
          </div>

          <div>
            <b>{user?.name}</b>
            <p className="muted">{user?.email}</p>
          </div>
        </div>

        <div className="divider" />

        <h3>Security & privacy</h3>

        <div className="notice">
          <ShieldCheck size={17} />
          Your transactions are scoped to your account. Use a strong password
          and keep your login private.
        </div>

        <p className="muted small">
          NexWealth prototype does not connect directly to bank accounts. Your
          application data is stored in your MySQL database.
        </p>

        <div className="divider" />

        <div className="settings-account-section">
          <div className="settings-account-info">
            <div className="settings-logout-icon">
              <LogOut size={21} />
            </div>

            <div>
              <h3>Sign out of your account</h3>
              <p>
                Securely end your current session on this device. Your financial
                data will remain safe.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="settings-signout-btn"
            onClick={() => {
              if (window.confirm("Are you sure you want to sign out?")) {
                onLogout();
              }
            }}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
            <span className="settings-signout-arrow">→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   MAIN APP AND ROUTES
   ========================================================= */

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nexwealth_user"));
    } catch {
      return null;
    }
  });

  function logout() {
    localStorage.removeItem("nexwealth_token");
    localStorage.removeItem("nexwealth_user");
    setUser(null);
  }

  return user && localStorage.getItem("nexwealth_token") ? (
    <Shell user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/health" element={<Health />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/purchase" element={<Purchase />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route
          path="/settings"
          element={<SettingsPage user={user} onLogout={logout} />}
        />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  ) : (
    <Auth onAuth={setUser} />
  );
}
