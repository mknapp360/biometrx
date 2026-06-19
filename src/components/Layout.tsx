import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0b1210] pb-20">
      <header className="sticky top-0 z-30 bg-[#0b1210]/90 backdrop-blur-md border-b border-[#1e3029]">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-center">
          <img src="/BioMetrxLogo.png" alt="BioMetRx" className="h-[40px]" />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
