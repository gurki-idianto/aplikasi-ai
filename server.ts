import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const sanitizeString = (value: unknown, maxLen: number): string => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
};

const sanitizeStringArray = (
  value: unknown,
  maxItems: number,
  maxItemLen: number
): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maxItems)
    .map((item) => item.trim().slice(0, maxItemLen));
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/solutions/generate", async (req, res) => {
    try {
      const category = sanitizeString(req.body?.category, 120);
      const urgency = sanitizeString(req.body?.urgency, 40);
      const title = sanitizeString(req.body?.title, 180);
      const description = sanitizeString(req.body?.description, 3000);
      const schoolName = sanitizeString(req.body?.schoolName, 160);

      if (!category || title.length < 5 || description.length < 10) {
        res.status(400).json({
          error:
            "Data aduan belum lengkap. Pastikan kategori, judul (minimal 5 karakter), dan kronologi kendala (minimal 10 karakter) telah diisi.",
        });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error:
            "Layanan rekomendasi solusi belum terkonfigurasi dengan kunci API pada server.",
        });
        return;
      }

      const prompt = [
        `Kategori Administrasi: ${category}`,
        `Tingkat Urgensi: ${urgency || "Normal"}`,
        schoolName ? `Satuan Pendidikan: ${schoolName}` : "",
        `Judul Permasalahan: ${title}`,
        `Kronologi / Detail Kendala Guru:\n${description}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "Anda adalah Konsultan Senior Administrasi Pendidikan dan Kepegawaian Guru di Indonesia (menguasai Dapodik, Info GTK, Tunjangan Profesi Guru/TPG, Verval PTK, NUPTK, NRG, SK Pembagian Tugas/JTM, e-Kinerja BKN/PMM, PAK, Kenaikan Pangkat, E-Rapor, dan tata usaha sekolah). " +
            "Tugas Anda adalah menganalisis aduan permasalahan administrasi yang disampaikan oleh guru dan menyusun solusi praktis, akurat, sopan, dan langsung dapat ditindaklanjuti dalam bahasa Indonesia baku yang mudah dipahami. " +
            "Patuhi batasan format berikut secara ketat: " +
            "1) solutionSummary maksimal 900 karakter berisi diagnosis akar masalah dan arah penyelesaian utama. " +
            "2) solutionSteps berisi 3 hingga 6 langkah konkret berurutan (masing-masing maksimal 450 karakter), sebutkan menu aplikasi atau alur birokrasi secara spesifik bila relevan. " +
            "3) requiredDocuments berisi 2 hingga 6 dokumen/berkas yang perlu disiapkan guru (masing-masing maksimal 250 karakter). " +
            "4) relatedParties maksimal 250 karakter menyebutkan pihak/unit yang perlu dihubungi (misal: Operator Dapodik Sekolah, Kepala Sekolah, Dinas Pendidikan Kab/Kota, BKD/BKPSDM). " +
            "5) estimatedTime maksimal 100 karakter berisi perkiraan waktu penyelesaian realistis.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              solutionSummary: {
                type: Type.STRING,
                description:
                  "Ringkasan diagnosis akar masalah dan solusi utama untuk guru (maks 900 karakter).",
              },
              solutionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Daftar 3-6 langkah penyelesaian praktis yang berurutan.",
              },
              requiredDocuments: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Daftar 2-6 berkas atau dokumen pendukung yang perlu disiapkan.",
              },
              relatedParties: {
                type: Type.STRING,
                description:
                  "Pihak atau instansi yang berwenang menangani tindak lanjut.",
              },
              estimatedTime: {
                type: Type.STRING,
                description: "Perkiraan waktu penyelesaian masalah.",
              },
            },
            required: [
              "solutionSummary",
              "solutionSteps",
              "requiredDocuments",
              "relatedParties",
              "estimatedTime",
            ],
          },
        },
      });

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        res.status(502).json({
          error: "Gagal memperoleh rekomendasi solusi dari layanan analisis.",
        });
        return;
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>;

      const result = {
        solutionSummary: sanitizeString(parsed.solutionSummary, 950),
        solutionSteps: sanitizeStringArray(parsed.solutionSteps, 8, 480),
        requiredDocuments: sanitizeStringArray(parsed.requiredDocuments, 8, 280),
        relatedParties: sanitizeString(parsed.relatedParties, 280),
        estimatedTime: sanitizeString(parsed.estimatedTime, 110),
      };

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error generating complaint solution:", message);

      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({
          error:
            "Batas kuota permintaan layanan analisis sementara tercapai. Silakan coba lagi beberapa saat atau gunakan Panduan Solusi Mandiri.",
        });
        return;
      }

      if (
        message.includes("403") ||
        message.includes("PERMISSION_DENIED") ||
        message.includes("API_KEY_INVALID")
      ) {
        res.status(502).json({
          error:
            "Konfigurasi kunci API server tidak valid atau tidak memiliki izin. Periksa panel Settings > Secrets.",
        });
        return;
      }

      res.status(500).json({
        error:
          "Terjadi gangguan saat menyusun rekomendasi solusi. Silakan coba kembali.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SAPA PTK server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
