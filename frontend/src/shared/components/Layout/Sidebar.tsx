import type { ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Upload,
  Search,
  Calendar,
  Home,
  Users,
  History,
  LogOut,
  User,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../../features/auth';

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/people', label: 'People', icon: Users },
  { path: '/events', label: 'Events', icon: History },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/timeline', label: 'Timeline', icon: Calendar },
];

export function Sidebar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <Link to="/" className="block">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            History Organizer
          </h1>
          <p className="text-xs text-slate-500 mt-1">Knowledge Extraction</p>
        </Link>
      </div>

      {isAuthenticated && (
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {!isAuthenticated && <div className="flex-1" />}

      <div className="border-t border-slate-800">
        {isAuthenticated && user ? (
          <div className="p-4">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-2">
            <Link
              to="/login"
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-center rounded-lg transition-colors text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="w-full py-2 px-4 border border-slate-700 hover:bg-slate-800 text-slate-300 text-center rounded-lg transition-colors text-sm"
            >
              Create account
            </Link>
          </div>
        )}
        <div className="px-4 pb-4">
          <p className="text-xs text-slate-500 text-center">
            Powered by AI Extraction
          </p>
        </div>
      </div>
    </aside>
  );
}
