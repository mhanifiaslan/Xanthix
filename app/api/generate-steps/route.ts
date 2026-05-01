/**
 * API Route: AI ile Proje Adımları Oluşturma
 * 
 * Kullanıcıdan gelen proje kılavuzu metnini Gemini API'ye göndererek
 * yapılandırılmış proje adımları (steps) üretir.
 * 
 * @module api/generate-steps
 * @see SKILLS.md - API güvenlik kuralları
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// Gemini modeli — API key ile doğrulanmış stabil model
const MODEL_NAME = "gemini-2.0-flash";
// Alternatif (2.5-flash yoğun talep sorunları yaşayabilir, ileride denenebilir)
// const MODEL_NAME_FALLBACK = "gemini-2.5-flash";

/**
 * Kullanıcının kılavuz metninden proje adımlarını üretir.
 *
 * @param req - NextRequest, body'de { guideText: string } bekler
 * @returns JSON { steps: Step[] } | { error: string }
 */
export async function POST(req: NextRequest) {
  // 1. API Key kontrolü
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    return NextResponse.json(
      { error: "Gemini API anahtarı yapılandırılmamış. Lütfen .env.local dosyasını kontrol edin." },
      { status: 500 }
    );
  }

  // 2. Input doğrulama
  const body = await req.json().catch(() => null);
  if (!body || typeof body.guideText !== "string" || body.guideText.trim().length < 10) {
    return NextResponse.json(
      { error: "Geçerli bir proje kılavuzu metni girilmelidir (min. 10 karakter)." },
      { status: 400 }
    );
  }

  const guideText = body.guideText.trim().slice(0, 10000); // max 10k karakter

  try {
    // 3. Gemini API çağrısı
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const systemPrompt = `
Sen bir proje yönetim uzmanısın. Sana verilen proje kılavuzunu analiz ederek, 
projeyi tamamlamak için AI ajanların adım adım uygulayacağı bir iş akışı oluşturman gerekiyor.

Her adım için şu alanları doldurmalısın:
- title: Adımın kısa başlığı (Türkçe, max 60 karakter)
- description: Adımda AI'ın ne yapacağı (Türkçe, 1-2 cümle)
- systemPromptTemplate: AI'a verilecek gizli sistem talimatı (Türkçe, uzman rolü tanımla)
- userPromptTemplate: Kullanıcı girdi şablonu, {{değişken_adi}} formatında değişkenler kullan
- model: Görev türüne göre seç: "gemini-2.5-pro" (analiz/araştırma), "claude-sonnet-4.6" (yazı/taslak), "gpt-4" (genel), "claude-opus-4" (karmaşık)
- requiresPreviousContext: Önceki adımların çıktısına ihtiyaç duyuyor mu? (boolean)
- estimatedCredits: Tahmini kredi maliyeti — gemini-2.5-pro=8, claude-sonnet-4.6=10, gpt-4=20, claude-opus-4=25
- requiredUserInputs: Kullanıcıdan alınacak değişkenler dizisi. Her eleman: { id: "degisken_adi", label: "Görünen Ad", type: "textarea"|"text"|"file", required: boolean }
- outputConfig: { type: "text" | "document", format?: "docx" | "pdf" }

KURALLAR:
1. 2 ile 5 arasında adım üret (proje karmaşıklığına göre)
2. İlk adımda mutlaka kullanıcıdan temel proje bilgisini iste
3. Son adım her zaman özet veya dokümantasyon adımı olsun
4. {{previous_context}} değişkenini önceki adım gerektiren adımlarda kullan
5. Türkçe proje isimleri ve açıklamalar kullan
6. SADECE geçerli JSON döndür, markdown veya açıklama ekleme

Yanıt formatı (sadece bu JSON, başka hiçbir şey):
{
  "steps": [
    {
      "title": "...",
      "description": "...",
      "systemPromptTemplate": "...",
      "userPromptTemplate": "...",
      "model": "gemini-2.5-pro",
      "requiresPreviousContext": false,
      "estimatedCredits": 8,
      "requiredUserInputs": [
        { "id": "proje_adi", "label": "Proje Adı", "type": "text", "required": true }
      ],
      "outputConfig": { "type": "text" }
    }
  ]
}
`;

    const result = await model.generateContent([
      systemPrompt,
      `\n\nAşağıdaki proje kılavuzu için uygun AI iş akışı adımlarını üret:\n\n${guideText}`
    ]);

    const rawText = result.response.text().trim();
    
    // 4. JSON parse — Gemini bazen markdown blokları ekleyebilir, temizle
    const jsonText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("Geçersiz AI yanıtı: steps dizisi bulunamadı.");
    }

    return NextResponse.json({ steps: parsed.steps });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[generate-steps] Hata:", message);
    return NextResponse.json(
      { error: `AI adım üretimi başarısız: ${message}` },
      { status: 500 }
    );
  }
}
