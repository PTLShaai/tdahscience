import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Tag, LogOut, FlaskConical } from 'lucide-react'

export default function Layout() {
  const navigate = useNavigate()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/domains', icon: Tag, label: 'Domaines' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--bg-2)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={22} color="var(--accent)" />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
            }}>
              TDAH Science
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 32 }}>
            Veille scientifique
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius)',
                marginBottom: 2,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'var(--bg-3)' : 'transparent',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.12s',
              })}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '0 10px' }}>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10, fontSize: 13 }}
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
