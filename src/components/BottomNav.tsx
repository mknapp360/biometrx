import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, ClipboardList, UserCircle } from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/add', label: 'Add', icon: PlusCircle },
  { to: '/history', label: 'History', icon: ClipboardList },
  { to: '/profile', label: 'Profile', icon: UserCircle },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b1210]/95 backdrop-blur-md border-t border-[#1e3029]">
      <div className="max-w-lg mx-auto flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'text-brand-green'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <Icon className="w-6 h-6" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
