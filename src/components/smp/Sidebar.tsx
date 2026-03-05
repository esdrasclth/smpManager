'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/lib/utils'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  TruckIcon, PackageIcon, BarChart2Icon, FileTextIcon,
  BoxIcon, SettingsIcon, LogOutIcon
} from 'lucide-react'
import type { Role } from '@/lib/types'

const NAV_ITEMS = [
  {
    href: '/entregas',
    label: 'Entregas',
    icon: TruckIcon,
    roles: ['admin', 'supervisor', 'asistente', 'operador'] as Role[],
  },
  { href: '/reportes', icon: FileTextIcon, label: 'Reportes', roles: ['admin', 'supervisor'] as Role[] },
  {
    href: '/inventario',
    label: 'Inventario',
    icon: PackageIcon,
    roles: ['admin', 'supervisor', 'asistente'] as Role[],
  },
  {
    href: '/cajas',
    label: 'Cajas',
    icon: BoxIcon,
    roles: ['admin', 'supervisor', 'asistente'] as Role[],
  },
  {
    href: '/configuracion',
    label: 'Configuración',
    icon: SettingsIcon,
    roles: ['admin'] as Role[],
  },
]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  asistente: 'Asistente',
  operador: 'Operador',
}

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-orange-100 text-orange-700',
  supervisor: 'bg-blue-100 text-blue-700',
  asistente: 'bg-green-100 text-green-700',
  operador: 'bg-slate-100 text-slate-600',
}

function getInitials(nombre: string) {
  return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useProfile()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(item =>
    profile ? item.roles.includes(profile.role) : false
  )

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-4 bg-white border-r border-slate-200 z-40">

        {/* Logo */}
        <Link href="/entregas" className="mb-6">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs tracking-widest">SMP</span>
          </div>
        </Link>

        <Separator className="w-8 mb-4" />

        {/* Nav items */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Tooltip key={href}>
                <TooltipTrigger asChild>
                  <Link
                    href={href}
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-all',
                      active
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                    )}
                  >
                    <Icon size={18} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* User avatar */}
        {profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="w-9 h-9 cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all">
                  <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-bold">
                    {getInitials(profile.nombre)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-52 ml-2">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold text-slate-800 truncate">{profile.nombre}</p>
                <span className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded mt-1 inline-block',
                  ROLE_COLORS[profile.role]
                )}>
                  {ROLE_LABELS[profile.role]}
                </span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOutIcon size={14} className="mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </aside>
    </TooltipProvider>
  )
}