import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  MessageSquarePlus,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  COMPLAINT_STATUSES,
  FIELD_LIMITS,
  type ComplaintNote,
  type ComplaintRecord,
  type ComplaintStatus,
  type GeneratedSolution,
  type UserProfile,
} from '../types';

interface ComplaintDetailViewProps {
  complaint: ComplaintRecord;
  profile: UserProfile;
  onBack: () => void;
  onDeleted: () => void;
}

export function StatusIndicator({ status }: { status: ComplaintStatus }) {
  if (status === 'Terselesaikan') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Terselesaikan</span>
      </span>
    );
  }
  if (status === 'Sedang Diproses') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>Sedang Diproses</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Menunggu Tinjauan</span>
    </span>
  );
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'Baru saja';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const ComplaintDetailView: React.FC<ComplaintDetailViewProps> = ({
  complaint,
  profile,
  onBack,
  onDeleted,
}) => {
  const isAdmin = profile.role === 'admin';
  const isOwner = complaint.authorId === profile.uid;

  const [notes, setNotes] = useState<ComplaintNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const [checkedDocs, setCheckedDocs] = useState<Record<number, boolean>>({});
  const [copiedSolution, setCopiedSolution] = useState(false);

  // Admin response form state
  const [adminStatus, setAdminStatus] = useState<ComplaintStatus>(complaint.status);
  const [adminResponse, setAdminResponse] = useState(complaint.officialResponse);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminSavedNotice, setAdminSavedNotice] = useState(false);

  // Refresh solution state
  const [refreshingSolution, setRefreshingSolution] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolvingSelf, setResolvingSelf] = useState(false);

  useEffect(() => {
    setAdminStatus(complaint.status);
    setAdminResponse(complaint.officialResponse);
  }, [complaint.id, complaint.status, complaint.officialResponse]);

  useEffect(() => {
    const notesPath = `complaints/${complaint.id}/notes`;
    const notesRef = collection(db, 'complaints', complaint.id, 'notes');
    const q = isAdmin
      ? query(notesRef, orderBy('createdAt', 'asc'))
      : query(
          notesRef,
          where('complaintAuthorId', '==', profile.uid),
          orderBy('createdAt', 'asc')
        );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ComplaintNote[] = snapshot.docs.map((d) => {
          const data = d.data();
          const createdRaw = data.createdAt as Timestamp | undefined;
          return {
            id: d.id,
            complaintAuthorId: String(data.complaintAuthorId ?? ''),
            authorId: String(data.authorId ?? ''),
            authorName: String(data.authorName ?? ''),
            authorRole: data.authorRole === 'admin' ? 'admin' : 'guru',
            message: String(data.message ?? ''),
            createdAt: createdRaw?.toDate ? createdRaw.toDate() : null,
          };
        });
        setNotes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, notesPath);
      }
    );

    return () => unsubscribe();
  }, [complaint.id, isAdmin, profile.uid]);

  const handleCopySolution = async () => {
    const lines = [
      `Tiket: ${complaint.ticketCode}`,
      `Permasalahan: ${complaint.title}`,
      `Kategori: ${complaint.category}`,
      '',
      `Ringkasan Solusi:`,
      complaint.solutionSummary || 'Belum tersedia.',
      '',
      'Langkah Penyelesaian:',
      ...complaint.solutionSteps.map((s, i) => `${i + 1}. ${s}`),
      '',
      'Dokumen Pendukung:',
      ...complaint.requiredDocuments.map((d) => `- ${d}`),
      '',
      `Pihak Terkait: ${complaint.relatedParties || '-'}`,
      `Estimasi Waktu: ${complaint.estimatedTime || '-'}`,
    ];
    if (complaint.officialResponse) {
      lines.push('', `Tanggapan Resmi Operator:`, complaint.officialResponse);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSolution(true);
      setTimeout(() => setCopiedSolution(false), 2000);
    } catch {
      setActionError('Tidak dapat menyalin teks ke clipboard browser.');
    }
  };

  const handleRefreshSolution = async () => {
    setRefreshingSolution(true);
    setActionError(null);
    try {
      const response = await fetch('/api/solutions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: complaint.category,
          urgency: complaint.urgency,
          schoolName: complaint.schoolName,
          title: complaint.title,
          description: complaint.description,
        }),
      });
      const data = (await response.json()) as GeneratedSolution & { error?: string };
      if (!response.ok) {
        setActionError(data.error || 'Gagal memperbarui rekomendasi solusi.');
        return;
      }

      const docPath = `complaints/${complaint.id}`;
      try {
        await updateDoc(doc(db, 'complaints', complaint.id), {
          solutionSummary: (data.solutionSummary || '').slice(
            0,
            FIELD_LIMITS.solutionSummary.max
          ),
          solutionSteps: (data.solutionSteps || [])
            .slice(0, FIELD_LIMITS.solutionSteps.maxItems)
            .map((s) => s.slice(0, FIELD_LIMITS.solutionSteps.maxItemLen)),
          requiredDocuments: (data.requiredDocuments || [])
            .slice(0, FIELD_LIMITS.requiredDocuments.maxItems)
            .map((d) => d.slice(0, FIELD_LIMITS.requiredDocuments.maxItemLen)),
          relatedParties: (data.relatedParties || '').slice(
            0,
            FIELD_LIMITS.relatedParties.max
          ),
          estimatedTime: (data.estimatedTime || '').slice(
            0,
            FIELD_LIMITS.estimatedTime.max
          ),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, docPath);
      }
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi layanan penyusun solusi.'
      );
    } finally {
      setRefreshingSolution(false);
    }
  };

  const handleAdminUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSavingAdmin(true);
    setActionError(null);
    setAdminSavedNotice(false);
    const docPath = `complaints/${complaint.id}`;

    try {
      await updateDoc(doc(db, 'complaints', complaint.id), {
        status: adminStatus,
        officialResponse: adminResponse
          .trim()
          .slice(0, FIELD_LIMITS.officialResponse.max),
        resolvedBy:
          adminStatus === 'Terselesaikan'
            ? profile.displayName.slice(0, FIELD_LIMITS.resolvedBy.max)
            : '',
        updatedAt: serverTimestamp(),
      });
      setAdminSavedNotice(true);
      setTimeout(() => setAdminSavedNotice(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleTeacherConfirmResolved = async () => {
    if (!isOwner || complaint.status === 'Terselesaikan') return;
    setResolvingSelf(true);
    setActionError(null);
    const docPath = `complaints/${complaint.id}`;

    try {
      await updateDoc(doc(db, 'complaints', complaint.id), {
        status: 'Terselesaikan',
        resolvedBy: `${profile.displayName} (Konfirmasi Mandiri)`.slice(
          0,
          FIELD_LIMITS.resolvedBy.max
        ),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    } finally {
      setResolvingSelf(false);
    }
  };

  const handleDeleteComplaint = async () => {
    setDeleting(true);
    setActionError(null);
    const docPath = `complaints/${complaint.id}`;
    try {
      await deleteDoc(doc(db, 'complaints', complaint.id));
      onDeleted();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    } finally {
      setDeleting(false);
    }
  };

  const handleSendNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMsg = newNote.trim();
    if (!cleanMsg) return;

    setSendingNote(true);
    setActionError(null);
    const notesPath = `complaints/${complaint.id}/notes`;

    try {
      await addDoc(collection(db, 'complaints', complaint.id, 'notes'), {
        complaintAuthorId: complaint.authorId,
        authorId: profile.uid,
        authorName: profile.displayName.slice(0, FIELD_LIMITS.displayName.max),
        authorRole: isAdmin ? 'admin' : 'guru',
        message: cleanMsg.slice(0, FIELD_LIMITS.noteMessage.max),
        createdAt: serverTimestamp(),
      });
      setNewNote('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, notesPath);
    } finally {
      setSendingNote(false);
    }
  };

  const canRefreshSolution =
    isAdmin || (isOwner && complaint.status === 'Menunggu Tinjauan');
  const canDelete =
    isAdmin || (isOwner && complaint.status === 'Menunggu Tinjauan');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Aduan</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopySolution}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedSolution ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-700" />
                <span>Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Solusi</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>

          {isOwner && complaint.status !== 'Terselesaikan' && (
            <button
              type="button"
              onClick={handleTeacherConfirmResolved}
              disabled={resolvingSelf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {resolvingSelf
                  ? 'Memperbarui...'
                  : 'Tandai Masalah Sudah Teratasi'}
              </span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header & Kronologi Aduan */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {complaint.ticketCode}
              </span>
              <span aria-hidden="true">·</span>
              <span>{complaint.category}</span>
              <span aria-hidden="true">·</span>
              <span>Urgensi: {complaint.urgency}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatDateTime(complaint.createdAt)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {complaint.title}
            </h1>
            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-800">
                {complaint.teacherName}
              </span>
              <span aria-hidden="true">·</span>
              <span>{complaint.schoolName}</span>
              {complaint.nipOrNuptk && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    NIP/NUPTK: {complaint.nipOrNuptk}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
            <StatusIndicator status={complaint.status} />
            {complaint.resolvedBy && (
              <span className="text-xs text-slate-500">
                Oleh: {complaint.resolvedBy}
              </span>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Kronologi Kendala Guru
          </h2>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
            {complaint.description}
          </p>
        </div>

        {canDelete && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end no-print">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Aduan Ini</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-red-700 font-medium">
                  Yakin ingin menghapus catatan aduan ini?
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteComplaint}
                  className="px-3 py-1 bg-red-600 text-white font-medium rounded hover:bg-red-700 cursor-pointer disabled:opacity-60"
                >
                  {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rekomendasi Solusi Terstruktur */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Rekomendasi Solusi & Panduan Penyelesaian
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Langkah sistematis dan berkas yang perlu dipersiapkan untuk menuntaskan kendala ini.
            </p>
          </div>
          {canRefreshSolution && (
            <button
              type="button"
              onClick={handleRefreshSolution}
              disabled={refreshingSolution}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50/50 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 no-print"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshingSolution ? 'animate-spin' : ''}`}
              />
              <span>
                {refreshingSolution
                  ? 'Menyusun Ulang...'
                  : 'Perbarui Solusi'}
              </span>
            </button>
          )}
        </div>

        {!complaint.solutionSummary && complaint.solutionSteps.length === 0 ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-slate-600">
              Belum ada rekomendasi solusi tersimpan pada tiket aduan ini.
            </p>
            {canRefreshSolution && (
              <button
                type="button"
                onClick={handleRefreshSolution}
                disabled={refreshingSolution}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors cursor-pointer"
              >
                {refreshingSolution ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyusun Solusi...</span>
                  </>
                ) : (
                  <span>Susun Rekomendasi Solusi Sekarang</span>
                )}
              </button>
            )}
          </div>
        ) : (
          <>
            {complaint.solutionSummary && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Diagnosis & Arah Penyelesaian
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {complaint.solutionSummary}
                </p>
              </div>
            )}

            {complaint.solutionSteps.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Langkah-Langkah Tindakan
                </h3>
                <ol className="space-y-3">
                  {complaint.solutionSteps.map((step, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed"
                    >
                      <span className="font-mono tabular-nums text-xs font-semibold text-teal-700 pt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Daftar Berkas Persyaratan</span>
                </div>
                {complaint.requiredDocuments.length > 0 ? (
                  <ul className="space-y-2">
                    {complaint.requiredDocuments.map((docName, idx) => (
                      <li key={idx}>
                        <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(checkedDocs[idx])}
                            onChange={() =>
                              setCheckedDocs((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                            className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                          />
                          <span
                            className={
                              checkedDocs[idx]
                                ? 'line-through text-slate-400'
                                : ''
                            }
                          >
                            {docName}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">
                    Tidak ada dokumen khusus yang disyaratkan.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>Pihak / Unit Terkait</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {complaint.relatedParties ||
                      'Operator Sekolah / Tata Usaha'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>Estimasi Waktu Penyelesaian</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {complaint.estimatedTime || 'Menyesuaikan antrean verifikasi'}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tanggapan Resmi Operator / Admin */}
      {(complaint.officialResponse || isAdmin) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <h2 className="text-base font-semibold text-slate-900">
              Tanggapan Resmi Operator / Admin Sekolah
            </h2>
          </div>

          {!isAdmin ? (
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
              {complaint.officialResponse}
            </p>
          ) : (
            <form onSubmit={handleAdminUpdate} className="space-y-4 no-print">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Perbarui Status Aduan
                  </label>
                  <select
                    value={adminStatus}
                    onChange={(e) =>
                      setAdminStatus(e.target.value as ComplaintStatus)
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  >
                    {COMPLAINT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Catatan / Tanggapan Resmi Operator
                  </label>
                  <span className="text-xs text-slate-400 font-mono tabular-nums">
                    {adminResponse.length}/{FIELD_LIMITS.officialResponse.max}
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  maxLength={FIELD_LIMITS.officialResponse.max}
                  placeholder="Tuliskan hasil verifikasi operator, nomor pengajuan, atau arahan tindak lanjut resmi..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-green-700 font-medium">
                  {adminSavedNotice
                    ? 'Tanggapan resmi dan status berhasil diperbarui.'
                    : ''}
                </span>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {savingAdmin ? 'Menyimpan...' : 'Simpan Tanggapan Resmi'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Catatan Tindak Lanjut & Klarifikasi */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 no-print">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <MessageSquarePlus className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">
            Catatan Tindak Lanjut & Klarifikasi
          </h2>
        </div>

        {notes.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            Belum ada catatan tindak lanjut. Tambahkan keterangan tambahan atau perkembangan proses di bawah ini.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {notes.map((note) => (
              <div key={note.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-900">
                    {note.authorName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {note.authorRole === 'admin' ? 'Operator/Admin' : 'Guru'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {note.message}
                </p>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSendNote}
          className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            maxLength={FIELD_LIMITS.noteMessage.max}
            placeholder="Tulis catatan perkembangan atau pertanyaan klarifikasi..."
            className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={sendingNote || !newNote.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingNote ? 'Mengirim...' : 'Kirim Catatan'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
