import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Users,
} from 'lucide-react';
import { KNOWLEDGE_GUIDES } from '../data/knowledgeBase';
import { ADMIN_CATEGORIES, type KnowledgeGuide } from '../types';

interface KnowledgeBaseViewProps {
  onUseForComplaint: (guide: KnowledgeGuide) => void;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({
  onUseForComplaint,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedGuideId, setSelectedGuideId] = useState<string>(
    KNOWLEDGE_GUIDES[0].id
  );

  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return KNOWLEDGE_GUIDES.filter((guide) => {
      const matchesCat =
        selectedCategory === 'Semua' || guide.category === selectedCategory;
      const matchesQuery =
        !q ||
        guide.title.toLowerCase().includes(q) ||
        guide.symptom.toLowerCase().includes(q) ||
        guide.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const activeGuide =
    filteredGuides.find((g) => g.id === selectedGuideId) ??
    filteredGuides[0] ??
    null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Bank Solusi Administrasi Guru
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Temukan panduan resmi penyelesaian kendala administrasi yang paling sering dihadapi sebelum atau saat mengajukan aduan.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode Info GTK, NUPTK, e-Kinerja..."
                className="w-full sm:w-72 pl-9 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter kategori panduan"
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600"
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

      {filteredGuides.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-slate-900 mb-1">
            Panduan tidak ditemukan
          </p>
          <p className="text-sm text-slate-500 mb-4">
            Tidak ada panduan yang cocok dengan kata kunci pencarian Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
            }}
            className="px-4 py-2 text-sm font-medium text-teal-700 border border-teal-700 rounded-lg hover:bg-teal-50 transition-colors cursor-pointer"
          >
            Tampilkan Semua Panduan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
            {filteredGuides.map((guide, index) => {
              const isSelected = activeGuide?.id === guide.id;
              return (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedGuideId(guide.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/70'
                      : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                    <span className="font-mono tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{guide.category}</span>
                  </div>
                  <h3
                    className={`text-sm font-semibold leading-snug ${
                      isSelected ? 'text-teal-900' : 'text-slate-900'
                    }`}
                  >
                    {guide.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                    {guide.symptom}
                  </p>
                </button>
              );
            })}
          </div>

          {activeGuide && (
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="pb-5 border-b border-slate-200">
                <div className="text-xs text-slate-500 mb-1.5 flex flex-wrap items-center gap-2">
                  <span>{activeGuide.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>Estimasi: {activeGuide.estimatedTime}</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 leading-snug">
                  {activeGuide.title}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {activeGuide.symptom}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                  Langkah Penyelesaian
                </h4>
                <ol className="space-y-3">
                  {activeGuide.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                      <span className="font-mono tabular-nums text-xs font-semibold text-teal-700 pt-0.5 shrink-0">
                        {String(i + 1).padStart(2, '0')}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-2.5">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Berkas yang Disiapkan</span>
                  </div>
                  <ul className="space-y-2">
                    {activeGuide.documents.map((docItem, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 mt-0.5 shrink-0" />
                        <span>{docItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span>Pihak Terkait</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {activeGuide.relatedParties}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>Perkiraan Waktu</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {activeGuide.estimatedTime}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Kendala Anda belum teratasi dengan panduan mandiri di atas?
                </p>
                <button
                  type="button"
                  onClick={() => onUseForComplaint(activeGuide)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Ajukan Aduan Terkait Ini</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
