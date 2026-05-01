import type { ProjectTypeWriteInput } from '@/types/projectType';

// -----------------------------------------------------------------------------
// Seed templates
//
// These are intentionally generic but realistic: they reflect the typical
// section structure of each call. Once an admin uploads the official guide
// PDF, the AI-from-guide flow can refine prompts, criteria, and budget logic.
//
// Conventions:
//   - Each `agentPromptTemplate` is written in English (the model performs
//     best that way) but always instructs the model to output in
//     {{outputLanguage}} so the proposal text matches the program.
//   - {{userIdea}} is the chat input that started the project.
//   - {{previousSections}} is a JSON-stringified summary of earlier sections.
//   - {{userInputs}} is whatever the wizard collected.
// -----------------------------------------------------------------------------

const SHARED_INSTRUCTION = `
You are an expert grant writer producing a section of a real funding application.
Match the tone and conventions of the program. Be concrete, evidence-driven,
and avoid filler. Output MUST be in {{outputLanguage}} and use Markdown
formatting. When you need a fact you don't have, surface it as a clearly-marked
TODO so the user can fill it in. Never fabricate references or numbers.

STRICT MARKDOWN RULES — these break the renderer when violated:
- Every Markdown table MUST have a separator row of dashes immediately after
  the header. Tables without it render as a single line of text.
- Each row of a table MUST be on its own line. Never put multiple rows on
  one line separated by extra pipes.
- Use exactly one pipe \`|\` between columns; trim trailing pipes only on
  the row terminator.
- A correct table looks like this (note the second row of dashes):

\`\`\`markdown
| Column A | Column B | Column C |
| --- | --- | --- |
| value 1 | value 2 | value 3 |
| value 4 | value 5 | value 6 |
\`\`\`

- Schedules / Gantt / week-by-week plans MUST use this same table shape, one
  row per week (or per task), never inline.
- Use blank lines between paragraphs, headings, and tables — no run-on
  blocks.
`.trim();

export const SEED_PROJECT_TYPES: ProjectTypeWriteInput[] = [
  // ---------------------------------------------------------------------------
  // TÜBİTAK 1507 — KOBİ Ar-Ge Başlangıç Destek Programı
  // ---------------------------------------------------------------------------
  {
    id: 'tubitak-1507',
    slug: 'tubitak-1507',
    name: {
      tr: 'TÜBİTAK 1507 — KOBİ Ar-Ge',
      en: 'TÜBİTAK 1507 — SME R&D Start-up',
      es: 'TÜBİTAK 1507 — I+D para PYMEs',
    },
    description: {
      tr: 'KOBİ\'lerin ilk Ar-Ge projelerini destekleyen TÜBİTAK programı. 600 bin TL\'ye kadar hibe.',
      en: 'TÜBİTAK programme funding the first R&D project of small/medium enterprises in Türkiye. Up to TRY 600k grant.',
      es: 'Programa de TÜBİTAK que financia el primer proyecto de I+D de PYMEs en Turquía. Hasta 600 mil TRY.',
    },
    category: 'tubitak',
    tier: 'standard',
    outputLanguage: 'tr',
    visibility: 'public',
    iconName: 'Microscope',
    active: true,
    version: '1.0.0',
    budgetHint: {
      tr: '~600.000 TL üst sınır',
      en: '~TRY 600k cap',
      es: '~600.000 TRY máximo',
    },
    callDatesHint: {
      tr: 'Sürekli açık çağrı',
      en: 'Always-open call',
      es: 'Convocatoria abierta',
    },
    whoCanApplyHint: {
      tr: 'Türkiye\'de kayıtlı KOBİ statüsündeki firmalar',
      en: 'Türkiye-registered SMEs',
      es: 'PYMEs registradas en Turquía',
    },
    sections: [
      {
        id: 'summary',
        order: 1,
        title: { tr: 'Proje Özeti', en: 'Project Summary', es: 'Resumen del proyecto' },
        description: {
          tr: 'Projenin amacı, hedefi ve beklenen çıktılarının kısa özeti.',
          en: 'A short summary of the project goal, target and expected outputs.',
          es: 'Resumen breve del objetivo, meta y resultados esperados.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the **Project Summary** section for a TÜBİTAK 1507 (SME R&D Start-up) application.

User idea:
{{userIdea}}

Cover, in this order, in 250–400 words:
1. The problem the project solves and why it matters in the Turkish market.
2. The proposed innovative solution and what makes it novel.
3. Headline measurable outcomes (a product, a prototype, a demonstrable capability).
4. The expected commercial impact for the SME within 24 months of completion.
`,
        criteria: [
          'Clearly states the problem and target market',
          'Defines the innovative aspect (technical or business) explicitly',
          'Lists 2–4 concrete deliverables',
          'Quantifies expected commercial impact',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 1500,
      },
      {
        id: 'innovation',
        order: 2,
        title: {
          tr: 'Yenilikçi Yön ve Literatür',
          en: 'Innovation & Prior Art',
          es: 'Innovación y estado del arte',
        },
        description: {
          tr: 'Mevcut çözümlere göre yenilikçi yön ve literatür karşılaştırması.',
          en: 'Comparison with existing solutions and the literature.',
          es: 'Comparación con soluciones existentes y literatura.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the **Innovation & Prior Art** section for the TÜBİTAK 1507 application.

User idea:
{{userIdea}}

Earlier section context:
{{previousSections}}

Produce:
- A short Markdown table comparing 3–5 existing approaches (column headings:
  Yaklaşım, Yöntem, Sınırları). Use placeholders like "TODO: kaynak bulunmalı"
  for any reference you cannot verify.
- A paragraph explicitly stating which of those limitations the proposed
  project resolves and how (technically and operationally).
- A short list of 3 search keywords or databases the user should consult
  (e.g. Scopus, Google Scholar, Patentscope) to harden the literature review.
`,
        criteria: [
          'Comparison table is present and uses Turkish column headings',
          'Explicit statement of how the project advances beyond prior art',
          'No fabricated references — uses TODO placeholders when uncertain',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 2000,
      },
      {
        id: 'method',
        order: 3,
        title: {
          tr: 'Yöntem ve İş Paketleri',
          en: 'Method & Work Packages',
          es: 'Método y paquetes de trabajo',
        },
        description: {
          tr: 'Projenin yürütme yöntemi ve iş paketlerine bölünmüş planı.',
          en: 'Execution method and work-package breakdown.',
          es: 'Método de ejecución y desglose en paquetes de trabajo.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the **Method & Work Packages** section for TÜBİTAK 1507.

User idea:
{{userIdea}}

Earlier section context:
{{previousSections}}

Output:
1. A 2–3 sentence introduction to the technical approach (mention specific
   methods, frameworks, or standards relevant to the user idea).
2. A Markdown table of work packages with columns:
   "İP No", "İP Adı", "Süre (ay)", "Sorumlu", "Çıktılar".
   Produce 4–6 work packages totalling 12–18 months. Sequence them so that
   each one's outputs unlock the next.
3. For each work package, a short paragraph (3–5 sentences) describing the
   activities, the scientific/technical risks specific to it, and the
   measurable deliverable that closes it.
`,
        criteria: [
          'Work-package table totals 12–18 months',
          'Each WP has a measurable deliverable',
          'WP risks are named, not generic',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 2500,
      },
      {
        id: 'gantt',
        order: 4,
        title: {
          tr: 'İş-Zaman Çizelgesi',
          en: 'Gantt / Timeline',
          es: 'Cronograma',
        },
        description: {
          tr: 'İş paketlerinin ay bazlı zaman çizelgesi.',
          en: 'Monthly timeline derived from the work packages.',
          es: 'Cronograma mensual basado en paquetes de trabajo.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Generate the timeline for the project's work packages.

Earlier section context (work packages live here):
{{previousSections}}

Output a JSON object with shape:
{
  "months": <integer total project duration>,
  "tasks": [
    { "id": "wp1", "name": "<TR title>", "start": <month index, 1-based>, "duration": <months>, "dependencies": ["wp0"] }
  ]
}

Rules:
- Pull the work packages from the previous section verbatim — do not invent
  new ones.
- Honour dependencies stated earlier; if not stated, infer the most natural
  sequencing.
- Total span must match the duration in the work-package table.
`,
        criteria: [
          'JSON shape matches the spec exactly',
          'Tasks reference the WPs from the prior section by id',
          'Total span matches WP table',
        ],
        outputType: 'gantt',
        modelOverride: 'flash',
        estimatedTokens: 800,
      },
      {
        id: 'budget',
        order: 5,
        title: { tr: 'Bütçe', en: 'Budget', es: 'Presupuesto' },
        description: {
          tr: 'Personel, makine-teçhizat, sarf, hizmet alımı ve seyahat dağılımıyla bütçe.',
          en: 'Budget broken down by personnel, equipment, consumables, services and travel.',
          es: 'Presupuesto desglosado por personal, equipos, consumibles, servicios y viajes.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Produce the budget table for TÜBİTAK 1507. Personnel costs follow TÜBİTAK's
PTI guidelines, but for any unit cost you do not have, use a TODO placeholder.

User idea:
{{userIdea}}

Earlier sections:
{{previousSections}}

Wizard inputs:
{{userInputs}}

Output a Markdown table with rows for each cost category:
"Kalem", "Gerekçe", "Birim Maliyet (TL)", "Adet", "Toplam (TL)".
Categories to include: Personel, Makine-Teçhizat, Sarf Malzeme, Hizmet Alımı,
Seyahat, Diğer. Then a single bold total row at the bottom.

After the table, add a "Notlar" subsection that:
- Calls out any line where you used a TODO unit cost.
- Notes that personnel cost ceiling = TÜBİTAK PTI x months x role count.
- Reminds the user the program covers up to 75% of the eligible budget.
`,
        criteria: [
          'All six cost categories present',
          'TODO placeholders for unverified unit prices',
          'Total row matches sum of lines',
        ],
        outputType: 'budget_table',
        modelOverride: 'pro',
        estimatedTokens: 1500,
        requiresUserInput: true,
        userInputSchema: {
          fields: [
            {
              id: 'team_size',
              label: {
                tr: 'Ekip büyüklüğü (kişi)',
                en: 'Team size (people)',
                es: 'Tamaño del equipo',
              },
              type: 'number',
              required: true,
            },
            {
              id: 'duration_months',
              label: {
                tr: 'Proje süresi (ay)',
                en: 'Project duration (months)',
                es: 'Duración del proyecto (meses)',
              },
              type: 'number',
              required: true,
            },
            {
              id: 'budget_target',
              label: {
                tr: 'Hedef toplam bütçe (TL)',
                en: 'Target total budget (TRY)',
                es: 'Presupuesto total objetivo (TRY)',
              },
              type: 'number',
              required: false,
              placeholder: { tr: 'opsiyonel', en: 'optional', es: 'opcional' },
            },
          ],
        },
      },
      {
        id: 'risks',
        order: 6,
        title: { tr: 'Risk Analizi', en: 'Risk Analysis', es: 'Análisis de riesgos' },
        description: {
          tr: 'Teknik, ticari ve operasyonel risklerin etki–olasılık matrisli analizi.',
          en: 'Risk analysis with impact/likelihood matrix.',
          es: 'Análisis de riesgos con matriz de impacto/probabilidad.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Identify the 5–7 most material risks for this project across three families:
technical, commercial, and operational.

User idea: {{userIdea}}
Earlier sections: {{previousSections}}

Output a Markdown table:
"Risk", "Kategori", "Olasılık (D/O/Y)", "Etki (D/O/Y)", "Önlem".
Place each risk on its own row, with at least one risk per category. Make
mitigations specific to the project — not boilerplate.
`,
        criteria: [
          'Covers all three risk families',
          'Mitigations are specific, not generic',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 1000,
      },
      {
        id: 'impact',
        order: 7,
        title: {
          tr: 'Yaygın Etki ve Çıktılar',
          en: 'Impact & Outputs',
          es: 'Impacto y resultados',
        },
        description: {
          tr: 'Bilimsel, ekonomik ve sosyal yaygın etkiler.',
          en: 'Scientific, economic, and social impact.',
          es: 'Impacto científico, económico y social.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the **Yaygın Etki** section. Address three impact families with one
short subsection each (Bilimsel, Ekonomik, Sosyal). Each subsection has
2–4 bullets. End with a "2 Yıl Sonra" paragraph stating the company's
position once the project lands.

User idea: {{userIdea}}
Earlier sections: {{previousSections}}
`,
        criteria: [
          'Three named impact subsections',
          'Concrete forecast for "2 Yıl Sonra"',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 1000,
      },
    ],
    generatedFromGuide: false,
  },

  // ---------------------------------------------------------------------------
  // Teknofest — Genel başvuru iskeleti
  // ---------------------------------------------------------------------------
  {
    id: 'teknofest-general',
    slug: 'teknofest',
    name: {
      tr: 'Teknofest Yarışma Başvurusu',
      en: 'Teknofest Competition Application',
      es: 'Solicitud para concurso Teknofest',
    },
    description: {
      tr: 'Teknofest yarışma kategorileri için tasarım, prototip ve sunum metni.',
      en: 'Design, prototype and pitch text for Teknofest competition tracks.',
      es: 'Diseño, prototipo y presentación para las categorías de Teknofest.',
    },
    category: 'teknofest',
    tier: 'economy',
    outputLanguage: 'tr',
    visibility: 'public',
    iconName: 'GraduationCap',
    active: true,
    version: '1.0.0',
    budgetHint: {
      tr: 'Yarışmaya göre değişir (genelde ödül + sponsorluk)',
      en: 'Varies by track (prize + sponsorship)',
      es: 'Depende de la categoría (premio + patrocinio)',
    },
    callDatesHint: {
      tr: 'Yıllık takvim — kategori başına farklı son tarihler',
      en: 'Annual calendar with track-specific deadlines',
      es: 'Calendario anual con fechas por categoría',
    },
    whoCanApplyHint: {
      tr: 'Lise ve üniversite öğrencileri, takımlar',
      en: 'High-school and university students / teams',
      es: 'Estudiantes y equipos de secundaria y universidad',
    },
    sections: [
      {
        id: 'summary',
        order: 1,
        title: { tr: 'Proje Özeti', en: 'Project Summary', es: 'Resumen del proyecto' },
        description: {
          tr: 'Yarışma jürisi için kısa özet (yarım sayfa).',
          en: 'Half-page summary aimed at the jury.',
          es: 'Resumen de media página dirigido al jurado.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write a half-page Teknofest project summary that opens with a one-sentence
hook, names the problem, names the proposed solution, and ends with a clear
"why now" line. Avoid jargon — the audience includes high-school students.

User idea:
{{userIdea}}
`,
        criteria: [
          'Hook sentence is concrete, not generic',
          'Includes a "why now" line',
          'Length is roughly half a page',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 600,
      },
      {
        id: 'problem',
        order: 2,
        title: {
          tr: 'Problem Tanımı ve Hedef Kitle',
          en: 'Problem Statement & Audience',
          es: 'Problema y público objetivo',
        },
        description: {
          tr: 'Çözülecek problem ve etkilenen hedef kitle.',
          en: 'The problem being solved and who it affects.',
          es: 'El problema y a quién afecta.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Describe the problem and the audience for the Teknofest project.

User idea:
{{userIdea}}

Cover:
- Who is affected, in concrete terms (age range, geography, scenario).
- The cost of the problem today (use a quantitative estimate where you can,
  use TODO when you can't).
- Why existing solutions fall short, in 2–3 bullets.
`,
        criteria: [
          'Audience is specific',
          'At least one quantitative claim or TODO',
          'Existing solutions named, not abstract',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 800,
      },
      {
        id: 'design',
        order: 3,
        title: { tr: 'Tasarım ve Yöntem', en: 'Design & Method', es: 'Diseño y método' },
        description: {
          tr: 'Çözümün teknik tasarımı, kullanılacak araçlar ve yöntem.',
          en: 'Technical design, tools and methodology.',
          es: 'Diseño técnico, herramientas y metodología.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Produce the **Design & Method** section. Include:
- A short architecture description (with components and how they connect).
- The tool/technology stack as a bulleted list (programming languages,
  hardware boards, libraries, datasets).
- A short subsection on the algorithm or approach, 4–8 sentences.
- A diagram description (text-only) the user can later turn into a figure.

User idea:
{{userIdea}}

Earlier sections:
{{previousSections}}
`,
        criteria: [
          'Names specific tools / hardware',
          'Algorithm/approach explained, not just listed',
          'Provides a textual diagram description',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 1500,
      },
      {
        id: 'prototype_plan',
        order: 4,
        title: {
          tr: 'Prototip / MVP Planı',
          en: 'Prototype / MVP Plan',
          es: 'Plan de prototipo / MVP',
        },
        description: {
          tr: 'Prototipe giden adımlar ve test stratejisi.',
          en: 'Prototype steps and test strategy.',
          es: 'Pasos hasta el prototipo y estrategia de pruebas.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

List the prototype build steps as a numbered Markdown list (8–12 items),
followed by a short test plan with success criteria.

User idea: {{userIdea}}
Design notes: {{previousSections}}
`,
        criteria: [
          'Steps are sequential and concrete',
          'Test plan has measurable success criteria',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 800,
      },
      {
        id: 'team',
        order: 5,
        title: { tr: 'Ekip ve Roller', en: 'Team & Roles', es: 'Equipo y roles' },
        description: {
          tr: 'Ekip üyeleri, sorumluluk dağılımı ve danışman bilgileri.',
          en: 'Team members, role split, and advisor info.',
          es: 'Miembros del equipo, roles y asesor.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Generate a roles-and-responsibilities table for the team. Use the wizard
inputs to fill names where provided; otherwise use TODO placeholders.

Wizard inputs:
{{userInputs}}

Output a Markdown table with columns "İsim", "Rol", "Sorumluluklar", "Saat/Hafta".
Add a short paragraph after the table about the advisor (if mentioned).
`,
        criteria: ['One row per team member', 'Includes hours/week per person'],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 600,
        requiresUserInput: true,
        userInputSchema: {
          fields: [
            {
              id: 'team_members',
              label: { tr: 'Ekip üyeleri', en: 'Team members', es: 'Miembros' },
              type: 'textarea',
              required: false,
              placeholder: {
                tr: 'her satıra bir kişi: ad, rol',
                en: 'one per line: name, role',
                es: 'uno por línea: nombre, rol',
              },
            },
            {
              id: 'advisor',
              label: {
                tr: 'Danışman (varsa)',
                en: 'Advisor (if any)',
                es: 'Asesor (si lo hay)',
              },
              type: 'text',
              required: false,
            },
          ],
        },
      },
      {
        id: 'budget_timeline',
        order: 6,
        title: {
          tr: 'Bütçe ve Zaman Planı',
          en: 'Budget & Timeline',
          es: 'Presupuesto y cronograma',
        },
        description: {
          tr: 'Malzeme bütçesi ve haftalık zaman planı.',
          en: 'Materials budget and weekly schedule.',
          es: 'Presupuesto de materiales y plan semanal.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Output exactly TWO separate Markdown tables, with a blank line between them
and an "## Hafta planı" heading before the second.

TABLE 1 — Malzeme Bütçesi
Columns: "Kalem" | "Gerekçe" | "Birim Maliyet" | "Adet" | "Toplam"
End with a row whose first column is **TOPLAM** holding the budget sum.

TABLE 2 — Hafta planı
Columns: "Hafta" | "Hedef" | "Çıktı"
ONE row per week, at least 8 rows. Do NOT collapse multiple weeks into a
single row.

REMINDER: every table row goes on its own line, and the header row is
followed by a separator row of dashes (\`| --- | --- | --- |\`).

User idea: {{userIdea}}
Earlier sections: {{previousSections}}
`,
        criteria: ['Budget total row included', 'Schedule covers ≥8 weeks'],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 1000,
      },
      {
        id: 'impact',
        order: 7,
        title: {
          tr: 'Beklenen Etki',
          en: 'Expected Impact',
          es: 'Impacto esperado',
        },
        description: {
          tr: 'Sosyal, eğitsel ve teknik etkiler.',
          en: 'Social, educational, and technical impact.',
          es: 'Impacto social, educativo y técnico.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Close the application with an "Etki" section: 3 short paragraphs on social,
educational, and technical impact. Keep it grounded in the project's actual
deliverables.

User idea: {{userIdea}}
Earlier sections: {{previousSections}}
`,
        criteria: ['Three named impact paragraphs', 'Tied to deliverables'],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 600,
      },
    ],
    generatedFromGuide: false,
  },

  // ---------------------------------------------------------------------------
  // Erasmus+ KA210 — Small-scale partnerships
  // ---------------------------------------------------------------------------
  {
    id: 'erasmus-ka210',
    slug: 'erasmus-ka210',
    name: {
      tr: 'Erasmus+ KA210 — Küçük Ortaklıklar',
      en: 'Erasmus+ KA210 — Small-scale Partnerships',
      es: 'Erasmus+ KA210 — Asociaciones a pequeña escala',
    },
    description: {
      tr: 'AB Erasmus+ programının küçük ölçekli işbirliği projelerine yönelik başvuru. 30.000–60.000 EUR.',
      en: 'EU Erasmus+ small-scale partnership grant for cooperation projects. EUR 30k–60k.',
      es: 'Subvención Erasmus+ para asociaciones a pequeña escala. EUR 30k–60k.',
    },
    category: 'eu',
    tier: 'standard',
    outputLanguage: 'en',
    visibility: 'public',
    iconName: 'Building2',
    active: true,
    version: '1.0.0',
    budgetHint: {
      tr: '30.000 € lump-sum veya 60.000 € lump-sum',
      en: 'EUR 30,000 or 60,000 lump-sum',
      es: 'EUR 30.000 o 60.000 a tanto alzado',
    },
    callDatesHint: {
      tr: 'Yılda 2 kez (Mart ve Ekim civarı)',
      en: 'Two cuts per year (around March and October)',
      es: 'Dos convocatorias al año (marzo y octubre)',
    },
    whoCanApplyHint: {
      tr: 'Eğitim/gençlik alanındaki kuruluşlar (en az 2 program ülkesinden 2 ortak)',
      en: 'Education/youth organisations (≥2 partners from ≥2 programme countries)',
      es: 'Organizaciones de educación/juventud (≥2 socios de ≥2 países)',
    },
    sections: [
      {
        id: 'summary',
        order: 1,
        title: {
          tr: 'Proje Özeti',
          en: 'Project Summary',
          es: 'Resumen del proyecto',
        },
        description: {
          tr: 'Hedefler, yaklaşım ve beklenen sonuçların özeti.',
          en: 'Summary of objectives, approach, and expected results.',
          es: 'Resumen de objetivos, enfoque y resultados.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the **Project Summary** for an Erasmus+ KA210 small-scale partnership.

User idea:
{{userIdea}}

Cover, in 200–300 words:
- The shared challenge across the partner countries
- The objectives (max 3, each measurable)
- The collaborative approach (what each partner contributes uniquely)
- The expected results and target groups
`,
        criteria: [
          'Names ≥2 partner countries explicitly (or TODO)',
          'Objectives are measurable',
          'Each partner has a distinct contribution',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 1200,
      },
      {
        id: 'context_needs',
        order: 2,
        title: {
          tr: 'Bağlam ve İhtiyaç Analizi',
          en: 'Context & Needs Analysis',
          es: 'Contexto y análisis de necesidades',
        },
        description: {
          tr: 'Programın iki/üç ülkedeki bağlamı ve karşılanan ihtiyaçlar.',
          en: 'Cross-country context and the needs the project addresses.',
          es: 'Contexto multinacional y necesidades atendidas.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write the Context & Needs Analysis. For each partner country (at least two,
use TODO if names not yet known), write:
- A 2–3 sentence summary of the relevant context.
- The specific need being addressed.
- One source or data point — or "TODO: source needed" — to ground it.

Close with a paragraph explaining why this can only be tackled through a
transnational partnership rather than locally.
`,
        criteria: [
          'One subsection per partner country',
          'Each subsection grounded in a source or marked TODO',
          'Articulates EU added value',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 1500,
      },
      {
        id: 'objectives',
        order: 3,
        title: {
          tr: 'Hedefler ve Beklenen Sonuçlar',
          en: 'Objectives & Expected Results',
          es: 'Objetivos y resultados esperados',
        },
        description: {
          tr: 'Genel ve özel hedefler, ölçülebilir sonuçlar.',
          en: 'Specific objectives and measurable results.',
          es: 'Objetivos específicos y resultados medibles.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Produce a Markdown bullet list of one **General Objective** followed by 2–3
**Specific Objectives**. For each Specific Objective, include a nested list
with: target indicator, baseline, target value, and verification source.
Use TODO when data is not available.
`,
        criteria: [
          'Exactly one general objective',
          'Each specific objective has indicator + target',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 800,
      },
      {
        id: 'activities',
        order: 4,
        title: {
          tr: 'Faaliyetler ve Yöntem',
          en: 'Activities & Methodology',
          es: 'Actividades y metodología',
        },
        description: {
          tr: 'Yapılacak faaliyetler, yöntem ve katılımcı dağılımı.',
          en: 'Activities, methodology, and participant breakdown.',
          es: 'Actividades, metodología y desglose de participantes.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Produce a Markdown table of activities with columns:
"Activity", "Type (workshop / mobility / output)", "Lead partner",
"Participants", "Month", "Deliverable".

Aim for 6–10 activities spread over 12–24 months. After the table, write a
short paragraph describing the methodology that ties them together
(participatory? action-research? design-thinking?). Mention how monitoring
and quality assurance is built in.
`,
        criteria: [
          '6–10 rows in the activities table',
          'Activity types varied, not all the same',
          'Methodology paragraph present',
        ],
        outputType: 'markdown',
        modelOverride: 'pro',
        estimatedTokens: 2000,
      },
      {
        id: 'partnership',
        order: 5,
        title: {
          tr: 'Ortaklık ve İşbirliği',
          en: 'Partnership & Cooperation',
          es: 'Asociación y cooperación',
        },
        description: {
          tr: 'Ortaklarin rolleri, iletişim planı ve karar mekanizması.',
          en: 'Partner roles, communication plan, decision-making.',
          es: 'Roles, plan de comunicación y toma de decisiones.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Describe the partnership. Cover:
- A subsection per partner (use TODO names if unknown), each 3–4 sentences,
  stating the partner's profile and unique contribution.
- A "Coordination & Communication" subsection: tools (email, Slack, Teams),
  cadence (monthly?), language of work, and decision-making process.
- A short "Conflict resolution" paragraph.
`,
        criteria: [
          'At least 2 partner subsections',
          'Communication tools and cadence named',
          'Decision-making and conflict-resolution explicit',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 1200,
      },
      {
        id: 'budget',
        order: 6,
        title: { tr: 'Bütçe', en: 'Budget', es: 'Presupuesto' },
        description: {
          tr: 'Lump-sum bütçenin faaliyetlere dağılımı.',
          en: 'Lump-sum budget split across activities.',
          es: 'Distribución del presupuesto a tanto alzado.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Erasmus+ KA210 uses a lump-sum (EUR 30,000 or EUR 60,000). Allocate the
chosen amount across the activities from the previous section in a Markdown
table with columns: "Activity", "Justification", "Amount (EUR)", "% of total".
End with a 2–3 sentence rationale for the chosen lump-sum.

Wizard inputs:
{{userInputs}}
Earlier sections:
{{previousSections}}
`,
        criteria: [
          'Total matches the chosen lump-sum exactly',
          'Each activity allocation is justified',
        ],
        outputType: 'budget_table',
        modelOverride: 'pro',
        estimatedTokens: 1000,
        requiresUserInput: true,
        userInputSchema: {
          fields: [
            {
              id: 'lump_sum',
              label: {
                tr: 'Hedef lump-sum (EUR)',
                en: 'Target lump-sum (EUR)',
                es: 'Suma a tanto alzado (EUR)',
              },
              type: 'select',
              required: true,
              options: [
                {
                  value: '30000',
                  label: { tr: '30.000 EUR', en: 'EUR 30,000', es: '30.000 EUR' },
                },
                {
                  value: '60000',
                  label: { tr: '60.000 EUR', en: 'EUR 60,000', es: '60.000 EUR' },
                },
              ],
            },
          ],
        },
      },
      {
        id: 'impact_dissemination',
        order: 7,
        title: {
          tr: 'Etki ve Yaygınlaştırma',
          en: 'Impact & Dissemination',
          es: 'Impacto y difusión',
        },
        description: {
          tr: 'Beklenen etkiler ve yaygınlaştırma planı.',
          en: 'Expected impact and dissemination plan.',
          es: 'Impacto y plan de difusión.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Write Impact & Dissemination. Cover impact at three levels (participants,
partner organisations, wider community) with one subsection each (3–5
sentences). Then a Markdown table for dissemination channels with columns
"Channel", "Audience", "Frequency", "KPI".
`,
        criteria: [
          'Impact split into 3 levels',
          'Dissemination table has KPIs (numeric or measurable)',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 1000,
      },
      {
        id: 'sustainability',
        order: 8,
        title: { tr: 'Sürdürülebilirlik', en: 'Sustainability', es: 'Sostenibilidad' },
        description: {
          tr: 'Proje sonrası devamlılık planı.',
          en: 'Plan for continuation beyond the grant.',
          es: 'Plan de continuidad tras la subvención.',
        },
        agentPromptTemplate: `${SHARED_INSTRUCTION}

Close with a Sustainability section: how the partnership and the outputs
will live beyond the grant. Address financial sustainability, organisational
ownership, and scaling.

Earlier sections: {{previousSections}}
`,
        criteria: [
          'Names financial sustainability source(s) or TODO',
          'Names which partner owns each output post-grant',
        ],
        outputType: 'markdown',
        modelOverride: 'flash',
        estimatedTokens: 700,
      },
    ],
    generatedFromGuide: false,
  },
];
