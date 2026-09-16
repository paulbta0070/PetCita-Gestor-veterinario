import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PawPrint,
  Phone,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useAuth,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  getGetDashboardSummaryQueryKey,
  getListAppointmentsQueryKey,
  getListPetsQueryKey,
  getListWhatsappConversationsQueryKey,
  useCreateAppointment,
  useCreatePet,
  useGetDashboardSummary,
  useListAppointments,
  useListPets,
  useListWhatsappConversations,
  useSendWhatsappMessage,
  useUpdateAppointment,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const baseUrl = import.meta.env.VITE_API_URL || 'https://pet-cita-gestor-veterinario--javiermontoyaen.replit.app';
        const endpoint = Array.isArray(queryKey) ? queryKey.join('/') : queryKey;
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        
        const token = await (window as any).Clerk?.session?.getToken();

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
    },
  },
});

       
const today = new Date().toISOString().slice(0, 10);
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/pacientes', label: 'Pacientes', icon: PawPrint },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
];

function cn(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatDate(date?: string | null) {
  if (!date) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
}

function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

function initials(value: string) {
  return value.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function statusLabel(status: string) {
  return { scheduled: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada', active: 'Activa' }[status] ?? status;
}

function sourceLabel(source: string) {
  return source === 'whatsapp' ? 'WhatsApp' : 'Panel';
}

function StatusBadge({ status }: { status: string }) {
  return <span data-testid={`status-badge-${status}`} className={cn('status-badge', `status-${status}`)}>{statusLabel(status)}</span>;
}

function LoadingRows({ count = 4 }: { count?: number }) {
  return <div className="space-y-3" aria-label="Cargando">
    {Array.from({ length: count }).map((_, index) => <div key={index} className="skeleton-row" />)}
  </div>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof PawPrint; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state" data-testid="empty-state">
    <div className="empty-icon"><Icon size={22} /></div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const activeLabel = navItems.find((item) => item.href === location)?.label ?? 'Configuración';
  const displayName = user?.fullName || user?.firstName || 'Administradora';
  const displayInitials = initials(displayName);
  return <div className="app-shell">
    <aside className={cn('sidebar', mobileOpen && 'sidebar-open')}>
      <div className="brand-lockup">
        <div className="brand-mark"><PawPrint size={21} strokeWidth={2.4} /></div>
        <div><strong>pet<span>cita</span></strong><small>clínica veterinaria</small></div>
      </div>
      <div className="clinic-switcher">
        <div className="clinic-avatar">CV</div>
        <div><strong>Clínica Vecina</strong><span>Equipo de atención</span></div>
        <ChevronDown size={15} />
      </div>
      <nav className="main-nav" aria-label="Navegación principal">
        <p className="nav-kicker">Espacio de trabajo</p>
        {navItems.map(({ href, label, icon: Icon }) => <Link
          key={href}
          href={href}
          data-testid={`link-nav-${label.toLowerCase()}`}
          className={cn('nav-item', location === href && 'nav-item-active')}
          onClick={() => setMobileOpen(false)}
        ><Icon size={18} /><span>{label}</span>{label === 'WhatsApp' && <span className="nav-count">3</span>}</Link>)}
        <p className="nav-kicker nav-kicker-later">Administración</p>
        <Link href="/configuracion" data-testid="link-nav-configuracion" className={cn('nav-item', location === '/configuracion' && 'nav-item-active')} onClick={() => setMobileOpen(false)}>
          <Settings size={18} /><span>Configuración</span>
        </Link>
      </nav>
      <div className="sidebar-bottom">
        <div className="connection-card"><span className="live-dot" /><div><strong>WhatsApp conectado</strong><small>Listo para recibir reservas</small></div></div>
        <button className="profile-row profile-logout" type="button" data-testid="button-logout" onClick={() => signOut({ redirectUrl: basePath || "/" })}>
          <div className="avatar avatar-coral">{displayInitials}</div>
          <div><strong>{displayName}</strong><small>{user?.primaryEmailAddress?.emailAddress || 'Equipo de atención'}</small></div>
          <span className="logout-label">Salir</span>
        </button>
      </div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" data-testid="button-close-menu" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}
    <main className="main-content">
      <header className="topbar">
        <button className="mobile-menu" data-testid="button-open-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={21} /></button>
        <div className="topbar-context"><span>Clínica Vecina</span><b>/</b><strong>{activeLabel}</strong></div>
        <div className="topbar-actions"><button className="icon-button" data-testid="button-notifications" aria-label="Notificaciones"><Bell size={18} /><i /></button><div className="topbar-date">{formatLongDate()}</div></div>
      </header>
      <div className="page-body">{children}</div>
    </main>
  </div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</div>;
}

function StatCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof CalendarDays; tone: string }) {
  return <div className="stat-card" data-testid={`stat-card-${label.toLowerCase().replaceAll(' ', '-')}`}><div className={cn('stat-icon', tone)}><Icon size={19} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div>;
}

function Dashboard() {
  const { data: summary, isLoading, isError, refetch } = useGetDashboardSummary();
  const { data: appointments, isLoading: appointmentsLoading } = useListAppointments({ date: today });
  const todayItems = appointments ?? [];
  return <Shell><PageHeading eyebrow={formatLongDate()} title="Buenos días, Laura" description="Aquí tienes el pulso de Clínica Vecina para hoy." action={<Link href="/agenda" data-testid="link-view-agenda" className="button button-primary"><CalendarDays size={17} />Ver agenda</Link>} />
    {isError ? <div className="error-card"><X size={20} /><div><strong>No pudimos cargar el resumen</strong><p>Revisa tu conexión e inténtalo de nuevo.</p></div><button className="button button-quiet" data-testid="button-retry-dashboard" onClick={() => refetch()}>Reintentar</button></div> : <>
      <section className="stats-grid">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => <div className="stat-card stat-skeleton" key={i} />) : <>
          <StatCard label="Citas de hoy" value={summary?.todayAppointments ?? 0} note="en la agenda" icon={CalendarDays} tone="tone-green" />
          <StatCard label="Por confirmar" value={summary?.pendingConfirmation ?? 0} note="requieren respuesta" icon={Clock3} tone="tone-yellow" />
          <StatCard label="Pacientes activos" value={summary?.activePatients ?? 0} note="en seguimiento" icon={HeartPulse} tone="tone-blue" />
          <StatCard label="Reservas WhatsApp" value={summary?.whatsappBookings ?? 0} note="este mes" icon={MessageCircle} tone="tone-coral" />
          <StatCard label="Tasa de cierre" value={`${summary?.completionRate ?? 0}%`} note="últimos 30 días" icon={CheckCircle2} tone="tone-purple" />
        </>}
      </section>
      <div className="dashboard-grid">
        <section className="panel appointments-panel"><div className="panel-heading"><div><p className="eyebrow">Operativa de hoy</p><h2>Próximas citas</h2></div><Link href="/agenda" data-testid="link-all-appointments" className="text-link">Ver agenda <ArrowRight size={15} /></Link></div>
          {appointmentsLoading ? <LoadingRows /> : todayItems.length === 0 ? <EmptyState icon={CalendarDays} title="La agenda está despejada" description="No hay citas programadas para hoy." action={<Link href="/agenda" data-testid="link-empty-create" className="button button-secondary"><Plus size={16} />Crear una cita</Link>} /> : <div className="appointment-list">
            {todayItems.slice(0, 5).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}
          </div>}
        </section>
        <section className="panel next-panel"><div className="panel-heading"><div><p className="eyebrow">Siguiente en agenda</p><h2>Próxima visita</h2></div><Activity size={18} className="heading-icon" /></div>
          {summary?.nextAppointment ? <div className="next-visit"><div className="next-time"><strong>{summary.nextAppointment.appointmentTime}</strong><span>{formatDate(summary.nextAppointment.appointmentDate)}</span></div><div className="next-pet"><div className="avatar avatar-mint">{initials(summary.nextAppointment.petName)}</div><div><strong>{summary.nextAppointment.petName}</strong><span>{summary.nextAppointment.service} · {summary.nextAppointment.ownerName}</span></div></div><div className="next-vet"><Stethoscope size={15} />{summary.nextAppointment.veterinarian}</div><Link href="/agenda" data-testid="link-next-details" className="button button-secondary full-width">Abrir cita <ArrowRight size={15} /></Link></div> : <EmptyState icon={Clock3} title="Nada más por ahora" description="La siguiente visita aparecerá aquí." />}
        </section>
      </div>
      <section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">Ritmo de la clínica</p><h2>Citas esta semana</h2></div><span className="chart-legend"><i /> Citas</span></div><WeeklyChart data={summary?.weeklyAppointments ?? []} /></section>
    </>}
  </Shell>;
}

function WeeklyChart({ data }: { data: Array<{ day: string; count: number }> }) {
  const max = Math.max(...data.map((item) => item.count), 1);
  return <div className="chart-wrap">{data.length ? data.map((item, index) => <div className="chart-column" key={`${item.day}-${index}`}><span>{item.count}</span><div className="chart-bar-track"><div className={cn('chart-bar', index === data.length - 1 && 'chart-bar-current')} style={{ height: `${Math.max(10, (item.count / max) * 100)}%` }} /></div><small>{item.day}</small></div>) : <div className="chart-empty">Aún no hay actividad semanal para mostrar.</div>}</div>;
}

function AppointmentRow({ appointment, onStatusChange }: { appointment: any; onStatusChange?: (id: number, status: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="appointment-row" data-testid={`row-appointment-${appointment.id}`}><div className="appointment-time"><strong>{appointment.appointmentTime}</strong><span>{appointment.source === 'whatsapp' ? 'WhatsApp' : 'Panel'}</span></div><div className="appointment-pet"><div className="avatar avatar-sand">{initials(appointment.petName)}</div><div><strong>{appointment.petName}</strong><span>{appointment.species} · {appointment.ownerName}</span></div></div><div className="appointment-service"><span>{appointment.service}</span><small>{appointment.veterinarian}</small></div><div className="appointment-status"><StatusBadge status={appointment.status} /></div>{onStatusChange && <div className="status-actions"><button className="icon-button subtle" data-testid={`button-status-menu-${appointment.id}`} onClick={() => setOpen(!open)} aria-label="Cambiar estado"><ChevronDown size={16} /></button>{open && <div className="status-menu">{(['confirmed', 'completed', 'cancelled'] as const).map((status) => <button key={status} data-testid={`button-status-${status}-${appointment.id}`} onClick={() => { onStatusChange(appointment.id, status); setOpen(false); }}>{statusLabel(status)}</button>)}</div>}</div>}</div>;
}

function Agenda() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState(today);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();
  const params = useMemo(() => ({ date, ...(search ? { search } : {}), ...(status ? { status: status as any } : {}) }), [date, search, status]);
  const { data: appointments, isLoading, isError, refetch } = useListAppointments(params, { query: { queryKey: getListAppointmentsQueryKey(params) } });
  const updateAppointment = useUpdateAppointment();
  const handleStatus = (id: number, nextStatus: string) => updateAppointment.mutate({ id, data: { status: nextStatus as any } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(params) }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  return <Shell><PageHeading eyebrow="Operativa" title="Agenda" description="Todo lo que ocurre hoy, en un solo lugar." action={<button className="button button-primary" data-testid="button-open-create-appointment" onClick={() => setShowCreate(true)}><Plus size={17} />Nueva cita</button>} />
    <div className="toolbar"><label className="search-field"><Search size={17} /><input data-testid="input-search-appointments" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente, dueño o teléfono" /></label><label className="date-field"><CalendarDays size={16} /><input data-testid="input-date-appointments" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><select data-testid="select-status-appointments" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="scheduled">Pendientes</option><option value="confirmed">Confirmadas</option><option value="completed">Completadas</option><option value="cancelled">Canceladas</option></select><button className="filter-button" data-testid="button-filter-appointments" onClick={() => { setStatus(''); setSearch(''); }}><SlidersHorizontal size={16} />Limpiar filtros</button></div>
    <section className="panel table-panel"><div className="table-heading"><div><p className="eyebrow">{formatDate(date)}</p><h2>{appointments?.length ?? 0} citas programadas</h2></div><span className="table-meta"><span className="live-dot" />Actualizado ahora</span></div>
      {isError ? <div className="error-card inline-error"><X size={18} /><span>No pudimos cargar las citas.</span><button className="text-link" data-testid="button-retry-appointments" onClick={() => refetch()}>Reintentar</button></div> : isLoading ? <LoadingRows count={6} /> : appointments?.length ? <div className="appointment-table"><div className="table-labels"><span>Hora</span><span>Paciente</span><span>Servicio</span><span>Estado</span><span /></div>{appointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} onStatusChange={handleStatus} />)}</div> : <EmptyState icon={CalendarDays} title="No hay citas con estos filtros" description="Prueba a cambiar la fecha o crea una nueva cita." action={<button className="button button-secondary" data-testid="button-empty-create-appointment" onClick={() => setShowCreate(true)}><Plus size={16} />Crear cita</button>} />}
    </section>
    {showCreate && <AppointmentDialog onClose={() => setShowCreate(false)} />}
  </Shell>;
}

function AppointmentDialog({ onClose }: { onClose: () => void }) {
  const [petId, setPetId] = useState('');
  const [service, setService] = useState('Consulta general');
  const [veterinarian, setVeterinarian] = useState('Dra. Ana Torres');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();
  const { data: pets } = useListPets();
  const createAppointment = useCreateAppointment();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!petId) return; createAppointment.mutate({ data: { petId: Number(petId), veterinarian, service, appointmentDate: date, appointmentTime: time, notes: notes || null, source: 'panel' } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); onClose(); } }); };
  return <div className="modal-layer"><div className="modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">Agenda</p><h2>Nueva cita</h2></div><button className="icon-button" data-testid="button-close-create-appointment" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><form onSubmit={submit}><label className="form-field"><span>Paciente</span><select data-testid="select-appointment-pet" required value={petId} onChange={(event) => setPetId(event.target.value)}><option value="">Selecciona un paciente</option>{pets?.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} · {pet.ownerName}</option>)}</select></label><div className="form-grid"><label className="form-field"><span>Fecha</span><input data-testid="input-appointment-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="form-field"><span>Hora</span><input data-testid="input-appointment-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></label></div><div className="form-grid"><label className="form-field"><span>Veterinario</span><select data-testid="select-appointment-vet" value={veterinarian} onChange={(event) => setVeterinarian(event.target.value)}><option>Dra. Ana Torres</option><option>Dr. Pablo Ruiz</option><option>Dra. Marta Soler</option></select></label><label className="form-field"><span>Servicio</span><select data-testid="select-appointment-service" value={service} onChange={(event) => setService(event.target.value)}><option>Consulta general</option><option>Vacunación</option><option>Revisión</option><option>Desparasitación</option></select></label></div><label className="form-field"><span>Notas <em>opcional</em></span><textarea data-testid="textarea-appointment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Algo que el equipo deba saber..." /></label><div className="modal-actions"><button type="button" className="button button-quiet" data-testid="button-cancel-create-appointment" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" data-testid="button-submit-create-appointment" disabled={createAppointment.isPending}>{createAppointment.isPending ? 'Guardando…' : 'Guardar cita'}</button></div></form></div></div>;
}

function Patients() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const params = useMemo(() => search ? { search } : undefined, [search]);
  const { data: pets, isLoading, isError, refetch } = useListPets(params, { query: { queryKey: getListPetsQueryKey(params) } });
  return <Shell><PageHeading eyebrow="Directorio clínico" title="Pacientes" description="La historia de cada paciente, al alcance del equipo." action={<button className="button button-primary" data-testid="button-open-create-patient" onClick={() => setShowCreate(true)}><Plus size={17} />Nuevo paciente</button>} />
    <div className="toolbar patients-toolbar"><label className="search-field search-wide"><Search size={17} /><input data-testid="input-search-patients" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, dueño o teléfono" /></label><span className="toolbar-summary"><UsersRound size={16} />{pets?.length ?? 0} registros</span></div>
    <section className="patients-grid">{isError ? <div className="error-card"><X size={20} /><span>No pudimos cargar los pacientes.</span><button className="button button-quiet" data-testid="button-retry-patients" onClick={() => refetch()}>Reintentar</button></div> : isLoading ? Array.from({ length: 6 }).map((_, i) => <div className="patient-card patient-skeleton" key={i} />) : pets?.length ? pets.map((pet) => <PatientCard key={pet.id} pet={pet} />) : <div className="wide-empty"><EmptyState icon={PawPrint} title="Todavía no hay pacientes" description="Registra el primer paciente de la clínica para empezar." action={<button className="button button-secondary" data-testid="button-empty-create-patient" onClick={() => setShowCreate(true)}><Plus size={16} />Registrar paciente</button>} /></div>}</section>
    {showCreate && <PatientDialog onClose={() => setShowCreate(false)} />}
  </Shell>;
}

function PatientCard({ pet }: { pet: any }) {
  return <article className="patient-card" data-testid={`card-patient-${pet.id}`}><div className="patient-card-top"><div className="avatar avatar-large" style={{ backgroundColor: pet.avatarColor || '#d5ece2' }}>{initials(pet.name)}</div><button className="icon-button subtle" data-testid={`button-patient-menu-${pet.id}`} aria-label={`Más opciones para ${pet.name}`}><MoreHorizontal size={17} /></button></div><h3>{pet.name}</h3><p className="patient-breed">{pet.breed || pet.species} · {pet.age} {pet.age === 1 ? 'año' : 'años'}</p><div className="owner-line"><UserRound size={14} /><span>{pet.ownerName}</span></div><div className="patient-details"><div><span>Última visita</span><strong>{formatDate(pet.lastVisit)}</strong></div><div><span>Próxima cita</span><strong>{formatDate(pet.nextAppointment)}</strong></div></div><a className="patient-phone" data-testid={`link-patient-phone-${pet.id}`} href={`tel:${pet.ownerPhone}`}><Phone size={14} />{pet.ownerPhone}</a></article>;
}

function PatientDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', species: 'Perro', breed: '', age: '1', ownerName: '', ownerPhone: '' });
  const queryClient = useQueryClient();
  const createPet = useCreatePet();
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); createPet.mutate({ data: { ...form, age: Number(form.age) } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPetsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); onClose(); } }); };
  return <div className="modal-layer"><div className="modal" role="dialog" aria-modal="true"><div className="modal-heading"><div><p className="eyebrow">Directorio</p><h2>Nuevo paciente</h2></div><button className="icon-button" data-testid="button-close-create-patient" onClick={onClose} aria-label="Cerrar"><X size={19} /></button></div><form onSubmit={submit}><div className="form-grid"><label className="form-field"><span>Nombre del paciente</span><input data-testid="input-patient-name" required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Luna" /></label><label className="form-field"><span>Especie</span><select data-testid="select-patient-species" value={form.species} onChange={(event) => update('species', event.target.value)}><option>Perro</option><option>Gato</option><option>Otro</option></select></label></div><div className="form-grid"><label className="form-field"><span>Raza</span><input data-testid="input-patient-breed" required value={form.breed} onChange={(event) => update('breed', event.target.value)} placeholder="Mestizo" /></label><label className="form-field"><span>Edad</span><input data-testid="input-patient-age" type="number" min="0" required value={form.age} onChange={(event) => update('age', event.target.value)} /></label></div><label className="form-field"><span>Nombre del dueño</span><input data-testid="input-owner-name" required value={form.ownerName} onChange={(event) => update('ownerName', event.target.value)} placeholder="Nombre y apellidos" /></label><label className="form-field"><span>Teléfono</span><input data-testid="input-owner-phone" required value={form.ownerPhone} onChange={(event) => update('ownerPhone', event.target.value)} placeholder="+34 600 000 000" /></label><div className="modal-actions"><button type="button" className="button button-quiet" data-testid="button-cancel-create-patient" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" data-testid="button-submit-create-patient" disabled={createPet.isPending}>{createPet.isPending ? 'Guardando…' : 'Guardar paciente'}</button></div></form></div></div>;
}

function Whatsapp() {
  const { data: conversations, isLoading, isError, refetch } = useListWhatsappConversations();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();
  const sendMessage = useSendWhatsappMessage();
  const selected = conversations?.find((conversation) => conversation.id === selectedId) ?? conversations?.[0];
  const send = (event: FormEvent) => { event.preventDefault(); if (!selected || !message.trim()) return; sendMessage.mutate({ id: selected.id, data: { text: message.trim() } }, { onSuccess: () => { setMessage(''); queryClient.invalidateQueries({ queryKey: getListWhatsappConversationsQueryKey() }); } }); };
  return <Shell><PageHeading eyebrow="Canal de reservas" title="WhatsApp" description="Conversaciones que pueden convertirse en una cita, sin dejar la bandeja." action={<div className="whatsapp-ready"><span className="live-dot" />Conectado</div>} />
    {isError ? <div className="error-card"><X size={20} /><span>No pudimos cargar las conversaciones.</span><button className="button button-quiet" data-testid="button-retry-whatsapp" onClick={() => refetch()}>Reintentar</button></div> : <section className="inbox-layout"><div className="conversation-list"><div className="inbox-list-heading"><div><span className="eyebrow">Bandeja de entrada</span><h2>{conversations?.length ?? 0} conversaciones</h2></div><button className="icon-button subtle" data-testid="button-inbox-filter" aria-label="Filtrar conversaciones"><SlidersHorizontal size={17} /></button></div>{isLoading ? <LoadingRows count={5} /> : conversations?.length ? conversations.map((conversation) => <button key={conversation.id} data-testid={`button-conversation-${conversation.id}`} className={cn('conversation-item', selected?.id === conversation.id && 'conversation-selected')} onClick={() => setSelectedId(conversation.id)}><div className="avatar avatar-mint">{initials(conversation.clientName)}</div><div className="conversation-copy"><div><strong>{conversation.clientName}</strong><time>{conversation.lastMessageTime}</time></div><span>{conversation.petName} · {conversation.lastMessage}</span></div>{conversation.status === 'waiting' && <i className="unread-dot" />}</button>) : <EmptyState icon={Inbox} title="Bandeja vacía" description="Las nuevas conversaciones aparecerán aquí." />}</div>
      <div className="chat-panel">{selected ? <><div className="chat-header"><div className="avatar avatar-mint">{initials(selected.clientName)}</div><div><h2>{selected.clientName}</h2><span>{selected.petName} · {selected.phone}</span></div><div className="chat-header-actions"><StatusBadge status={selected.status === 'waiting' ? 'scheduled' : selected.status === 'booked' ? 'confirmed' : 'active'} /><button className="icon-button subtle" data-testid="button-chat-more" aria-label="Más opciones"><MoreHorizontal size={18} /></button></div></div><div className="chat-context"><Sparkles size={15} /><span>El asistente ha guiado esta conversación</span><b>{selected.petSpecies}</b></div><div className="messages">{selected.messages.map((item) => <div key={item.id} className={cn('message-row', item.sender !== 'client' && 'message-right')}><div className={cn('message-bubble', `message-${item.sender}`)}>{item.text}<time>{item.time}</time></div></div>)}</div><form className="message-composer" onSubmit={send}><input data-testid="input-whatsapp-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe una respuesta..." /><button className="send-button" data-testid="button-send-whatsapp" type="submit" disabled={sendMessage.isPending || !message.trim()}><ArrowRight size={18} /></button></form></> : <EmptyState icon={MessageCircle} title="Selecciona una conversación" description="Elige una conversación para ver el hilo completo." />}</div>
    </section>}
  </Shell>;
}

function SettingsPage() {
  const [clinicName, setClinicName] = useState('Clínica Vecina');
  const [phone, setPhone] = useState('+34 912 48 16 20');
  const [saved, setSaved] = useState(false);
  const [channelTested, setChannelTested] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<{ configuredForSending: boolean; missingConfiguration: string[] } | null>(null);
  useEffect(() => {
    fetch(`${basePath}/api/whatsapp/status`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((status) => setTwilioStatus(status))
      .catch(() => setTwilioStatus(null));
  }, []);
  const save = (event: FormEvent) => { event.preventDefault(); setSaved(true); window.setTimeout(() => setSaved(false), 2200); };
  const twilioReady = twilioStatus?.configuredForSending ?? false;
  return <Shell><PageHeading eyebrow="Administración" title="Configuración" description="Ajusta la identidad de la clínica y revisa tus canales de atención." /><div className="settings-layout"><form className="panel settings-panel" onSubmit={save}><div className="panel-heading"><div><p className="eyebrow">Perfil de clínica</p><h2>Cómo te ve tu equipo</h2></div><FileText size={18} className="heading-icon" /></div><label className="form-field"><span>Nombre de la clínica</span><input data-testid="input-settings-clinic-name" value={clinicName} onChange={(event) => setClinicName(event.target.value)} /></label><label className="form-field"><span>Teléfono principal</span><input data-testid="input-settings-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="form-field"><span>Zona horaria</span><select data-testid="select-settings-timezone" defaultValue="madrid"><option value="madrid">Madrid · CET (UTC+1)</option><option value="canarias">Canarias · WET (UTC+0)</option></select></label><div className="settings-actions"><button className="button button-primary" data-testid="button-save-settings" type="submit">{saved ? <><Check size={16} />Guardado</> : 'Guardar cambios'}</button></div></form><div className="settings-right"><section className="panel readiness-panel"><div className="panel-heading"><div><p className="eyebrow">Canal conectado</p><h2>WhatsApp Business</h2></div><span className={cn('ready-pill', !twilioReady && 'ready-pill-pending')}>{twilioReady ? <><CheckCircle2 size={14} />Listo</> : <><Clock3 size={14} />Pendiente</>}</span></div><div className="connection-detail"><div className="whatsapp-symbol"><MessageCircle size={22} /></div><div><strong>{twilioReady ? 'Envío de WhatsApp preparado' : 'Conector de Twilio listo'}</strong><span>{channelTested ? 'Prueba enviada · canal operativo' : twilioReady ? 'Remitente configurado en Twilio' : 'Falta configurar el remitente de WhatsApp'}</span></div><button className="button button-quiet" data-testid="button-test-whatsapp" onClick={() => setChannelTested(true)} type="button">{channelTested ? 'Canal verificado' : 'Probar canal'}</button></div><div className="readiness-list"><div><CheckCircle2 size={16} /><span>Webhook de recepción preparado</span><b>Activo</b></div><div><CheckCircle2 size={16} /><span>Asistente de reserva preparado</span><b>Activo</b></div><div className={cn(!twilioReady && 'readiness-pending')}><CheckCircle2 size={16} /><span>Envío desde la bandeja</span><b>{twilioReady ? 'Activo' : 'Pendiente'}</b></div></div>{!twilioReady && <p className="channel-note">Configura TWILIO_ACCOUNT_SID y TWILIO_WHATSAPP_FROM para enviar respuestas desde el panel.</p>}</section><section className="panel tip-panel"><div className="tip-icon"><Stethoscope size={19} /></div><div><p className="eyebrow">Una nota para el equipo</p><h3>La claridad también cuida</h3><p>Cuando el día se llena, una respuesta corta y a tiempo es parte de la atención.</p></div></section></div></div></Shell>;
}

function Landing() {
  return <main className="auth-landing">
    <div className="landing-mark"><PawPrint size={28} /></div>
    <p className="eyebrow">PetCita · Clínica veterinaria</p>
    <h1>La agenda de tu clínica, <span>sin perder el hilo.</span></h1>
    <p className="landing-copy">Gestiona citas, pacientes y reservas de WhatsApp desde un solo lugar. Inicia sesión para entrar al panel de tu clínica.</p>
    <Link href="/sign-in" className="button button-primary landing-cta" data-testid="link-login">Iniciar sesión con Google <ArrowRight size={17} /></Link>
    <div className="landing-points"><span><CheckCircle2 size={16} />Agenda sincronizada</span><span><CheckCircle2 size={16} />Reservas por WhatsApp</span><span><CheckCircle2 size={16} />Datos protegidos</span></div>
  </main>;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#2D8974',
    colorForeground: '#173E43',
    colorMutedForeground: '#6B7D7B',
    colorDanger: '#C85C5C',
    colorBackground: '#FBF8F1',
    colorInput: '#FFFFFF',
    colorInputForeground: '#173E43',
    colorNeutral: '#D7DFD9',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.9rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#FBF8F1] rounded-2xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#173E43]',
    headerSubtitle: 'text-[#6B7D7B]',
    socialButtonsBlockButtonText: 'text-[#173E43]',
    formFieldLabel: 'text-[#173E43]',
    footerActionLink: 'text-[#2D8974]',
    footerActionText: 'text-[#6B7D7B]',
    dividerText: 'text-[#6B7D7B]',
    identityPreviewEditButton: 'text-[#2D8974]',
    formFieldSuccessText: 'text-[#2D8974]',
    alertText: 'text-[#C85C5C]',
    logoBox: 'mb-3',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#D7DFD9] bg-white hover:bg-[#F0F8F4]',
    formButtonPrimary: 'bg-[#2D8974] hover:bg-[#226D5C]',
    formFieldInput: 'border-[#D7DFD9] bg-white text-[#173E43]',
    footerAction: 'border-[#D7DFD9]',
    dividerLine: 'bg-[#D7DFD9]',
    alert: 'border-[#F0D4D4] bg-[#FFF6F6]',
    otpCodeFieldInput: 'border-[#D7DFD9] bg-white',
    formFieldRow: 'text-[#173E43]',
    main: 'text-[#173E43]',
  },
};

function SignInPage() {
  return <div className="auth-page"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="auth-page"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function AuthLoading() {
  return <main className="auth-loading"><div className="landing-mark"><PawPrint size={24} /></div><p>Preparando PetCita…</p></main>;
}

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Landing />;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  if (!isSignedIn) return <Redirect to="/" />;
  return <>{children}</>;
}

function ProtectedDashboard() {
  return <ProtectedPage><Dashboard /></ProtectedPage>;
}

function ProtectedAgenda() {
  return <ProtectedPage><Agenda /></ProtectedPage>;
}

function ProtectedPatients() {
  return <ProtectedPage><Patients /></ProtectedPage>;
}

function ProtectedWhatsapp() {
  return <ProtectedPage><Whatsapp /></ProtectedPage>;
}

function ProtectedSettings() {
  return <ProtectedPage><SettingsPage /></ProtectedPage>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/dashboard" component={ProtectedDashboard} />
    <Route path="/agenda" component={ProtectedAgenda} />
    <Route path="/pacientes" component={ProtectedPatients} />
    <Route path="/whatsapp" component={ProtectedWhatsapp} />
    <Route path="/configuracion" component={ProtectedSettings} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: { start: { title: 'Inicia sesión en PetCita', subtitle: 'Accede al panel de tu clínica' } },
      signUp: { start: { title: 'Crea tu cuenta de PetCita', subtitle: 'Empieza a organizar tu clínica' } },
    }}
    routerPush={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || '/' : to)}
    routerReplace={(to) => setLocation(to.startsWith(basePath) ? to.slice(basePath.length) || '/' : to, { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <TooltipProvider><Router /><Toaster /></TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  if (!clerkPubKey) throw new Error('Falta configurar la clave pública de Clerk.');
  return <WouterRouter base={basePath}><ClerkApp /></WouterRouter>;
}

export default App;
