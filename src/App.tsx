import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  UserCog,
  X,
} from 'lucide-react';
import {
  ComplaintDetailView,
  StatusIndicator,
} from './components/ComplaintDetailView';
import {
  ComplaintForm,
  type PrefillComplaintData,
} from './components/ComplaintForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  ADMIN_CATEGORIES,
  BOOTSTRAPPED_ADMIN_EMAIL,
  COMPLAINT_STATUSES,
  FIELD_LIMITS,
  type AdminCategory,
  type ComplaintRecord,
  type ComplaintStatus,
  type KnowledgeGuide,
  type NavSection,
  type UrgencyLevel,
  type UserProfile,
} from './types';

function formatShortDate(date: Date | null): string {
  if (!date) return 'Baru saja';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function MainApplication() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(
    null
  );
  const [prefillData, setPrefillData] = useState<PrefillComplaintData | null>(
    null
  );

  // Filters for Complaints List
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | ComplaintStatus>(
    'Semua'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  // Auth listener & profile hydration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setComplaints([]);
        setLoadingComplaints(false);
        setAuthReady(true);
        return;
      }

      const userPath = `users/${user.uid}`;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        const isBootstrappedAdmin =
          user.emailVerified &&
          user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;

        if (snap.exists()) {
          const data = snap.data();
          const role =
            data.role === 'admin' || isBootstrappedAdmin ? 'admin' : 'guru';
          setProfile({
            uid: user.uid,
            displayName: String(
              data.displayName || user.displayName || 'Guru Pengguna'
            ),
            email: String(data.email || user.email || ''),
            schoolName: String(data.schoolName || ''),
            nipOrNuptk: String(data.nipOrNuptk || ''),
            role,
          });
        } else {
          const initialName = (user.displayName || 'Guru Pengguna')
            .trim()
            .slice(0, FIELD_LIMITS.displayName.max);
          const safeName =
            initialName.length >= 2 ? initialName : 'Guru Pengguna';
          const initialEmail = (user.email || '')
            .trim()
            .slice(0, FIELD_LIMITS.email.max);
          const assignedRole = isBootstrappedAdmin ? 'admin' : 'guru';

          await setDoc(userRef, {
            uid: user.uid,
            displayName: safeName,
            email: initialEmail,
            schoolName: '',
            nipOrNuptk: '',
            role: assignedRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setProfile({
            uid: user.uid,
            displayName: safeName,
            email: initialEmail,
            schoolName: '',
            nipOrNuptk: '',
            role: assignedRole,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Firestore real-time subscription for complaints (only when auth & profile ready)
  useEffect(() => {
    if (!authReady || !firebaseUser || !profile) return;

    setLoadingComplaints(true);
    const complaintsRef = collection(db, 'complaints');
    const q =
      profile.role === 'admin'
        ? query(complaintsRef)
        : query(complaintsRef, where('authorId', '==', profile.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ComplaintRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdRaw = data.createdAt as Timestamp | undefined;
          const updatedRaw = data.updatedAt as Timestamp | undefined;

          return {
            id: d.id,
            ticketCode: String(data.ticketCode ?? ''),
            authorId: String(data.authorId ?? ''),
            teacherName: String(data.teacherName ?? ''),
            teacherEmail: String(data.teacherEmail ?? ''),
            schoolName: String(data.schoolName ?? ''),
            nipOrNuptk: String(data.nipOrNuptk ?? ''),
            category: String(data.category ?? ADMIN_CATEGORIES[0]) as AdminCategory,
            urgency: String(data.urgency ?? 'Normal') as UrgencyLevel,
            title: String(data.title ?? ''),
            description: String(data.description ?? ''),
            status: String(
              data.status ?? 'Menunggu Tinjauan'
            ) as ComplaintStatus,
            solutionSummary: String(data.solutionSummary ?? ''),
            solutionSteps: Array.isArray(data.solutionSteps)
              ? data.solutionSteps.map(String)
              : [],
            requiredDocuments: Array.isArray(data.requiredDocuments)
              ? data.requiredDocuments.map(String)
              : [],
            relatedParties: String(data.relatedParties ?? ''),
            estimatedTime: String(data.estimatedTime ?? ''),
            officialResponse: String(data.officialResponse ?? ''),
            resolvedBy: String(data.resolvedBy ?? ''),
            createdAt: createdRaw?.toDate ? createdRaw.toDate() : null,
            updatedAt: updatedRaw?.toDate ? updatedRaw.toDate() : null,
          };
        });

        // Sort client-side by createdAt descending to avoid composite index dependency
        list.sort((a, b) => {
          const timeA = a.createdAt ? a.createdAt.getTime() : Date.now();
          const timeB = b.createdAt ? b.createdAt.getTime() : Date.now();
          return timeB - timeA;
        });

        setComplaints(list);
        setLoadingComplaints(false);
      },
      (error) => {
        setLoadingComplaints(false);
        handleFirestoreError(error, OperationType.LIST, 'complaints');
      }
    );

    return () => unsubscribe();
  }, [authReady, firebaseUser, profile]);

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('popup-closed-by-user')) {
        setAuthError('Proses masuk dibatalkan. Silakan pilih akun Google untuk melanjutkan.');
      } else {
        setAuthError(`Gagal masuk dengan akun Google: ${msg}`);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setSelectedComplaintId(null);
    setActiveSection('dashboard');
  };

  const handleSaveProfile = async (updates: {
    displayName: string;
    schoolName: string;
    nipOrNuptk: string;
  }) => {
    if (!profile) return;
    const userPath = `users/${profile.uid}`;
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: updates.displayName,
        schoolName: updates.schoolName,
        nipOrNuptk: updates.nipOrNuptk,
        updatedAt: serverTimestamp(),
      });
      setProfile({
        ...profile,
        displayName: updates.displayName,
        schoolName: updates.schoolName,
        nipOrNuptk: updates.nipOrNuptk,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const stats = useMemo(() => {
    const total = complaints.length;
    const waiting = complaints.filter(
      (c) => c.status === 'Menunggu Tinjauan'
    ).length;
    const inProgress = complaints.filter(
      (c) => c.status === 'Sedang Diproses'
    ).length;
    const resolved = complaints.filter(
      (c) => c.status === 'Terselesaikan'
    ).length;
    return { total, waiting, inProgress, resolved };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((item) => {
      const matchesStatus =
        statusFilter === 'Semua' || item.status === statusFilter;
      const matchesCat =
        categoryFilter === 'Semua' || item.category === categoryFilter;
      const matchesSearch =
        !q ||
        item.ticketCode.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.teacherName.toLowerCase().includes(q) ||
        item.schoolName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesStatus && matchesCat && matchesSearch;
    });
  }, [complaints, searchQuery, statusFilter, categoryFilter]);

  const selectedComplaint = useMemo(
    () => complaints.find((c) => c.id === selectedComplaintId) ?? null,
    [complaints, selectedComplaintId]
  );

  const navigateTo = (section: NavSection) => {
    setActiveSection(section);
    setSelectedComplaintId(null);
    setMobileMenuOpen(false);
    if (section !== 'submit') {
      setPrefillData(null);
    }
  };

  const handleUseGuideForComplaint = (guide: KnowledgeGuide) => {
    setPrefillData({
      category: guide.category,
      title: `Kendala terkait: ${guide.title}`,
      description: `Saya mengalami kendala sesuai panduan "${guide.title}". Gejala yang muncul: ${guide.symptom}\n\nDetail tambahan di sekolah saya: `,
      urgency: 'Normal',
    });
    setSelectedComplaintId(null);
    setActiveSection('submit');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm text-slate-600">Memuat layanan SAPA PTK...</div>
      </div>
    );
  }

  if (!firebaseUser || !profile) {
    return <LoginScreen onSignIn={handleSignIn} authError={authError} />;
  }

  const navItems: {
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'submit', label: 'Buat Aduan', icon: FilePlus2 },
    { id: 'complaints', label: 'Daftar Aduan', icon: ClipboardList },
    { id: 'guides', label: 'Bank Solusi', icon: BookOpen },
  ];

  const sectionLabels: Record<NavSection, string> = {
    dashboard: 'Beranda',
    submit: 'Buat Aduan Baru',
    complaints: 'Daftar Aduan & Solusi',
    guides: 'Bank Solusi Administrasi',
  };

  const breadcrumbCurrent = selectedComplaint
    ? `Tiket ${selectedComplaint.ticketCode}`
    : sectionLabels[activeSection];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-slate-200 no-print">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            SAPA PTK
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeSection === item.id &&
              (!selectedComplaint || item.id === 'complaints');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-teal-700' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 truncate">
              {profile.displayName}
            </div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {profile.role === 'admin' ? 'Operator / Admin' : 'Guru'}
              {profile.schoolName ? ` · ${profile.schoolName}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>Profil</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                SAPA PTK
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id && !selectedComplaint;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {profile.displayName}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {profile.role === 'admin' ? 'Operator / Admin' : 'Guru'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Profil
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-2 text-xs font-medium text-red-700 border border-red-200 rounded-lg cursor-pointer"
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary CTA on right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap hidden sm:inline">
                Layanan Administrasi
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
              <span className="font-semibold text-slate-900 truncate">
                {breadcrumbCurrent}
              </span>
            </div>
          </div>

          <div className="shrink-0">
            {activeSection !== 'submit' && (
              <button
                type="button"
                onClick={() => navigateTo('submit')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Aduan</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {selectedComplaint ? (
            <ComplaintDetailView
              complaint={selectedComplaint}
              profile={profile}
              onBack={() => setSelectedComplaintId(null)}
              onDeleted={() => {
                setSelectedComplaintId(null);
                setActiveSection('complaints');
              }}
            />
          ) : activeSection === 'submit' ? (
            <ComplaintForm
              profile={profile}
              prefill={prefillData}
              onSuccess={(newId) => {
                setPrefillData(null);
                setActiveSection('complaints');
                setSelectedComplaintId(newId);
              }}
              onCancel={() => navigateTo('dashboard')}
            />
          ) : activeSection === 'guides' ? (
            <KnowledgeBaseView
              onUseForComplaint={handleUseGuideForComplaint}
            />
          ) : activeSection === 'complaints' ? (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {profile.role === 'admin'
                        ? 'Seluruh Aduan Administrasi Guru'
                        : 'Riwayat Aduan & Solusi Anda'}
                    </h1>
                    <p className="text-sm text-slate-600 mt-0.5">
                      Klik baris aduan untuk membaca panduan solusi lengkap dan memantau tanggapan operator.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                    {(['Semua', ...COMPLAINT_STATUSES] as const).map((st) => {
                      const active = statusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kode tiket atau judul..."
                        className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      aria-label="Filter kategori aduan"
                      className="px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="Semua">Semua Kategori</option>
                      {ADMIN_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loadingComplaints ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((row) => (
                      <div
                        key={row}
                        className="h-11 bg-slate-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredComplaints.length === 0 ? (
                  <div className="p-12 text-center">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      Belum ada catatan aduan yang cocok
                    </p>
                    <p className="text-sm text-slate-500 mb-5">
                      {complaints.length === 0
                        ? 'Catat permasalahan administrasi pertama Anda untuk segera memperoleh panduan solusi.'
                        : 'Coba ubah filter status atau kata kunci pencarian.'}
                    </p>
                    {complaints.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => navigateTo('submit')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Catat Aduan Pertama</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('Semua');
                          setCategoryFilter('Semua');
                        }}
                        className="px-4 py-2 text-sm font-medium text-teal-700 border border-teal-700 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 whitespace-nowrap">Kode Tiket</th>
                          <th className="py-3 px-4">Permasalahan & Kategori</th>
                          <th className="py-3 px-4 whitespace-nowrap">Pelapor</th>
                          <th className="py-3 px-4 whitespace-nowrap">Status</th>
                          <th className="py-3 px-4 whitespace-nowrap text-right">
                            Tanggal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {filteredComplaints.map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedComplaintId(item.id)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap align-top">
                              {item.ticketCode}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              <div className="font-medium text-slate-900 line-clamp-1">
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.category} · Urgensi: {item.urgency}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap align-top">
                              <div className="font-medium text-slate-900">
                                {item.teacherName}
                              </div>
                              <div className="text-slate-500">
                                {item.schoolName}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap align-top">
                              <StatusIndicator status={item.status} />
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap text-right align-top">
                              {formatShortDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Dashboard (Beranda) */
            <div className="space-y-6">
              {/* Focal Anchor */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs font-medium text-teal-700">
                    Selamat datang, {profile.displayName}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                    Pusat Layanan Aduan & Solusi Administrasi Guru
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Laporkan kendala Dapodik, validasi Info GTK/TPG, Verval PTK, e-Kinerja, atau kepegawaian. Setiap aduan tercatat rapi dengan nomor tiket dan langsung disertai langkah penyelesaian terstruktur.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateTo('submit')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Catat Aduan Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('guides')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Buka Bank Solusi</span>
                  </button>
                </div>
              </div>

              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Total Aduan Tercatat
                  </div>
                  <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
                    {loadingComplaints ? '—' : stats.total}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Menunggu Tinjauan
                  </div>
                  <div className="text-2xl font-bold text-blue-700 font-mono tabular-nums mt-1.5">
                    {loadingComplaints ? '—' : stats.waiting}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Sedang Diproses
                  </div>
                  <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1.5">
                    {loadingComplaints ? '—' : stats.inProgress}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-medium text-slate-500">
                    Terselesaikan
                  </div>
                  <div className="text-2xl font-bold text-green-700 font-mono tabular-nums mt-1.5">
                    {loadingComplaints ? '—' : stats.resolved}
                  </div>
                </div>
              </div>

              {/* Recent Complaints Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    Aduan Terbaru & Status Penyelesaian
                  </h2>
                  {complaints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigateTo('complaints')}
                      className="text-xs font-medium text-teal-700 hover:text-teal-800 whitespace-nowrap cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  )}
                </div>

                {loadingComplaints ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((row) => (
                      <div
                        key={row}
                        className="h-11 bg-slate-100 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : complaints.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      Belum ada aduan administrasi yang tercatat
                    </p>
                    <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
                      Mulai catat kendala administrasi sekolah yang Anda alami untuk mendapatkan rekomendasi solusi langkah demi langkah.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigateTo('submit')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Catat Aduan Pertama</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                          <th className="py-3 px-4 whitespace-nowrap">Kode Tiket</th>
                          <th className="py-3 px-4">Permasalahan</th>
                          <th className="py-3 px-4 whitespace-nowrap">Status</th>
                          <th className="py-3 px-4 whitespace-nowrap text-right">
                            Tanggal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-sm">
                        {complaints.slice(0, 6).map((item) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedComplaintId(item.id)}
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap align-top">
                              {item.ticketCode}
                            </td>
                            <td className="py-3.5 px-4 align-top">
                              <div className="font-medium text-slate-900 line-clamp-1">
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {item.category} · {item.teacherName}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap align-top">
                              <StatusIndicator status={item.status} />
                            </td>
                            <td className="py-3.5 px-4 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap text-right align-top">
                              {formatShortDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {profileModalOpen && (
        <ProfileModal
          profile={profile}
          onSave={handleSaveProfile}
          onClose={() => setProfileModalOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApplication />
    </ErrorBoundary>
  );
}
