import { useEffect, useState } from "react";

import { api } from "./api/client.js";
import AuthPanel from "./components/AuthPanel.jsx";
import CollaborationDetail from "./components/CollaborationDetail.jsx";
import CollaborationForm from "./components/CollaborationForm.jsx";
import CollaborationList from "./components/CollaborationList.jsx";
import ProfileForm from "./components/ProfileForm.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import { useAuth } from "./state/AuthContext.jsx";

const navItems = [
  { id: "posts", label: "Open Posts", kicker: "Explore" },
  { id: "profile", label: "Student Profile", kicker: "Identity" },
  { id: "collaborations", label: "Collaborations", kicker: "History" },
  { id: "settings", label: "Settings", kicker: "Control" },
];
const POSTS_PAGE_SIZE = 20;

export default function App() {
  const { user, loading, logout } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [joinedCollaborations, setJoinedCollaborations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [activeSection, setActiveSection] = useState("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchMySkills, setMatchMySkills] = useState(false);
  const [minSkillMatches, setMinSkillMatches] = useState(2);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    refreshCollaborations();
  }, [user, matchMySkills, minSkillMatches]);

  async function refreshCollaborations() {
    try {
      const [posts, joined] = await Promise.all([
        api.listCollaborations({ limit: POSTS_PAGE_SIZE, offset: 0, matchMySkills, minSkillMatches }),
        api.myCollaborations(),
      ]);
      setCollaborations(posts);
      setJoinedCollaborations(joined);
      setPostsOffset(posts.length);
      setHasMorePosts(posts.length === POSTS_PAGE_SIZE);
      setSelectedId((current) => (posts.some((post) => post.id === current) ? current : posts[0]?.id ?? null));
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadMorePosts() {
    try {
      const nextPosts = await api.listCollaborations({
        limit: POSTS_PAGE_SIZE,
        offset: postsOffset,
        matchMySkills,
        minSkillMatches,
      });
      setCollaborations((items) => [...items, ...nextPosts]);
      setPostsOffset((current) => current + nextPosts.length);
      setHasMorePosts(nextPosts.length === POSTS_PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <main className="loading">Loading CollabSphere...</main>;
  if (!user) return <AuthPanel />;

  function addCollaboration(created) {
    setCollaborations((items) => [created, ...items]);
    setSelectedId(created.id);
    setCreateOpen(false);
    setActiveSection("posts");
  }

  function handleDeleted(id) {
    setCollaborations((items) => items.filter((item) => item.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }

  function switchSection(section) {
    setActiveSection(section);
    setMenuOpen(false);
    setAccountOpen(false);
    if (section === "collaborations") {
      refreshCollaborations();
    }
  }

  const filteredCollaborations = collaborations.filter((post) => {
    const dateText = post.event_datetime
      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.event_datetime))
      : "";
    const haystack = `${post.title} ${post.owner.name} ${post.post_type} ${dateText} ${post.required_skills.join(" ")}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase().trim());
  });
  const selectedPost = collaborations.find((item) => item.id === selectedId);
  const selectedApplication = joinedCollaborations.find((item) => item.collaboration.id === selectedPost?.id);
  const acceptedCount = joinedCollaborations.filter((item) => item.status === "accepted").length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-cluster">
          <button className="hamburger" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <div>
            <p className="eyebrow">CollabSphere</p>
            <h1>{navItems.find((item) => item.id === activeSection)?.label}</h1>
          </div>
        </div>
        <div className="account-wrap">
          <button className="account-button" type="button" onClick={() => setAccountOpen((value) => !value)}>
            <span>{user.name.charAt(0).toUpperCase()}</span>
            <strong>{user.name}</strong>
          </button>
          {accountOpen && (
            <div className="account-menu">
              <p>{user.email}</p>
              <button type="button" onClick={() => switchSection("profile")}>
                View Profile
              </button>
              <button type="button" onClick={() => switchSection("settings")}>
                Settings
              </button>
              <button className="danger" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className={`side-menu ${menuOpen ? "open" : ""}`}>
        <div className="menu-card">
          <div className="menu-spark">
            <span />
            <p className="eyebrow">Mission Control</p>
          </div>
          {navItems.map((item) => (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => switchSection(item.id)}
            >
              <span>{item.kicker}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </div>
      </aside>

      {error && <p className="error">{error}</p>}

      {activeSection === "posts" && (
        <section className="section-grid open-posts-grid">
          <div className="glass-panel post-index stack">
            <div className="section-head">
              <div>
                <p className="eyebrow">Live Board</p>
                <h2>Open Posts</h2>
              </div>
              <button className="primary floating-create" type="button" onClick={() => setCreateOpen(true)}>
                Create Post
              </button>
            </div>
            <div className="search-shell">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, creator, skill, type, or date"
              />
            </div>
            <div className="filter-row">
              <label className="toggle-row skill-match-toggle">
                <input
                  checked={matchMySkills}
                  onChange={(event) => setMatchMySkills(event.target.checked)}
                  type="checkbox"
                />
                <span>Match my skills</span>
              </label>
              <label className="match-count">
                <span>Minimum matches</span>
                <input
                  disabled={!matchMySkills}
                  max="50"
                  min="1"
                  onChange={(event) => setMinSkillMatches(Number(event.target.value) || 1)}
                  type="number"
                  value={minSkillMatches}
                />
              </label>
            </div>
            <CollaborationList collaborations={filteredCollaborations} selectedId={selectedId} onSelect={setSelectedId} />
            {hasMorePosts && (
              <button className="load-more" type="button" onClick={loadMorePosts}>
                Load More Posts
              </button>
            )}
          </div>
          <CollaborationDetail
            id={selectedPost?.id ?? null}
            appliedStatus={selectedApplication?.status}
            onChanged={setCollaborations}
            onDeleted={handleDeleted}
            onApplicationChanged={refreshCollaborations}
          />
        </section>
      )}

      {activeSection === "profile" && (
        <section className="profile-page">
          <div className="profile-visual glass-panel">
            <div className="profile-ring">
              <span>{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <div className="profile-stats">
              <div>
                <strong>{user.skills.length}</strong>
                <span>Skills</span>
              </div>
              <div>
                <strong>{collaborations.filter((item) => item.owner.id === user.id).length}</strong>
                <span>Posts</span>
              </div>
              <div>
                <strong>{acceptedCount}</strong>
                <span>Teams</span>
              </div>
            </div>
          </div>
          <ProfileForm />
        </section>
      )}

      {activeSection === "collaborations" && (
        <section className="glass-panel stack collaborations-page">
          <div className="section-head">
            <div>
              <p className="eyebrow">Your History</p>
              <h2>Past Collaborations</h2>
            </div>
            <span>{joinedCollaborations.length} applications</span>
          </div>
          <div className="history-grid">
            {joinedCollaborations.map((item) => (
              <article className={`history-card ${item.status}`} key={item.application_id}>
                <span className="history-status">{item.status}</span>
                <h3>{item.collaboration.title}</h3>
                <p>{item.collaboration.description}</p>
                <small>Owner: {item.collaboration.owner.name}</small>
                <div className="tags tiny">
                  {item.offered_skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>
            ))}
            {joinedCollaborations.length === 0 && <p className="muted">You have not applied to any collaborations yet.</p>}
          </div>
        </section>
      )}

      {activeSection === "settings" && <SettingsPage />}

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="section-head">
              <div>
                <p className="eyebrow">Create</p>
                <h2>New collaboration post</h2>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)}>
                Close
              </button>
            </div>
            <CollaborationForm onCreated={addCollaboration} />
          </div>
        </div>
      )}
    </main>
  );
}
