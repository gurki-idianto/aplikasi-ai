import React, { useState } from 'react';
import { ArrowRight, BookOpenCheck, ClipboardList, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: () => Promise<void>;
  authError: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn, authError }) => {
  const [imgError, setImgError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleLoginClick = async () => {
    setSigningIn(true);
    try {
      await onSignIn();
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="w-full border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            SAPA PTK
          </span>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#alur-layanan" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Alur Layanan
            </a>
            <a href="#cakupan-masalah" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Cakupan Masalah
            </a>
          </nav>
          <button
            type="button"
            onClick={handleLoginClick}
            disabled={signingIn}
            className="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            {signingIn ? 'Memproses...' : 'Masuk Portal'}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <p className="text-xs font-medium text-teal-700 tracking-wide mb-3">
              Sistem Aduan & Pendampingan Administrasi Guru
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.15] text-balance mb-5">
              Catat kendala administrasi sekolah dan dapatkan solusi terstruktur dalam satu portal.
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-2xl mb-8">
              Dirancang khusus untuk guru dan tenaga pendidik dalam melaporkan permasalahan Dapodik, validasi Info GTK, NUPTK, e-Kinerja, hingga kepegawaian, lengkap dengan panduan langkah penyelesaian dan pemantauan tindak lanjut operator.
            </p>

            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {authError}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                type="button"
                onClick={handleLoginClick}
                disabled={signingIn}
                className="inline-flex items-center gap-2.5 px-6 py-3 bg-teal-700 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <span>{signingIn ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500">
                Gunakan akun Google sekolah atau akun belajar.id Anda.
              </span>
            </div>

            <div
              id="alur-layanan"
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-slate-200"
            >
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <ClipboardList className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>01. Catat Aduan</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pilih kategori administrasi dan tuliskan kronologi kendala dengan formulir terpandu.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <BookOpenCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>02. Terima Solusi</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dapatkan langkah penyelesaian berurutan beserta daftar berkas yang perlu disiapkan.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>03. Pantau Status</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Lacak tanggapan resmi operator sekolah dan riwayat penyelesaian tiket aduan Anda.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              <div className="relative flex-1 min-h-[280px] bg-slate-100">
                {!imgError ? (
                  <img
                    src="/src/assets/images/school_admin_desk_1795677161991.jpg"
                    alt="Ruang kerja tata usaha dan administrasi layanan pendidikan guru"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-teal-50">
                    <ClipboardList className="w-10 h-10 text-teal-700 mb-3" />
                    <p className="text-sm font-medium text-slate-700">
                      Portal Administrasi Guru Terpadu
                    </p>
                  </div>
                )}
              </div>
              <div id="cakupan-masalah" className="p-6 border-t border-slate-200 bg-white">
                <h2 className="text-sm font-semibold text-slate-900 mb-2">
                  Layanan Administrasi yang Didukung
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dapodik & Sinkronisasi · Info GTK & TPG · NUPTK & Verval PTK · SK Pembagian Tugas · e-Kinerja BKN & PAK · E-Rapor · Cuti & Kepegawaian
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>SAPA PTK — Layanan Pencatatan Aduan & Solusi Administrasi Guru</span>
          <span>Data tersimpan aman dengan verifikasi akun Google</span>
        </div>
      </footer>
    </div>
  );
};
