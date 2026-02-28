import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, BarChart3, Bell, Globe, Settings,
} from 'lucide-react'

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Live Monitor' },
    { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/dashboard/alerts', icon: Bell, label: 'Alerts' },
    { to: '/dashboard/sites', icon: Globe, label: 'Sites' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
    return (
        <aside className="glass w-60 flex-shrink-0 flex flex-col border-r border-[#1e2d40] overflow-y-auto">
            <div className="flex flex-col gap-1 p-4 flex-1">
                <p className="text-[10px] text-[#4a5568] tracking-widest uppercase px-3 mb-2">Navigation</p>
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/dashboard'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${isActive
                                ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 text-[#00d4ff] border border-cyan-500/20'
                                : 'text-[#8a9ab5] hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#00d4ff] rounded-r-full" />
                                )}
                                <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-[#00d4ff]' : 'text-[#4a5568] group-hover:text-white'}`} />
                                <span>{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>

            {/* System info footer */}
            <div className="p-4 border-t border-[#1e2d40]">
                <div className="glass-card rounded-lg p-3">
                    <p className="text-[10px] text-[#4a5568] uppercase tracking-widest mb-2">System</p>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#8a9ab5]">AI Engine</span>
                        <span className="text-xs text-emerald-400 font-medium">Active</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#8a9ab5]">Database</span>
                        <span className="text-xs text-[#00d4ff] font-medium">PostgreSQL</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[#8a9ab5]">Version</span>
                        <span className="text-xs text-[#8a9ab5]">v1.0.0</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}
