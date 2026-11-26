import type { AdminCategory, KnowledgeGuide } from '../types';

export interface QuickComplaintTemplate {
  label: string;
  category: AdminCategory;
  title: string;
  description: string;
  urgency: 'Normal' | 'Mendesak' | 'Kritis';
}

export const QUICK_TEMPLATES: QuickComplaintTemplate[] = [
  {
    label: 'Jam Mengajar Info GTK Belum Valid (Kode 02)',
    category: 'Info GTK & Tunjangan Profesi (TPG)',
    title: 'Status Info GTK masih kode 02 (JTM linier belum memenuhi 24 jam)',
    description:
      'Saya mengajar mata pelajaran sesuai sertifikat pendidik sebanyak 24 jam tatap muka di sekolah induk sesuai SK Pembagian Tugas semester ini, namun pada laman Info GTK masih tercatat tidak valid atau kurang jam sehingga SKTP belum terbit.',
    urgency: 'Mendesak',
  },
  {
    label: 'Perbedaan Nama di Dapodik dan Dukcapil (Verval PTK)',
    category: 'NUPTK, NRG & Verval PTK',
    title: 'Perbaikan data nama dan tanggal lahir di Verval PTK ditolak karena tidak padan Dukcapil',
    description:
      'Terdapat perbedaan penulisan gelar atau ejaan nama antara ijazah/Dapodik dengan data KTP/KK Dukcapil, sehingga status residu merah muncul di Verval PTK dan menghambat pengajuan NUPTK maupun pemberkasan TPG.',
    urgency: 'Normal',
  },
  {
    label: 'Sinkronisasi RHK e-Kinerja BKN & PMM',
    category: 'Kenaikan Pangkat, PAK & e-Kinerja',
    title: 'Penilaian e-Kinerja di PMM belum tersinkron ke layanan SIASN BKN',
    description:
      'Predikat kinerja dan RHK sudah disetujui Kepala Sekolah pada aplikasi Pengelolaan Kinerja, namun ketika dicek pada portal e-Kinerja BKN periode berjalan datanya belum muncul dan berpotensi menghambat pengajuan kenaikan pangkat.',
    urgency: 'Mendesak',
  },
  {
    label: 'Kendala Impor Nilai ke Aplikasi E-Rapor',
    category: 'Kurikulum, Rapor & E-Rapor',
    title: 'Data rombongan belajar dan mata pelajaran belum muncul di E-Rapor',
    description:
      'Setelah operator melakukan tarik data dari Dapodik ke server E-Rapor sekolah, daftar siswa di kelas yang saya ampu masih kosong dan deskripsi capaian pembelajaran tidak dapat disimpan.',
    urgency: 'Kritis',
  },
];

export const KNOWLEDGE_GUIDES: KnowledgeGuide[] = [
  {
    id: 'guide-infogtk-kode-02',
    title: 'Mengatasi Status Info GTK Belum Valid (JTM Linier < 24 Jam / Kode 02)',
    category: 'Info GTK & Tunjangan Profesi (TPG)',
    symptom:
      'Laman Info GTK menampilkan peringatan jumlah jam mengajar linier kurang dari 24 jam atau status validasi masih kode 02 meskipun SK Pembagian Tugas sudah mencukupi.',
    steps: [
      'Periksa kesesuaian kode bidang studi sertifikasi pendidik dengan mata pelajaran yang diinput pada menu Rombongan Belajar (Pembelajaran) di aplikasi Dapodik sekolah.',
      'Pastikan nomor SK Pembagian Tugas dan TMT SK telah diinput dengan benar pada Dapodik dan tidak ada jam mengajar yang ganda atau bertabrakan jadwal.',
      'Jika memiliki tugas tambahan (Wakil Kepala Sekolah, Kepala Lab, Kepala Perpustakaan, atau Wali Kelas), pastikan SK tugas tambahan diinput pada tab Tugas Tambahan PTK di Dapodik.',
      'Minta Operator Sekolah melakukan validasi lokal lalu sinkronisasi Dapodik, kemudian tunggu proses penarikan data Info GTK selama 3–7 hari kerja.',
      'Apabila jam memang kurang di sekolah induk, koordinasikan dengan Dinas Pendidikan setempat untuk penugasan di sekolah non-induk atau pemanfaatan jam tugas tambahan ekuivalen sesuai Permendikbudristek terbaru.',
    ],
    documents: [
      'Salinan SK Pembagian Tugas Mengajar Semester Berjalan',
      'Sertifikat Pendidik (lembar kode bidang studi)',
      'SK Tugas Tambahan Kepala Sekolah (jika ada)',
      'Tangkapan layar rincian jam di Info GTK',
    ],
    relatedParties: 'Operator Dapodik Sekolah, Kepala Sekolah, Operator TPG Dinas Pendidikan Kab/Kota',
    estimatedTime: '3–7 hari kerja setelah sinkronisasi Dapodik',
  },
  {
    id: 'guide-verval-ptk-residu',
    title: 'Menyelesaikan Residu Identitas PTK Tidak Padan Dukcapil di Verval PTK',
    category: 'NUPTK, NRG & Verval PTK',
    symptom:
      'Muncul tanda silang merah pada validasi NIK, nama ibu kandung, atau tanggal lahir di laman Verval PTK Kemendikbudristek.',
    steps: [
      'Cocokkan data NIK, nama lengkap tanpa gelar, tempat/tanggal lahir, dan nama ibu kandung di Dapodik dengan dokumen KTP elektronik dan Kartu Keluarga terbaru.',
      'Apabila data di Dukcapil masih salah, lakukan pembaruan data kependudukan terlebih dahulu melalui layanan Disdukcapil Kab/Kota.',
      'Jika KTP dan KK sudah benar, ajukan perbaikan identitas melalui menu Perbaikan Data Identitas pada laman vervalptk.data.kemdikbud.go.id oleh Operator Sekolah.',
      'Lampirkan hasil pindai KTP, Kartu Keluarga, dan Ijazah terakhir yang jelas terbaca agar disetujui oleh Admin Dinas Pendidikan atau Pusdatin.',
    ],
    documents: [
      'Scan KTP Elektronik Asli',
      'Scan Kartu Keluarga (KK) terbaru',
      'Scan Ijazah S1/D4 sebagai rujukan penulisan nama',
    ],
    relatedParties: 'Operator Sekolah (akun SDM Pusdatin), Admin Verval PTK Dinas Pendidikan, Disdukcapil',
    estimatedTime: '3–10 hari kerja (menunggu persetujuan antrean verifikasi)',
  },
  {
    id: 'guide-nuptk-baru',
    title: 'Prosedur Pengajuan NUPTK Baru bagi Guru Tetap Yayasan / ASN',
    category: 'NUPTK, NRG & Verval PTK',
    symptom:
      'Guru sudah terdaftar di Dapodik lebih dari 2 tahun atau berstatus ASN/PPPK namun belum memiliki Nomor Unik Pendidik dan Tenaga Kependidikan (NUPTK).',
    steps: [
      'Pastikan status kepegawaian, ijazah S1/D4, serta penugasan di Dapodik sudah valid dan tidak berstatus residu di Verval PTK.',
      'Siapkan berkas persyaratan lengkap dalam format PDF (maksimal ukuran file sesuai ketentuan Verval PTK, umumnya < 1 MB per dokumen) dengan kualitas pindai jelas.',
      'Minta Operator Sekolah masuk ke laman Verval PTK, pilih menu Pengajuan NUPTK, lalu unggah seluruh dokumen persyaratan sesuai jenjang dan status kepegawaian.',
      'Pantau status persetujuan secara berkala mulai dari tingkat Dinas Pendidikan Kab/Kota hingga verifikasi akhir oleh Pusdatin.',
    ],
    documents: [
      'KTP dan Kartu Keluarga',
      'Ijazah SD, SMP, SMA, hingga S1/D4 (dijadikan 1 berkas PDF sesuai ketentuan)',
      'SK Pengangkatan CPNS/PNS/PPPK atau SK Pengangkatan Guru Tetap Yayasan (minimal 2 tahun berturut-turut bagi non-ASN)',
      'SK Pembagian Tugas Mengajar 2 tahun terakhir (4 semester)',
    ],
    relatedParties: 'Operator Sekolah, Kepala Sekolah, Dinas Pendidikan Kab/Kota, Pusdatin Kemendikdasmen',
    estimatedTime: '14–30 hari kerja tergantung antrean verifikasi Dinas & Pusat',
  },
  {
    id: 'guide-ekinerja-siasn',
    title: 'Sinkronisasi Penilaian e-Kinerja PMM ke Portal e-Kinerja BKN (SIASN)',
    category: 'Kenaikan Pangkat, PAK & e-Kinerja',
    symptom:
      'Penilaian kinerja guru sudah selesai dan disetujui Kepala Sekolah di Pengelolaan Kinerja, tetapi belum masuk ke aplikasi e-Kinerja BKN untuk kebutuhan PAK dan kenaikan pangkat.',
    steps: [
      'Pastikan NIP pada akun belajar.id/Dapodik sama persis dengan NIP pada akun MyASN/e-Kinerja BKN tanpa spasi atau karakter tambahan.',
      'Cek pada dashboard Pengelolaan Kinerja bahwa Kepala Sekolah sudah menekan tombol finalisasi Penilaian Kinerja dan menerbitkan Dokumen Evaluasi Kinerja.',
      'Masuk ke laman kinerja.bkn.go.id menggunakan akun MyASN, lalu klik tombol Sinkronisasi PMM pada periode penilaian yang sesuai.',
      'Apabila gagal sinkron karena perbedaan unit organisasi (Unor) atau atasan langsung, ajukan pembaruan data Unor ke Admin Kepegawaian Dinas Pendidikan atau BKPSDM/BKD setempat.',
    ],
    documents: [
      'Dokumen Evaluasi Kinerja Pegawai (PDF unduhan dari PMM)',
      'SKP Periode Berjalan',
      'SK Penempatan / Mutasi Terakhir (jika terjadi perbedaan Unor di SIASN)',
    ],
    relatedParties: 'Kepala Sekolah, Operator Kepegawaian Dinas Pendidikan, Admin SIASN BKD/BKPSDM',
    estimatedTime: '1–5 hari kerja',
  },
  {
    id: 'guide-dapodik-ptk-baru',
    title: 'Penambahan Guru Baru / Mutasi Masuk ke Dapodik Sekolah Induk',
    category: 'Dapodik & Sinkronisasi Data',
    symptom:
      'Guru pindahan atau guru baru belum muncul di aplikasi Dapodik sekolah sehingga tidak dapat diinput ke jadwal mengajar atau akun E-Rapor.',
    steps: [
      'Pastikan sekolah asal telah mengeluarkan guru tersebut pada aplikasi Dapodik sekolah asal (atau melalui Dinas Pendidikan jika sekolah asal sudah tidak aktif).',
      'Untuk mutasi atau tambah PTK baru, Operator Sekolah mengajukan melalui laman Manajemen Dapodik Sekolah / Dinas Pendidikan (vervalptk atau sp.datadik) dengan melampirkan SK Penugasan/Mutasi.',
      'Setelah disetujui Dinas Pendidikan Kab/Kota, Operator Sekolah melakukan menu Tarik Data atau Sinkronisasi pada aplikasi Dapodik lokal.',
      'Lengkapi riwayat kepegawaian, pendidikan, dan penugasan pembelajaran guru pada tab PTK setelah data masuk ke Dapodik lokal.',
    ],
    documents: [
      'SK Mutasi / Surat Keterangan Pindah Tugas dari Dinas Pendidikan atau Yayasan',
      'Surat Keterangan Lolos Butuh / Melepas dari sekolah asal',
      'SK Pembagian Tugas di sekolah baru',
    ],
    relatedParties: 'Operator Sekolah Asal, Operator Sekolah Tujuan, Admin Dapodik Dinas Pendidikan',
    estimatedTime: '2–7 hari kerja',
  },
  {
    id: 'guide-erapor-kurikulum',
    title: 'Mengatasi Data Rombel & Mapel Tidak Terbaca di E-Rapor Sekolah',
    category: 'Kurikulum, Rapor & E-Rapor',
    symptom:
      'Guru sudah masuk ke akun E-Rapor tetapi kelas yang diampu, daftar peserta didik, atau mata pelajaran tidak muncul.',
    steps: [
      'Konfirmasi kepada Operator Dapodik bahwa pembagian tugas mengajar pada menu Rombongan Belajar -> Pembelajaran di Dapodik sudah tersimpan dan tersinkronisasi.',
      'Minta Admin E-Rapor sekolah menjalankan menu Ambil Data Dapodik secara berurutan mulai dari Referensi, Guru, Rombel, hingga Pembelajaran.',
      'Pastikan versi aplikasi E-Rapor yang digunakan sekolah sudah sesuai dengan versi Dapodik semester aktif saat ini.',
      'Jika mata pelajaran adalah muatan lokal atau projek P5, pastikan kelompok mata pelajaran dan koordinatornya telah dipetakan pada Dapodik serta menu Mapping Mapel di E-Rapor.',
    ],
    documents: [
      'Daftar Pembagian Tugas Mengajar & Jadwal Pelajaran',
      'Daftar Nama Peserta Didik per Rombel',
    ],
    relatedParties: 'Wakil Kepala Sekolah Bidang Kurikulum, Operator Dapodik, Admin E-Rapor Sekolah',
    estimatedTime: '1 hari kerja (dapat langsung ditangani di tingkat sekolah)',
  },
  {
    id: 'guide-cuti-kepegawaian',
    title: 'Pengajuan Cuti Melahirkan / Cuti Alasan Penting bagi Guru ASN & PPPK',
    category: 'Cuti, Izin & Kepegawaian',
    symptom:
      'Guru membutuhkan izin cuti resmi tanpa memengaruhi validitas tunjangan profesi (TPG) dan pencatatan presensi kepegawaian.',
    steps: [
      'Ajukan surat permohonan cuti tertulis kepada Kepala Sekolah minimal 7 hari kerja sebelum tanggal mulai cuti (kecuali kondisi darurat/sakit mendadak atau persalinan).',
      'Lampirkan surat keterangan dokter/bidan (untuk cuti sakit atau melahirkan) atau dokumen pendukung alasan penting sesuai ketentuan PP Nomor 17 Tahun 2020 / aturan cuti PPPK.',
      'Setelah mendapat persetujuan Kepala Sekolah, berkas diteruskan ke Bagian Kepegawaian Dinas Pendidikan / BKPSDM untuk penerbitan Surat Izin Cuti resmi.',
      'Serahkan salinan Surat Izin Cuti kepada Operator Dapodik/TPG sekolah agar status ketidakhadiran tercatat sah dan tidak membatalkan pencairan TPG (sesuai regulasi cuti melahirkan anak 1–3 atau sakit sesuai ketentuan).',
    ],
    documents: [
      'Formulir Permintaan dan Pemberian Cuti ditandatangani Kepala Sekolah',
      'Surat Keterangan Dokter / Rumah Sakit / Bidan (bila cuti sakit atau melahirkan)',
      'Salinan SK Pengangkatan Terakhir',
    ],
    relatedParties: 'Kepala Sekolah, Tata Usaha Sekolah, Bagian Kepegawaian Dinas Pendidikan / BKPSDM',
    estimatedTime: '3–7 hari kerja',
  },
];
