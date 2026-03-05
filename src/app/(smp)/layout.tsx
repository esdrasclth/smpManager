import { Sidebar } from '@/components/smp/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-16 p-8">
        {children}
      </main>
    </div>
  )
}