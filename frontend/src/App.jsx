import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";

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

function formatDate(value) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [joinedCollaborations, setJoinedCollaborations] = useState([]);
  const [portfolio, setPortfolio] = useState({ headline: "", summary: [], items: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [postsOffset, setPostsOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [activeSection, setActiveSection] = useState("posts");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedScope, setFeedScope] = useState("college");
  const [matchMySkills, setMatchMySkills] = useState(false);
  const [minSkillMatches, setMinSkillMatches] = useState(2);
  const [activePostType, setActivePostType] = useState("All");
  const [activeSkill, setActiveSkill] = useState("All");
  const [error, setError] = useState("");
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setNavHidden(latest > previous && latest > 90);
  });

  const refreshCollaborations = useCallback(async () => {
    try {
      const [posts, joined, portfolioData] = await Promise.all([
        api.listCollaborations({ limit: POSTS_PAGE_SIZE, offset: 0, scope: feedScope, matchMySkills, minSkillMatches }),
        api.myCollaborations(),
        api.myPortfolio(),
      ]);
      setCollaborations(posts);
      setJoinedCollaborations(joined);
      setPortfolio(portfolioData);
      setPostsOffset(posts.length);
      setHasMorePosts(posts.length === POSTS_PAGE_SIZE);
      setSelectedId((current) => (posts.some((post) => post.id === current) ? current : posts[0]?.id ?? null));
    } catch (err) {
      setError(err.message);
    }
  }, [feedScope, matchMySkills, minSkillMatches]);

  useEffect(() => {
    if (!user) return;
    refreshCollaborations();
  }, [user, refreshCollaborations]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 4200);
    return () => clearTimeout(timer);
  }, [error]);

  async function loadMorePosts() {
    try {
      const nextPosts = await api.listCollaborations({
        limit: POSTS_PAGE_SIZE,
        offset: postsOffset,
        scope: feedScope,
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

  if (loading) return <main className="loading"><span className="skeleton-line" /></main>;
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
    const matchesSearch = haystack.includes(searchQuery.toLowerCase().trim());
    const matchesType = activePostType === "All" || post.post_type === activePostType;
    const matchesSkill = activeSkill === "All" || post.required_skills.includes(activeSkill);
    return matchesSearch && matchesType && matchesSkill;
  });
  const postTypeFilters = ["All", ...new Set(collaborations.map((item) => item.post_type))];
  const skillFilters = ["All", ...new Set(collaborations.flatMap((item) => item.required_skills))].slice(0, 10);
  const selectedPost = collaborations.find((item) => item.id === selectedId);
  const selectedApplication = joinedCollaborations.find((item) => item.collaboration.id === selectedPost?.id);
  const completedCount = portfolio.items.length;

  return (
    <main className="app-shell">
      <motion.header
        className={`topbar ${navHidden ? "nav-hidden" : ""}`}
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: navHidden ? -110 : 0, opacity: navHidden ? 0 : 1 }}
        transition={{ duration: 0.24 }}
      >
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
            <motion.div className="account-menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
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
            </motion.div>
          )}
        </div>
      </motion.header>

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

      <AnimatePresence>
        {error && (
          <motion.p
            className="toast error"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
          >
            {error}
            <span />
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
      {activeSection === "posts" && (
        <motion.section
          className="section-grid open-posts-grid"
          key="posts"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <div className="glass-panel post-index stack">
            <div className="section-head">
              <div>
                <p className="eyebrow">Live Board</p>
                <h2>Open Posts</h2>
              </div>
              <button className="primary floating-create fab" type="button" onClick={() => setCreateOpen(true)} aria-label="New post">
                +
              </button>
            </div>
            <div className="segmented scope-toggle">
              <button
                className={feedScope === "college" ? "active" : ""}
                type="button"
                onClick={() => setFeedScope("college")}
              >
                My College
              </button>
              <button
                className={feedScope === "global" ? "active" : ""}
                type="button"
                onClick={() => setFeedScope("global")}
              >
                Global
              </button>
            </div>
            <div className="search-shell">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, creator, skill, type, or date"
              />
              {searchQuery && (
                <button className="clear-search" type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  x
                </button>
              )}
            </div>
            <div className="chip-scroller">
              {postTypeFilters.map((type) => (
                <button
                  className={`filter-chip ${activePostType === type ? "active" : ""}`}
                  key={type}
                  type="button"
                  onClick={() => setActivePostType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="chip-scroller">
              {skillFilters.map((skill) => (
                <button
                  className={`filter-chip skill ${activeSkill === skill ? "active" : ""}`}
                  key={skill}
                  type="button"
                  onClick={() => setActiveSkill(skill)}
                >
                  {skill}
                </button>
              ))}
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
        </motion.section>
      )}

      {activeSection === "profile" && (
        <motion.section
          className="profile-page"
          key="profile"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <motion.div className="profile-visual glass-panel" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="profile-ring">
              <span>{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <h2>{user.name}</h2>
            {user.campus_rep && <span className="campus-rep-badge">Campus Rep</span>}
            <p>{user.email}</p>
            {user.college && <p className="muted">{user.college}</p>}
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
                <strong>{completedCount}</strong>
                <span>Completed</span>
              </div>
            </div>
            <p className="achievement-line">{portfolio.headline}</p>
          </motion.div>
          <div className="profile-main stack">
            <section className="panel stack portfolio-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Portfolio</p>
                  <h2>Achievement Timeline</h2>
                </div>
                <span>{completedCount} archived</span>
              </div>
              <p className="portfolio-headline">{portfolio.headline}</p>
              <div className="portfolio-summary">
                {portfolio.summary.map((item) => (
                  <span key={item.post_type}>
                    <strong>{item.count}</strong> {item.post_type}
                  </span>
                ))}
              </div>
              <div className="timeline">
                {portfolio.items.map((item, index) => (
                  <motion.article
                    className="timeline-item"
                    key={`${item.role}-${item.collaboration.id}`}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -32 : 32 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ delay: 0.04 * index }}
                  >
                    <div className="timeline-dot" />
                    <div>
                      <span className="history-status">{item.role}</span>
                      <h3>{item.collaboration.title}</h3>
                      <small>
                        {item.collaboration.post_type} completed {formatDate(item.completed_at)}
                      </small>
                      <p>{item.collaboration.description}</p>
                      <div className="tags tiny">
                        {(item.offered_skills.length ? item.offered_skills : item.collaboration.required_skills).map((skill) => (
                          <span key={skill}>{skill}</span>
                        ))}
                      </div>
                    </div>
                  </motion.article>
                ))}
                {portfolio.items.length === 0 && <p className="muted">Archived collaborations will appear here after event dates pass.</p>}
              </div>
            </section>
            <ProfileForm />
          </div>
        </motion.section>
      )}

      {activeSection === "collaborations" && (
        <motion.section
          className="glass-panel stack collaborations-page"
          key="collaborations"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">Your History</p>
              <h2>Past Collaborations</h2>
            </div>
            <span>{joinedCollaborations.length} applications</span>
          </div>
          <div className="history-grid">
            {joinedCollaborations.map((item, index) => (
              <motion.article
                className={`history-card ${item.status} ${item.collaboration.is_archived ? "archived-card" : ""}`}
                key={item.application_id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <span className="history-status">{item.status}</span>
                {item.collaboration.is_archived && <span className="history-status archived-status">archived</span>}
                <h3>{item.collaboration.title}</h3>
                <p>{item.collaboration.description}</p>
                <small>Owner: {item.collaboration.owner.name}</small>
                <div className="tags tiny">
                  {item.offered_skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </motion.article>
            ))}
            {joinedCollaborations.length === 0 && <p className="muted">You have not applied to any collaborations yet.</p>}
          </div>
        </motion.section>
      )}

      {activeSection === "settings" && (
        <motion.section key="settings" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <SettingsPage />
        </motion.section>
      )}
      </AnimatePresence>

      {createOpen && (
        <div className="modal-backdrop" onClick={() => setCreateOpen(false)}>
          <motion.div
            className="modal-sheet"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
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
          </motion.div>
        </div>
      )}
    </main>
  );
}
