import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F2F5' }}>
      {/* Desktop Sidebar (Fixed) */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40" style={{ boxShadow: '1px 0 0 #162035' }}>
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 transition-opacity"
            style={{ background: 'rgba(7,17,31,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div
            className="relative flex-1 flex flex-col max-w-xs w-full z-10"
            style={{ background: '#07111F', boxShadow: '4px 0 24px rgba(0,0,0,0.4)' }}
          >
            <Sidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1 min-w-0">
        <div className="sticky top-0 z-30">
          <Topbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        </div>

        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
