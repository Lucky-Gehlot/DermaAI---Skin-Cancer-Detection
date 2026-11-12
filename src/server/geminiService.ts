import { GoogleGenAI, Type } from '@google/genai';
import type {
  ChatTurn,
  DermatologyModelResult,
  GeminiGuidanceOutput,
  PatientContext,
} from '../shared/types.ts';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Generates plain-language educational guidance using Gemini.
 * Strictly receives only non-identifiable clinical context (no name, email, or UID)
 * and NEVER sends the lesion image to generate an unvalidated cancer classification.
 */
export async function generateAssessmentGuidance(
  patientContext: PatientContext,
  modelResult: DermatologyModelResult,
  warningSigns: string[]
): Promise<GeminiGuidanceOutput> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      available: false,
      plainLanguageSummary:
        'Educational AI explanation is currently unavailable because the server Gemini API key is not configured. Review the clinical warning signs and consult a dermatologist for an in-person evaluation.',
      terminologyExplained: [
        {
          term: 'Dermoscopy',
          explanation:
            'A handheld magnified light examination used by dermatologists to inspect pigment patterns beneath the skin surface.',
        },
        {
          term: 'ABCDE Criteria',
          explanation:
            'Asymmetry, Border irregularity, Color variation, Diameter (>6mm), and Evolving—warning features clinicians check when screening pigmented spots.',
        },
      ],
      limitationsExplained:
        'Automated tools cannot diagnose skin cancer or confirm that a lesion is benign. Only an in-person exam and, if needed, a skin biopsy can establish a medical diagnosis.',
      questionsForDoctor: [
        'Does this spot show any atypical features under dermoscopy?',
        'Should we monitor this lesion over time with baseline photography, or is a biopsy recommended?',
        'How often should I schedule full-body skin exams based on my history?',
      ],
      errorMessage: 'GEMINI_API_KEY not configured on server.',
    };
  }

  const sanitizedSummaryInput = {
    modelStatus: modelResult.status,
    classificationAvailable: modelResult.classificationAvailable,
    validatedCategoryIfAvailable: modelResult.classificationAvailable
      ? modelResult.topCategory
      : 'None (Demonstration Mode / Unvalidated)',
    bodyLocation: patientContext.bodyLocation || 'Not specified',
    durationPresent: patientContext.durationPresent || 'Not specified',
    changeReported: patientContext.hasChanged || 'Not specified',
    symptomsReported: patientContext.symptoms,
    triageFlagsCount: warningSigns.length,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Provide clear, compassionate, medically responsible educational context for a user who just completed a skin lesion pre-screening form.

Non-identifiable session summary:
${JSON.stringify(sanitizedSummaryInput, null, 2)}

Rules you MUST obey:
1. NEVER diagnose, confirm, or rule out skin cancer or any specific skin disease.
2. Clearly reinforce that if classificationAvailable is false, no AI image classification was performed.
3. Explain dermatological terms in plain, accessible language (6th-8th grade reading clarity where possible, without losing accuracy).
4. Explain why photographs alone have inherent limitations compared to in-person dermoscopy and biopsy.
5. Suggest 3 practical questions the user can ask a dermatologist at an appointment.`,
      config: {
        systemInstruction:
          'You are a patient-education medical communicator for DermaAI. You never provide diagnoses, cancer probabilities, or false reassurance. Always encourage professional dermatological evaluation for changing, symptomatic, or uncertain lesions.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plainLanguageSummary: {
              type: Type.STRING,
              description: '2-3 sentences summarizing what this assessment step did and why clinical follow-up matters.',
            },
            terminologyExplained: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['term', 'explanation'],
              },
              description: '2-3 relevant dermatological terms explained simply.',
            },
            limitationsExplained: {
              type: Type.STRING,
              description: 'Clear explanation of why AI/photo screening cannot replace a clinician or biopsy.',
            },
            questionsForDoctor: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 helpful questions to ask a dermatologist.',
            },
          },
          required: [
            'plainLanguageSummary',
            'terminologyExplained',
            'limitationsExplained',
            'questionsForDoctor',
          ],
        },
      },
    });

    const raw = (response.text || '').trim();
    const parsed = JSON.parse(raw) as Omit<GeminiGuidanceOutput, 'available'>;
    return {
      available: true,
      plainLanguageSummary: parsed.plainLanguageSummary,
      terminologyExplained: parsed.terminologyExplained || [],
      limitationsExplained: parsed.limitationsExplained,
      questionsForDoctor: parsed.questionsForDoctor || [],
    };
  } catch (err) {
    console.error('Gemini guidance generation failed:', err);
    return {
      available: false,
      plainLanguageSummary:
        'We could not generate an extended AI educational summary at this moment, but your symptom timeline and standard medical guidance are ready below.',
      terminologyExplained: [
        {
          term: 'Evolving (E in ABCDE)',
          explanation:
            'Any noticeable change in a spot’s size, shape, color, height, or new symptoms like bleeding or itching.',
        },
        {
          term: 'Biopsy',
          explanation:
            'A quick outpatient procedure where a clinician removes a small tissue sample for microscopic pathology review—the definitive way to diagnose skin lesions.',
        },
      ],
      limitationsExplained:
        'An AI assessment cannot diagnose or exclude skin cancer. In-person dermatological examination remains essential.',
      questionsForDoctor: [
        'Does this lesion require dermoscopy or a biopsy?',
        'Are there other spots on my skin we should monitor?',
        'What sun protection and checkup schedule do you recommend for me?',
      ],
      errorMessage: err instanceof Error ? err.message : 'Gemini service unavailable',
    };
  }
}

export async function chatSkinHealthEducation(history: ChatTurn[]): Promise<{
  reply: string;
  error?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      reply:
        'The Skin Health Assistant is currently unavailable because the server Gemini API key is not configured. Please browse our ABCDE Skin Health Guide or consult a licensed dermatologist with specific questions.',
      error: 'GEMINI_API_KEY not configured.',
    };
  }

  const sanitizedHistory = history
    .filter((m) => m.text && m.text.trim().length > 0)
    .slice(-12)
    .map((m) => ({
      role: m.role,
      parts: [{ text: m.text.slice(0, 1500) }],
    }));

  if (sanitizedHistory.length === 0) {
    return { reply: 'Please enter a skin health question to get started.' };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: sanitizedHistory,
      config: {
        systemInstruction: `You are DermaAI's Skin Health Education Assistant.
Your role is strictly educational:
- Explain the ABCDE melanoma warning signs, basal cell carcinoma, squamous cell carcinoma, common benign growths, UV/sun protection, and how dermatologists evaluate spots (dermoscopy, skin biopsy).
- Ground explanations in reputable public health consensus (American Academy of Dermatology, National Cancer Institute, Skin Cancer Foundation).
- NEVER diagnose a user's mole or lesion, NEVER estimate cancer probability, NEVER recommend delaying care, and NEVER prescribe medications or home treatments.
- If a user describes a bleeding, changing, painful, or worrying spot, clearly advise scheduling an in-person exam with a qualified healthcare professional or dermatologist.
- Keep responses concise, empathetic, structured, and easy to read.`,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty response from Gemini API.');
    }
    return { reply: text };
  } catch (err) {
    console.error('Gemini chat failed:', err);
    return {
      reply:
        'I encountered a temporary issue connecting to the educational assistant service. Please try again in a moment, or review the ABCDE Skin Health Guide on this site.',
      error: err instanceof Error ? err.message : 'Gemini chat request failed',
    };
  }
}
