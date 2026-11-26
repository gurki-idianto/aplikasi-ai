import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { AlertCircle, ArrowRight, FileCheck2, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { QUICK_TEMPLATES } from '../data/knowledgeBase';
import {
  ADMIN_CATEGORIES,
  FIELD_LIMITS,
  URGENCY_LEVELS,
  type AdminCategory,
  type GeneratedSolution,
  type UrgencyLevel,
  type UserProfile,
} from '../types';

export interface PrefillComplaintData {
  category?: AdminCategory;
  title?: string;
  description?: string;
  urgency?: UrgencyLevel;
}

interface ComplaintFormProps {
  profile: UserProfile;
  prefill?: PrefillComplaintData | null;
  onSuccess: (complaintId: string) => void;
  onCancel: () => void;
}

function generateTicketCode(): string {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ADU-${year}-${suffix}`;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({
  profile,
  prefill,
  onSuccess,
  onCancel,
}) => {
  const [teacherName, setTeacherName] = useState(profile.displayName || '');
  const [schoolName, setSchoolName] = useState(profile.schoolName || '');
  const [nipOrNuptk, setNipOrNuptk] = useState(profile.nipOrNuptk || '');
  const [category, setCategory] = useState<AdminCategory>(
    prefill?.category ?? ADMIN_CATEGORIES[0]
  );
  const [urgency, setUrgency] = useState<UrgencyLevel>(
    prefill?.urgency ?? 'Normal'
  );
  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState(prefill?.description ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allowSaveWithoutAutoSolution, setAllowSaveWithoutAutoSolution] =
    useState(false);

  useEffect(() => {
    if (prefill) {
      if (prefill.category) setCategory(prefill.category);
      if (prefill.title) setTitle(prefill.title);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.urgency) setUrgency(prefill.urgency);
    }
  }, [prefill]);

  const validateFields = (): string | null => {
    const cleanName = teacherName.trim();
    const cleanSchool = schoolName.trim();
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();

    if (cleanName.length < FIELD_LIMITS.displayName.min) {
      return 'Nama lengkap guru minimal 2 karakter.';
    }
    if (cleanSchool.length < FIELD_LIMITS.schoolName.min) {
      return 'Nama sekolah atau unit kerja minimal 2 karakter.';
    }
    if (cleanTitle.length < FIELD_LIMITS.title.min) {
      return 'Judul permasalahan minimal 5 karakter.';
    }
    if (cleanDesc.length < FIELD_LIMITS.description.min) {
      return 'Kronologi kendala minimal 10 karakter agar solusi dapat disusun dengan tepat.';
    }
    return null;
  };

  const saveComplaintToFirestore = async (solution: GeneratedSolution) => {
    const cleanName = teacherName.trim().slice(0, FIELD_LIMITS.displayName.max);
    const cleanSchool = schoolName.trim().slice(0, FIELD_LIMITS.schoolName.max);
    const cleanNip = nipOrNuptk.trim().slice(0, FIELD_LIMITS.nipOrNuptk.max);
    const cleanTitle = title.trim().slice(0, FIELD_LIMITS.title.max);
    const cleanDesc = description.trim().slice(0, FIELD_LIMITS.description.max);
    const cleanEmail = (profile.email || '').trim().slice(0, FIELD_LIMITS.email.max);

    const payload = {
      ticketCode: generateTicketCode(),
      authorId: profile.uid,
      teacherName: cleanName,
      teacherEmail: cleanEmail,
      schoolName: cleanSchool,
      nipOrNuptk: cleanNip,
      category,
      urgency,
      title: cleanTitle,
      description: cleanDesc,
      status: 'Menunggu Tinjauan',
      solutionSummary: solution.solutionSummary.slice(0, FIELD_LIMITS.solutionSummary.max),
      solutionSteps: solution.solutionSteps
        .slice(0, FIELD_LIMITS.solutionSteps.maxItems)
        .map((s) => s.slice(0, FIELD_LIMITS.solutionSteps.maxItemLen)),
      requiredDocuments: solution.requiredDocuments
        .slice(0, FIELD_LIMITS.requiredDocuments.maxItems)
        .map((d) => d.slice(0, FIELD_LIMITS.requiredDocuments.maxItemLen)),
      relatedParties: solution.relatedParties.slice(0, FIELD_LIMITS.relatedParties.max),
      estimatedTime: solution.estimatedTime.slice(0, FIELD_LIMITS.estimatedTime.max),
      officialResponse: '',
      resolvedBy: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'complaints'), payload);
      return docRef.id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'complaints');
    }
  };

  const handleSubmit = async (e: React.FormEvent, skipAutoSolution = false) => {
    e.preventDefault();
    const validationError = validateFields();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setAllowSaveWithoutAutoSolution(false);

    try {
      let solution: GeneratedSolution = {
        solutionSummary: '',
        solutionSteps: [],
        requiredDocuments: [],
        relatedParties: '',
        estimatedTime: '',
      };

      if (!skipAutoSolution) {
        setStatusStep('Menganalisis kendala dan menyusun langkah solusi...');
        const response = await fetch('/api/solutions/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category,
            urgency,
            schoolName: schoolName.trim(),
            title: title.trim(),
            description: description.trim(),
          }),
        });

        const data = (await response.json()) as GeneratedSolution & {
          error?: string;
        };

        if (!response.ok) {
          setErrorMessage(
            data.error ||
              'Gagal menyusun rekomendasi solusi otomatis dari server.'
          );
          setAllowSaveWithoutAutoSolution(true);
          setSubmitting(false);
          setStatusStep('');
          return;
        }

        solution = {
          solutionSummary: data.solutionSummary || '',
          solutionSteps: Array.isArray(data.solutionSteps)
            ? data.solutionSteps
            : [],
          requiredDocuments: Array.isArray(data.requiredDocuments)
            ? data.requiredDocuments
            : [],
          relatedParties: data.relatedParties || '',
          estimatedTime: data.estimatedTime || '',
        };
      }

      setStatusStep('Menyimpan catatan aduan ke basis data...');
      const newId = await saveComplaintToFirestore(solution);
      onSuccess(newId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan jaringan saat mengirim aduan.'
      );
      setAllowSaveWithoutAutoSolution(true);
    } finally {
      setSubmitting(false);
      setStatusStep('');
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="pb-4 border-b border-slate-200 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Formulir Pengaduan Administrasi Guru
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Isi rincian kendala administrasi yang Anda alami. Setelah dikirim, sistem langsung mencatat aduan sekaligus menyusun panduan solusi terstruktur.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2.5">
            Contoh kasus umum (klik untuk mengisi cepat):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                onClick={() => {
                  setCategory(tpl.category);
                  setTitle(tpl.title);
                  setDescription(tpl.description);
                  setUrgency(tpl.urgency);
                  setErrorMessage(null);
                }}
                className="text-left p-3 border border-slate-200 rounded-lg hover:border-teal-600 hover:bg-teal-50/40 transition-colors cursor-pointer"
              >
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {tpl.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {tpl.category}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="teacher-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nama Lengkap Guru <span className="text-red-600">*</span>
            </label>
            <input
              id="teacher-name"
              type="text"
              required
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              maxLength={FIELD_LIMITS.displayName.max}
              placeholder="Contoh: Budi Santoso, S.Pd."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="school-name"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Nama Sekolah / Unit Kerja <span className="text-red-600">*</span>
            </label>
            <input
              id="school-name"
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              maxLength={FIELD_LIMITS.schoolName.max}
              placeholder="Contoh: SMAN 2 Nusantara"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor="nip-nuptk"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              NIP / NUPTK (Opsional)
            </label>
            <input
              id="nip-nuptk"
              type="text"
              value={nipOrNuptk}
              onChange={(e) => setNipOrNuptk(e.target.value)}
              maxLength={FIELD_LIMITS.nipOrNuptk.max}
              placeholder="16 atau 18 digit angka"
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div>
            <label
              htmlFor="admin-category"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Kategori Permasalahan Administrasi{' '}
              <span className="text-red-600">*</span>
            </label>
            <select
              id="admin-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AdminCategory)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
            >
              {ADMIN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Tingkat Urgensi <span className="text-red-600">*</span>
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
              {URGENCY_LEVELS.map((level) => {
                const active = urgency === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setUrgency(level)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="complaint-title"
              className="block text-xs font-medium text-slate-700"
            >
              Judul Ringkas Permasalahan <span className="text-red-600">*</span>
            </label>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {title.length}/{FIELD_LIMITS.title.max}
            </span>
          </div>
          <input
            id="complaint-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={FIELD_LIMITS.title.max}
            placeholder="Contoh: Status Info GTK belum valid karena jam mengajar linier kurang"
            className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="complaint-description"
              className="block text-xs font-medium text-slate-700"
            >
              Kronologi & Detail Kendala <span className="text-red-600">*</span>
            </label>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {description.length}/{FIELD_LIMITS.description.max}
            </span>
          </div>
          <textarea
            id="complaint-description"
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={FIELD_LIMITS.description.max}
            placeholder="Jelaskan kondisi yang dialami, kode peringatan yang muncul (jika ada), serta langkah yang sudah pernah dicoba..."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 leading-relaxed"
          />
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <div className="flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {allowSaveWithoutAutoSolution && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => handleSubmit(e, true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-white border border-red-300 text-red-900 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Tetap Simpan Aduan untuk Ditinjau Operator</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {statusStep ? (
              <span className="inline-flex items-center gap-2 text-teal-800 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{statusStep}</span>
              </span>
            ) : (
              <span>
                Aduan akan diberi nomor tiket otomatis dan langsung disertai panduan solusi.
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses Aduan...</span>
                </>
              ) : (
                <>
                  <span>Kirim Aduan & Buat Solusi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
