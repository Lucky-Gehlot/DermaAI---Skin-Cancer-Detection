import fs from 'node:fs';
import path from 'node:path';
import type {
  CategoryProbability,
  DermatologyModelResult,
  ImageMetadata,
  LesionCategory,
  PatientContext,
} from '../shared/types.ts';
import { getUploadsDir, loadDatabase } from './store.ts';

export const DEMONSTRATION_MESSAGE =
  'AI image assessment is currently in demonstration mode. No medical classification is available.';

export const SUPPORTED_LESION_CATEGORIES: LesionCategory[] = [
  'Melanoma',
  'Basal Cell Carcinoma',
  'Squamous Cell Carcinoma',
  'Benign Nevus',
  'Seborrheic Keratosis',
  'Other / Uncertain',
];

export interface ClassificationInput {
  imageMetadata: ImageMetadata;
  imageBuffer: Buffer;
  patientContext: PatientContext;
}

export interface DermatologyClassificationProvider {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly isClinicallyValidated: boolean;
  readonly supportedCategories: LesionCategory[];
  classify(input: ClassificationInput): Promise<DermatologyModelResult>;
}

/**
 * Default safe provider when no clinically validated dermatology classifier is connected.
 * Never fabricates predictions, confidence percentages, or cancer risk scores.
 */
export class DemonstrationDermatologyProvider implements DermatologyClassificationProvider {
  readonly id = 'derma-demo-provider';
  readonly name = 'DermaAI Demonstration Pipeline';
  readonly version = process.env.DERMATOLOGY_MODEL_VERSION || 'derma-demo-0.1.0';
  readonly isClinicallyValidated = false;
  readonly supportedCategories = SUPPORTED_LESION_CATEGORIES;

  async classify(input: ClassificationInput): Promise<DermatologyModelResult> {
    const { imageMetadata } = input;

    // Reject images that fail minimum technical resolution or integrity constraints
    if (imageMetadata.width < 200 || imageMetadata.height < 200) {
      return {
        providerId: this.id,
        providerName: this.name,
        modelVersion: this.version,
        isClinicallyValidated: false,
        classificationAvailable: false,
        status: 'rejected_quality',
        displayMessage:
          'Image rejected due to insufficient resolution for visual review. Please capture a clearer, closer photograph.',
        topCategory: null,
        probabilities: null,
        uncertaintyScore: null,
        rejectedReason: `Resolution ${imageMetadata.width}x${imageMetadata.height}px is below minimum threshold.`,
        limitations: [
          'Minimum 200x200px required; 480x480px or higher recommended.',
          'Blurred, distant, or poorly lit photographs cannot be reliably inspected.',
        ],
        evaluatedScope: {
          imageModality: 'Clinical smartphone / standard photography (Unvalidated Demo)',
          intendedPopulation: 'General adult educational demonstration only',
          fitzpatrickCoverage: 'Not clinically validated across Fitzpatrick I–VI',
        },
      };
    }

    return {
      providerId: this.id,
      providerName: this.name,
      modelVersion: this.version,
      isClinicallyValidated: false,
      classificationAvailable: false,
      status: 'demonstration_mode',
      displayMessage: DEMONSTRATION_MESSAGE,
      topCategory: null,
      probabilities: null,
      uncertaintyScore: null,
      rejectedReason: null,
      limitations: [
        'No clinically validated dermatology image-classification model is currently connected.',
        'General-purpose language models are intentionally blocked from issuing skin cancer classifications.',
        'Smartphone photographs lack polarized dermoscopic subsurface structures used by dermatologists.',
        'Model sensitivity, specificity, and calibration across Fitzpatrick skin tones I–VI require dedicated clinical validation.',
      ],
      evaluatedScope: {
        imageModality: 'Clinical smartphone photograph (Demonstration Mode)',
        intendedPopulation: 'Educational workflow preview only — not validated for diagnostic use',
        fitzpatrickCoverage: 'Pending external clinical validation dataset',
      },
    };
  }
}

/**
 * Adapter for connecting an externally validated dermatology classification service
 * without modifying frontend code. Enforces validation flags, scope checks, and
 * uncertainty/out-of-distribution rejection thresholds.
 */
export class ExternalValidatedModelAdapter implements DermatologyClassificationProvider {
  readonly id = 'external-validated-dermatology-model';
  readonly name = 'Validated Dermatology Inference Service';
  readonly version = process.env.DERMATOLOGY_MODEL_VERSION || 'ext-1.0.0';
  readonly isClinicallyValidated: boolean;
  readonly supportedCategories = SUPPORTED_LESION_CATEGORIES;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly minConfidenceThreshold = 0.65;

  constructor(endpoint: string, apiKey: string, isClinicallyValidated: boolean) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.isClinicallyValidated = isClinicallyValidated;
  }

  async classify(input: ClassificationInput): Promise<DermatologyModelResult> {
    if (!this.isClinicallyValidated || !this.endpoint) {
      return new DemonstrationDermatologyProvider().classify(input);
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: input.imageBuffer.toString('base64'),
          mimeType: input.imageMetadata.mimeType,
          width: input.imageMetadata.width,
          height: input.imageMetadata.height,
          metadata: {
            bodyLocation: input.patientContext.bodyLocation,
            ageRange: input.patientContext.ageRange,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Model endpoint responded with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        modelVersion?: string;
        validatedForModality?: boolean;
        qualityRejected?: boolean;
        rejectionReason?: string;
        uncertaintyScore?: number;
        probabilities?: CategoryProbability[];
      };

      if (payload.qualityRejected) {
        return {
          providerId: this.id,
          providerName: this.name,
          modelVersion: payload.modelVersion || this.version,
          isClinicallyValidated: true,
          classificationAvailable: false,
          status: 'rejected_quality',
          displayMessage:
            payload.rejectionReason ||
            'The classification model rejected this image due to insufficient visual quality or unsupported capture conditions.',
          topCategory: null,
          probabilities: null,
          uncertaintyScore: payload.uncertaintyScore ?? 1,
          rejectedReason: payload.rejectionReason || 'Image quality below model threshold.',
          limitations: [
            'Out-of-distribution or low-clarity images are automatically rejected to prevent unsafe outputs.',
          ],
          evaluatedScope: {
            imageModality: 'Validated clinical / dermoscopic photography',
            intendedPopulation: 'Adults within validated study parameters',
            fitzpatrickCoverage: 'Evaluated across Fitzpatrick I–VI per model card',
          },
        };
      }

      if (!payload.validatedForModality || !Array.isArray(payload.probabilities)) {
        return {
          providerId: this.id,
          providerName: this.name,
          modelVersion: payload.modelVersion || this.version,
          isClinicallyValidated: false,
          classificationAvailable: false,
          status: 'demonstration_mode',
          displayMessage: DEMONSTRATION_MESSAGE,
          topCategory: null,
          probabilities: null,
          uncertaintyScore: null,
          rejectedReason: 'Image modality outside validated model scope.',
          limitations: ['Model scope does not cover this image type or population.'],
          evaluatedScope: {
            imageModality: 'Outside validated scope',
            intendedPopulation: 'Unverified',
            fitzpatrickCoverage: 'Unverified',
          },
        };
      }

      const sorted = [...payload.probabilities].sort((a, b) => b.probability - a.probability);
      const top = sorted[0];
      const uncertain =
        !top ||
        top.probability < this.minConfidenceThreshold ||
        (typeof payload.uncertaintyScore === 'number' && payload.uncertaintyScore > 0.45);

      return {
        providerId: this.id,
        providerName: this.name,
        modelVersion: payload.modelVersion || this.version,
        isClinicallyValidated: true,
        classificationAvailable: !uncertain,
        status: 'completed_validated',
        displayMessage: uncertain
          ? 'Model uncertainty is high for this image. No single category is highlighted; please seek professional dermatological review.'
          : 'Calibrated model probabilities are provided for informational review alongside professional clinical judgment.',
        topCategory: uncertain ? 'Other / Uncertain' : top.category,
        probabilities: uncertain ? null : sorted,
        uncertaintyScore: payload.uncertaintyScore ?? (top ? Number((1 - top.probability).toFixed(3)) : 1),
        rejectedReason: null,
        limitations: [
          'Calibrated probabilities are statistical estimates and never constitute a definitive diagnosis.',
          'Even high-probability benign outputs cannot exclude early or atypical malignancy.',
        ],
        evaluatedScope: {
          imageModality: 'Validated dermatology imaging',
          intendedPopulation: 'Adults within clinical validation protocol',
          fitzpatrickCoverage: 'Audited across Fitzpatrick skin types I–VI',
        },
      };
    } catch (error) {
      return {
        providerId: this.id,
        providerName: this.name,
        modelVersion: this.version,
        isClinicallyValidated: false,
        classificationAvailable: false,
        status: 'model_unavailable',
        displayMessage:
          'The external dermatology classification service is currently unavailable. Please try again later or consult a healthcare professional.',
        topCategory: null,
        probabilities: null,
        uncertaintyScore: null,
        rejectedReason: error instanceof Error ? error.message : 'Model endpoint unreachable',
        limitations: ['Classification service unreachable; no predictions generated.'],
        evaluatedScope: {
          imageModality: 'Service unavailable',
          intendedPopulation: 'N/A',
          fitzpatrickCoverage: 'N/A',
        },
      };
    }
  }
}

export function getActiveDermatologyProvider(): DermatologyClassificationProvider {
  const db = loadDatabase();
  const endpoint = process.env.DERMATOLOGY_MODEL_ENDPOINT || '';
  const apiKey = process.env.DERMATOLOGY_MODEL_API_KEY || '';
  const envValidated = process.env.DERMATOLOGY_MODEL_VALIDATED === 'true';

  if (db.activeModelMode === 'external_endpoint' && envValidated && endpoint) {
    return new ExternalValidatedModelAdapter(endpoint, apiKey, true);
  }
  return new DemonstrationDermatologyProvider();
}

export function evaluateClinicalSymptomsAndNextSteps(
  patientContext: PatientContext,
  modelResult: DermatologyModelResult,
  imageMetadata: ImageMetadata
): {
  warningSigns: string[];
  recommendedNextSteps: string[];
  urgencyLevel: 'routine' | 'prompt_evaluation' | 'uncertain_review';
} {
  const warningSigns: string[] = [];
  const symptomsLower = patientContext.symptoms.map((s) => s.toLowerCase());

  if (
    patientContext.hasChanged === 'yes_rapidly' ||
    patientContext.hasChanged === 'yes_gradually'
  ) {
    warningSigns.push(
      `Reported change in size, shape, or color (${
        patientContext.hasChanged === 'yes_rapidly' ? 'rapid change' : 'gradual evolution'
      }) — corresponds to the "E" (Evolving) ABCDE warning sign.`
    );
  }

  if (symptomsLower.some((s) => s.includes('bleed'))) {
    warningSigns.push(
      'Spontaneous or easily triggered bleeding — a symptom that warrants prompt in-person dermatological examination.'
    );
  }

  if (symptomsLower.some((s) => s.includes('sore') || s.includes('ulcer') || s.includes('crust'))) {
    warningSigns.push(
      'Non-healing sore, crusting, or ulceration — persistent sores should be evaluated to rule out keratinocyte carcinomas or atypical lesions.'
    );
  }

  if (symptomsLower.some((s) => s.includes('pain') || s.includes('hurt') || s.includes('tender'))) {
    warningSigns.push('Tenderness or localized pain around the lesion.');
  }

  if (symptomsLower.some((s) => s.includes('itch'))) {
    warningSigns.push('Persistent itching at the lesion site.');
  }

  if (patientContext.personalHistory.trim().length > 0) {
    warningSigns.push(
      'Personal or family history noted — individuals with prior skin cancer, atypical moles, or immunosuppression benefit from regular dermatology surveillance.'
    );
  }

  if (imageMetadata.qualityStatus === 'suboptimal') {
    warningSigns.push(
      'Uploaded image quality was suboptimal (low resolution, compression, or framing), increasing visual uncertainty.'
    );
  }

  let urgencyLevel: 'routine' | 'prompt_evaluation' | 'uncertain_review' = 'uncertain_review';
  const hasUrgentSymptom =
    patientContext.hasChanged === 'yes_rapidly' ||
    symptomsLower.some((s) => s.includes('bleed') || s.includes('sore') || s.includes('ulcer'));

  if (hasUrgentSymptom || warningSigns.length >= 2) {
    urgencyLevel = 'prompt_evaluation';
  } else if (!modelResult.classificationAvailable || modelResult.status !== 'completed_validated') {
    urgencyLevel = 'uncertain_review';
  } else {
    urgencyLevel = 'routine';
  }

  const recommendedNextSteps: string[] = [];

  if (urgencyLevel === 'prompt_evaluation') {
    recommendedNextSteps.push(
      'Schedule a timely in-person appointment with a board-certified dermatologist or primary care clinician to examine this spot with dermoscopy.'
    );
  } else {
    recommendedNextSteps.push(
      'Consult a qualified dermatologist or healthcare provider for an accurate in-person skin examination, especially if the spot looks different from your other moles.'
    );
  }

  if (!modelResult.classificationAvailable) {
    recommendedNextSteps.push(
      'Do not treat this demonstration assessment as reassurance or clearance—no automated diagnostic classification was performed.'
    );
  }

  recommendedNextSteps.push(
    'Save or print your PDF summary (including symptom timeline and onset dates) to share with your clinician during your visit.'
  );
  recommendedNextSteps.push(
    'Avoid scratching, picking, or attempting home removal of any skin lesion before a medical evaluation.'
  );

  return { warningSigns, recommendedNextSteps, urgencyLevel };
}

export function readStoredImageBuffer(imageMetadata: ImageMetadata): Buffer | null {
  const ext = imageMetadata.format === 'PNG' ? 'png' : 'jpg';
  const filePath = path.resolve(getUploadsDir(), `${imageMetadata.id}.${ext}`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}
