import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FIELD_LIMITS, type UserProfile } from '../types';

interface ProfileModalProps {
  profile: UserProfile;
  onSave: (updates: {
    displayName: string;
    schoolName: string;
    nipOrNuptk: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onSave,
  onClose,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [schoolName, setSchoolName] = useState(profile.schoolName);
  const [nipOrNuptk, setNipOrNuptk] = useState(profile.nipOrNuptk);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();
    const cleanSchool = schoolName.trim();
    const cleanNip = nipOrNuptk.trim();

    if (cleanName.length < FIELD_LIMITS.displayName.min) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        displayName: cleanName.slice(0, FIELD_LIMITS.displayName.max),
        schoolName: cleanSchool.slice(0, FIELD_LIMITS.schoolName.max),
        nipOrNuptk: cleanNip.slice(0, FIELD_LIMITS.nipOrNuptk.max),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memperbarui profil.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 mb-5">
          <h2
            id="profile-modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            Profil Guru & Satuan Pendidikan
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nama Lengkap & Gelar
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={FIELD_LIMITS.displayName.max}
              required
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              placeholder="Contoh: Dra. Siti Aminah, M.Pd."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nama Sekolah / Satuan Pendidikan
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              maxLength={FIELD_LIMITS.schoolName.max}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              placeholder="Contoh: SDN 01 Harapan Bangsa"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              NIP / NUPTK (Opsional)
            </label>
            <input
              type="text"
              value={nipOrNuptk}
              onChange={(e) => setNipOrNuptk(e.target.value)}
              maxLength={FIELD_LIMITS.nipOrNuptk.max}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              placeholder="Contoh: 198504122010012015"
            />
          </div>

          <div className="text-xs text-slate-500 pt-1">
            Email terdaftar: <span className="text-slate-700">{profile.email}</span> · Peran:{' '}
            <span className="text-slate-700 font-medium">
              {profile.role === 'admin' ? 'Operator / Admin' : 'Guru'}
            </span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
