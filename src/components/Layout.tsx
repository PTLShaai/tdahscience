import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Tag, LogOut, FlaskConical } from 'lucide-react'
import { clearToken } from '../api/client'

export default function Layout() {
  const navigate = useNavigate()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/domains', icon: Tag, label: 'Domaines' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 230, background: '#1e2440',
        display: 'flex', flexDirection: 'column', padding: '28px 0', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FlaskConical size={22} color="#6b8fe8" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff', letterSpacing: '-0.01em' }}>
              TDAH Science
            </span>
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)', marginTop: 4, paddingLeft: 32 }}>
            Veille scientifique
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, marginBottom: 2,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              background: isActive ? 'rgba(107,143,232,0.2)' : 'transparent',
              textDecoration: 'none', fontSize: 16, fontWeight: isActive ? 500 : 400,
              transition: 'all 0.12s',
            })}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '0 12px' }}>
          <button onClick={() => { clearToken(); navigate('/login') }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.4)', fontSize: 16, cursor: 'pointer',
              transition: 'color 0.12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
            <LogOut size={15} /> Déconnexion
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
