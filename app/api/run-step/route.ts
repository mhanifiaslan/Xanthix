/**
 * API Route: Tek Proje Adımını AI ile Çalıştırma
 *
 * Admin tarafından tanımlanan bir proje adımının system/user prompt şablonlarını
 * kullanıcı girdileri ve önceki adım bağlamıyla doldurarak Gemini API'ye gönderir.
 *
 * @module api/run-step
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const MODEL_NAME = "gemini-2.0-flash";

/**
 * Prompt şablonundaki {{değişken}} ifadelerini gerçek değerlerle doldurur.
 */
function fillTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `[${key}]`);
}

/**
 * Proje adımını AI ile çalıştırır.
 *
 * @param req - body: { systemPromptTemplate, userPromptTemplate, userInputs, previousContext? }
 * @returns JSON { content: string }
 */
export async function POST(req: NextRequest) {
  // 1. API Key kontrolü
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    return NextResponse.json(
      { error: "Gemini API anahtarı yapılandırılmamış." },
      { status: 500 }
    );
  }

  // 2. Input doğrulama
  const body = await req.json().catch(() => null);
  if (!body || !body.systemPromptTemplate || !body.userPromptTemplate) {
    return NextResponse.json(
      { error: "systemPromptTemplate ve userPromptTemplate zorunludur." },
      { status: 400 }
    );
  }

  const {
    systemPromptTemplate,
    userPromptTemplate,
    userInputs = {},
    previousContext = "",
  } = body as {
    systemPromptTemplate: string;
    userPromptTemplate: string;
    userInputs: Record<string, string>;
    previousContext?: string;
  };

  // 3. Değişkenleri şablona doldur
  const allVariables: Record<string, string> = {
    ...userInputs,
    previous_context: previousContext,
  };

  const filledSystemPrompt = fillTemplate(systemPromptTemplate, allVariables);
  const filledUserPrompt = fillTemplate(userPromptTemplate, allVariables);

  try {
    // 4. Gemini API çağrısı
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: filledSystemPrompt,
    });

    const result = await model.generateContent(filledUserPrompt);
    const content = result.response.text().trim();

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    console.error("[run-step] Hata:", message);
    return NextResponse.json(
      { error: `AI adım çalıştırma başarısız: ${message}` },
      { status: 500 }
    );
  }
}
