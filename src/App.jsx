import React, { useState, useEffect, useCallback } from "react";
import { PenSquare, ArrowLeft, X, Clock, Loader2 } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

const FONT_LINK_ID = "dispatch-fonts";

function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap";
  document.head.appendChild(link);
}

const CATEGORIES = [
  { id: "general", label: "General Affairs", code: "GA", accent: "#8B4A3C" },
  { id: "world", label: "World", code: "WD", accent: "#3B5F7D" },
  { id: "sports", label: "Sports", code: "SP", accent: "#4A7856" },
];

const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

// A simple deterrent, NOT real security. Anyone with the passphrase (or
// dev tools) can publish. Set your own value in .env as VITE_COMPOSE_PASSPHRASE.
// For real access control, replace this with Supabase Auth (email/password
// login) — ask Claude to wire that up when you're ready.
const COMPOSE_PASSPHRASE = import.meta.env.VITE_COMPOSE_PASSPHRASE || "";

function formatDateline(iso) {
  const d = new Date(iso + "T00:00:00");
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

function Ticker({ posts }) {
  const items = posts.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {[...items, ...items].map((p, i) => (
          <span className="ticker-item" key={p.id + i}>
            <span className="ticker-dot" style={{ background: catInfo(p.category).accent }} />
            {p.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function Masthead({ siteName, onCompose }) {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    .toUpperCase();
  return (
    <header className="masthead">
      <div className="masthead-row">
        <div className="masthead-meta">MUMBAI · {dateStr}</div>
        <button className="compose-btn" onClick={onCompose}>
          <PenSquare size={15} strokeWidth={2.2} />
          New dispatch
        </button>
      </div>
      <h1 className="masthead-title">{siteName}</h1>
      <div className="masthead-rule" />
    </header>
  );
}

function CategoryFilter({ active, onChange }) {
  return (
    <div className="filter-row">
      <button
        className={"filter-pill" + (active === "all" ? " filter-pill--active" : "")}
        onClick={() => onChange("all")}
        style={active === "all" ? { borderColor: "#1C2541", color: "#1C2541" } : undefined}
      >
        All
      </button>
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          className={"filter-pill" + (active === c.id ? " filter-pill--active" : "")}
          onClick={() => onChange(c.id)}
          style={active === c.id ? { borderColor: c.accent, color: c.accent } : undefined}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function PostCard({ post, index, onOpen }) {
  const c = catInfo(post.category);
  const num = String(index + 1).padStart(3, "0");
  return (
    <button className="post-card" onClick={() => onOpen(post)}>
      <div className="post-card-top">
        <span className="stamp" style={{ borderColor: c.accent, color: c.accent }}>
          {c.code}-{num}
        </span>
        <span className="dateline">{formatDateline(post.date)}</span>
      </div>
      <h2 className="post-card-title">{post.title}</h2>
      <p className="post-card-excerpt">{post.excerpt}</p>
      <div className="post-card-foot">
        <Clock size={12} strokeWidth={2} />
        <span>{post.readMins} min read</span>
      </div>
    </button>
  );
}

function PostDetail({ post, onBack }) {
  const c = catInfo(post.category);
  return (
    <article className="post-detail">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={16} strokeWidth={2.2} />
        Back to dispatches
      </button>
      <div className="post-detail-meta">
        <span className="stamp" style={{ borderColor: c.accent, color: c.accent }}>
          {c.label.toUpperCase()}
        </span>
        <span className="dateline">{formatDateline(post.date)}</span>
        <span className="dateline">
          <Clock size={12} strokeWidth={2} style={{ display: "inline", marginRight: 4, verticalAlign: -2 }} />
          {post.readMins} min read
        </span>
      </div>
      <h1 className="post-detail-title">{post.title}</h1>
      <div className="post-detail-body">
        {post.body.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}

function Composer({ onCancel, onSave }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [passOk, setPassOk] = useState(!COMPOSE_PASSPHRASE);
  const [passInput, setPassInput] = useState("");

  const canSave = title.trim() && body.trim();

  const checkPass = () => {
    if (passInput === COMPOSE_PASSPHRASE) setPassOk(true);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const words = body.trim().split(/\s+/).length;
    const newPost = {
      id: "post-" + Date.now(),
      title: title.trim(),
      category,
      excerpt: excerpt.trim() || body.trim().slice(0, 140) + "…",
      body: body.trim(),
      date: new Date().toISOString().slice(0, 10),
      read_mins: Math.max(1, Math.round(words / 200)),
    };
    await onSave(newPost);
    setSaving(false);
  };

  if (!passOk) {
    return (
      <div className="composer">
        <div className="composer-header">
          <h2 className="composer-title">Enter passphrase</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Cancel">
            <X size={18} />
          </button>
        </div>
        <input
          className="field-input"
          type="password"
          placeholder="Passphrase"
          value={passInput}
          onChange={(e) => setPassInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && checkPass()}
        />
        <div className="composer-actions">
          <button className="btn-primary" onClick={checkPass} type="button">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="composer">
      <div className="composer-header">
        <h2 className="composer-title">New dispatch</h2>
        <button className="icon-btn" onClick={onCancel} aria-label="Cancel">
          <X size={18} />
        </button>
      </div>

      <label className="field-label" htmlFor="c-title">Headline</label>
      <input
        id="c-title"
        className="field-input"
        placeholder="What happened?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <label className="field-label">Beat</label>
      <div className="cat-select-row">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={"cat-select" + (category === c.id ? " cat-select--active" : "")}
            style={category === c.id ? { borderColor: c.accent, color: c.accent } : undefined}
            onClick={() => setCategory(c.id)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="c-excerpt">Standfirst (optional)</label>
      <input
        id="c-excerpt"
        className="field-input"
        placeholder="One line that sets up the piece"
        value={excerpt}
        onChange={(e) => setExcerpt(e.target.value)}
      />

      <label className="field-label" htmlFor="c-body">Dispatch</label>
      <textarea
        id="c-body"
        className="field-textarea"
        placeholder="Write the piece. Separate paragraphs with a blank line."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={12}
      />

      <div className="composer-actions">
        <button className="btn-secondary" onClick={onCancel} type="button">
          Discard
        </button>
        <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving} type="button">
          {saving ? <Loader2 size={15} className="spin" /> : null}
          {saving ? "Publishing…" : "Publish dispatch"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    ensureFonts();
  }, []);

  const [posts, setPosts] = useState(null);
  const [view, setView] = useState("list");
  const [selectedPost, setSelectedPost] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState(null);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError("Couldn't load dispatches: " + error.message);
      setPosts([]);
      return;
    }
    setPosts(
      data.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        excerpt: p.excerpt,
        body: p.body,
        date: p.date,
        readMins: p.read_mins,
      }))
    );
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleSavePost = async (newPost) => {
    const { error } = await supabase.from("posts").insert([newPost]);
    if (error) {
      setError("Couldn't save the dispatch: " + error.message);
      return;
    }
    await loadPosts();
    setView("list");
    setFilter("all");
  };

  const openPost = (post) => {
    setSelectedPost(post);
    setView("post");
  };

  const loading = posts === null;
  const visiblePosts = loading ? [] : filter === "all" ? posts : posts.filter((p) => p.category === filter);

  return (
    <div className="app-root">
      <style>{`
        .app-root { min-height: 100vh; background: #F2EFE9; color: #1C2541; font-family: 'Source Serif 4', Georgia, serif; padding-bottom: 4rem; }
        .ticker-wrap { background: #1C2541; overflow: hidden; white-space: nowrap; padding: 8px 0; }
        .ticker-track { display: inline-flex; animation: ticker-scroll 28s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .ticker-track { animation: none; } }
        @keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .ticker-item { display: inline-flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: 0.02em; color: #F2EFE9; padding: 0 28px; border-right: 1px solid rgba(242,239,233,0.2); }
        .ticker-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .masthead { max-width: 760px; margin: 0 auto; padding: 2.25rem 1.5rem 0; }
        .masthead-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
        .masthead-meta { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.06em; color: #6B6558; }
        .compose-btn { display: inline-flex; align-items: center; gap: 6px; background: #1C2541; color: #F2EFE9; border: none; border-radius: 3px; padding: 7px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.03em; cursor: pointer; }
        .compose-btn:hover { background: #2a3660; }
        .masthead-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: clamp(2.1rem, 6vw, 3.1rem); line-height: 1.02; margin: 0 0 1.2rem; letter-spacing: -0.01em; }
        .masthead-rule { height: 2px; background: #1C2541; }
        .filter-row { max-width: 760px; margin: 0 auto; padding: 1.1rem 1.5rem 0; display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-pill { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: 0.03em; padding: 6px 13px; border-radius: 999px; border: 1px solid #D8D2C4; background: transparent; color: #6B6558; cursor: pointer; }
        .filter-pill--active { font-weight: 600; }
        .posts-list { max-width: 760px; margin: 0 auto; padding: 1.5rem 1.5rem 0; display: flex; flex-direction: column; }
        .post-card { text-align: left; background: transparent; border: none; border-top: 1px solid #D8D2C4; padding: 1.5rem 0; cursor: pointer; font-family: inherit; }
        .posts-list > .post-card:last-child { border-bottom: 1px solid #D8D2C4; }
        .post-card-top { display: flex; align-items: center; gap: 10px; margin-bottom: 0.6rem; }
        .stamp { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.05em; border: 1px solid; border-radius: 3px; padding: 2px 7px; font-weight: 600; }
        .dateline { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.04em; color: #6B6558; }
        .post-card-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.5rem; line-height: 1.18; margin: 0 0 0.5rem; letter-spacing: -0.005em; }
        .post-card-excerpt { font-size: 15.5px; line-height: 1.55; color: #3d3a33; margin: 0 0 0.65rem; max-width: 62ch; }
        .post-card-foot { display: flex; align-items: center; gap: 5px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #8a8474; }
        .empty-state { max-width: 760px; margin: 2.5rem auto 0; padding: 2rem 1.5rem; text-align: center; color: #6B6558; font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
        .post-detail { max-width: 640px; margin: 2.25rem auto 0; padding: 0 1.5rem; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; color: #6B6558; font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.03em; cursor: pointer; padding: 0; margin-bottom: 1.75rem; }
        .back-btn:hover { color: #1C2541; }
        .post-detail-meta { display: flex; align-items: center; gap: 12px; margin-bottom: 1rem; flex-wrap: wrap; }
        .post-detail-title { font-family: 'Fraunces', serif; font-weight: 700; font-size: clamp(1.9rem, 5vw, 2.6rem); line-height: 1.08; margin: 0 0 1.75rem; letter-spacing: -0.01em; }
        .post-detail-body p { font-size: 17px; line-height: 1.75; color: #2a2720; margin: 0 0 1.3rem; }
        .composer { max-width: 640px; margin: 2rem auto 0; padding: 0 1.5rem; }
        .composer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .composer-title { font-family: 'Fraunces', serif; font-weight: 600; font-size: 1.7rem; margin: 0; }
        .icon-btn { background: none; border: none; color: #6B6558; cursor: pointer; padding: 4px; }
        .icon-btn:hover { color: #1C2541; }
        .field-label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; color: #6B6558; margin: 1.1rem 0 0.4rem; }
        .field-input, .field-textarea { width: 100%; box-sizing: border-box; font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; padding: 10px 12px; border: 1px solid #D8D2C4; border-radius: 4px; background: #fff; color: #1C2541; }
        .field-input:focus, .field-textarea:focus { outline: 2px solid #1C2541; outline-offset: 1px; }
        .field-textarea { resize: vertical; line-height: 1.6; }
        .cat-select-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .cat-select { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: 0.02em; padding: 7px 12px; border-radius: 4px; border: 1px solid #D8D2C4; background: #fff; color: #6B6558; cursor: pointer; }
        .cat-select--active { font-weight: 600; }
        .composer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.75rem; }
        .btn-secondary, .btn-primary { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: 0.03em; padding: 9px 16px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-secondary { background: transparent; border: 1px solid #D8D2C4; color: #6B6558; }
        .btn-primary { background: #1C2541; border: 1px solid #1C2541; color: #F2EFE9; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-banner { max-width: 640px; margin: 1rem auto 0; padding: 0.6rem 1rem; background: #f6dede; border: 1px solid #c98c8c; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #7a2e2e; }
        .loading-state { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 4rem 1rem; color: #6B6558; font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
      `}</style>

      {view !== "post" && !loading && <Ticker posts={posts} />}

      {view === "list" && (
        <>
          <Masthead siteName="The Standing Order" onCompose={() => setView("compose")} />
          {error && <div className="error-banner">{error}</div>}
          {loading ? (
            <div className="loading-state">
              <Loader2 size={16} className="spin" /> Loading dispatches…
            </div>
          ) : (
            <>
              <CategoryFilter active={filter} onChange={setFilter} />
              <div className="posts-list">
                {visiblePosts.length === 0 ? (
                  <div className="empty-state">No dispatches in this beat yet.</div>
                ) : (
                  visiblePosts.map((p, i) => <PostCard key={p.id} post={p} index={i} onOpen={openPost} />)
                )}
              </div>
            </>
          )}
        </>
      )}

      {view === "post" && selectedPost && <PostDetail post={selectedPost} onBack={() => setView("list")} />}

      {view === "compose" && <Composer onCancel={() => setView("list")} onSave={handleSavePost} />}
    </div>
  );
}
