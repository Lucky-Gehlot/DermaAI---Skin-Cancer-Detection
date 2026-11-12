import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  FileCheck2,
  ImagePlus,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { syncFirebaseAssessment } from '../lib/firebase';
import { downloadAssessmentPdf } from '../lib/pdfReport';
import { DermatologistFinderModal } from '../components/DermatologistFinderModal';
import type { AppRoute } from '../components/Navbar';
import type { AssessmentRecord, ImageMetadata, PatientContext } from '../shared/types';

interface AssessmentPageProps {
  onNavigate: (route: AppRoute) => void;
  initialAssessment?: AssessmentRecord | null;
}

const SYMPTOM_OPTIONS = [
  'Itching',
  'Bleeding or oozing',
  'Pain or tenderness',
  'Non-healing sore or crust',
  'Rapid surface change',
];

const BODY_LOCATIONS = [
  'Face / Scalp / Ears',
  'Neck / Chest',
  'Upper Back / Shoulders',
  'Abdomen / Lower Back',
  'Arms / Hands',
  'Legs / Feet / Nails',
  'Other / Prefer not to specify',
];

export function AssessmentPage({ onNavigate, initialAssessment }: AssessmentPageProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialAssessment ? 4 : 1);

  // Step 1 state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [storeImageAfterAssessment, setStoreImageAfterAssessment] = useState(
    user?.allowImageStorage ?? true
  );
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<ImageMetadata | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Camera modal state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Step 2 state
  const [patientContext, setPatientContext] = useState<PatientContext>({
    ageRange: user?.ageRange || '',
    bodyLocation: '',
    durationPresent: '',
    hasChanged: '',
    symptoms: [],
    personalHistory: '',
  });

  // Step 3 / 4 state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<AssessmentRecord | null>(initialAssessment || null);
  const [dermModalOpen, setDermModalOpen] = useState(false);

  useEffect(() => {
    if (initialAssessment) {
      setAssessment(initialAssessment);
      setStep(4);
    }
  }, [initialAssessment]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewUrl]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const startLiveCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      mobileCameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 50);
    } catch {
      setCameraError(
        'Camera permission was denied or unavailable. You can still upload a photograph from your device.'
      );
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const captured = new File([blob], `lesion-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          void handleFileSelection(captured);
        }
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  const handleFileSelection = async (file: File | undefined) => {
    setUploadError(null);
    setUploadedImageId(null);
    setUploadedMeta(null);

    if (!file) {
      setUploadError('No file selected. Please choose a JPG, JPEG, or PNG image.');
      return;
    }
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type.toLowerCase())) {
      setUploadError('Invalid file format. Only JPG, JPEG, and PNG images are accepted.');
      return;
    }
    if (file.size === 0) {
      setUploadError('The selected file is empty.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image exceeds the 10 MB file size limit.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    // Client-side dimension & corruption check via Image element
    const dimsOk = await new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth < 200 || img.naturalHeight < 200) {
          resolve({
            ok: false,
            reason: `Image dimensions (${img.naturalWidth}×${img.naturalHeight}px) are below the 200×200px minimum.`,
          });
        } else {
          resolve({ ok: true });
        }
      };
      img.onerror = () =>
        resolve({ ok: false, reason: 'The selected image appears corrupted or unreadable.' });
      img.src = objectUrl;
    });

    if (!dimsOk.ok) {
      URL.revokeObjectURL(objectUrl);
      setUploadError(dimsOk.reason || 'Invalid image.');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const clearSelectedImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedImageId(null);
    setUploadedMeta(null);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleUploadAndProceed = async () => {
    setUploadError(null);
    if (!user) {
      setUploadError('Please sign in first so your assessment can be processed securely and privately.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please upload or capture a skin lesion image before continuing.');
      return;
    }
    if (!consentAccepted) {
      setUploadError('Please confirm privacy consent before uploading your image.');
      return;
    }

    if (uploadedImageId) {
      setStep(2);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    try {
      const res = await api.uploadAssessmentImage(selectedFile, consentAccepted, (pct) => {
        setUploadProgress(pct);
      });
      setUploadedImageId(res.imageId);
      setUploadedMeta(res.imageMetadata);
      setStep(2);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setPatientContext((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const runAnalysis = async (skipNonEssential = false) => {
    if (!uploadedImageId) {
      setAnalyzeError('Image session is missing. Please re-upload your photograph.');
      setStep(1);
      return;
    }

    setStep(3);
    setAnalyzing(true);
    setAnalyzeError(null);

    const payloadContext: PatientContext = skipNonEssential
      ? {
          ageRange: '',
          bodyLocation: patientContext.bodyLocation,
          durationPresent: '',
          hasChanged: patientContext.hasChanged,
          symptoms: patientContext.symptoms,
          personalHistory: '',
        }
      : patientContext;

    try {
      const res = await api.analyzeAssessment({
        imageId: uploadedImageId,
        consentAccepted,
        storeImageAfterAssessment,
        patientContext: payloadContext,
      });
      setAssessment(res.assessment);
      syncFirebaseAssessment(res.assessment).catch(() => undefined);
      setStep(4);
    } catch (err) {
      setAnalyzeError(
        err instanceof Error
          ? err.message
          : 'Unable to complete assessment. Please try again or seek professional evaluation.'
      );
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetWorkflow = () => {
    clearSelectedImage();
    setConsentAccepted(false);
    setPatientContext({
      ageRange: user?.ageRange || '',
      bodyLocation: '',
      durationPresent: '',
      hasChanged: '',
      symptoms: [],
      personalHistory: '',
    });
    setAssessment(null);
    setAnalyzeError(null);
    setStep(1);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Step Progress */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Skin Lesion Assessment Workflow
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Informational risk guidance and symptom triage · Not a medical diagnosis
            </p>
          </div>
          {step === 4 && (
            <button
              type="button"
              onClick={resetWorkflow}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Start New Assessment</span>
            </button>
          )}
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Upload Image' },
            { num: 2, label: 'Patient Context' },
            { num: 3, label: 'AI Assessment' },
            { num: 4, label: 'Results & Guidance' },
          ].map((item) => {
            const active = step === item.num;
            const completed = step > item.num;
            return (
              <li
                key={item.num}
                className={`rounded-lg border px-3 py-2.5 text-xs font-medium flex items-center gap-2 ${
                  active
                    ? 'border-[#1769AA] bg-[#1769AA]/10 text-[#1769AA] dark:border-[#20B8A8] dark:bg-[#20B8A8]/15 dark:text-[#20B8A8]'
                    : completed
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className="font-mono">{`0${item.num}`}</span>
                <span className="truncate">{item.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Sign-in Prompt if Unauthenticated */}
      {!user && step < 4 && (
        <div className="rounded-xl border border-[#1769AA]/30 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-[#1769AA] dark:text-[#20B8A8] shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 dark:text-slate-200">
              <strong>Account required for private image handling:</strong> Sign in or create a free
              account so your uploaded images and assessment summaries remain protected and under your
              deletion control.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className="rounded-lg bg-[#1769AA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12548A] whitespace-nowrap shrink-0"
          >
            Login / Sign Up
          </button>
        </div>
      )}

      {/* STEP 1: IMAGE UPLOAD */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Step 1: Upload or Capture Skin Lesion Image
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Accepted formats: JPG, JPEG, PNG · Minimum 200×200px · Maximum 10 MB
              </p>
            </div>

            {!previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleFileSelection(e.dataTransfer.files?.[0]);
                }}
                className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-8 text-center space-y-4"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1769AA]/10 text-[#1769AA] dark:bg-[#20B8A8]/15 dark:text-[#20B8A8]">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Drag and drop a skin lesion image here
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Or choose an image from your device or camera
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload JPG / PNG</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void startLiveCamera()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Use Camera</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    void handleFileSelection(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={mobileCameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    void handleFileSelection(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-950">
                  <img
                    src={previewUrl}
                    alt="Uploaded lesion preview"
                    className="w-full max-h-80 object-contain mx-auto"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="truncate font-mono">
                    {selectedFile?.name} · {((selectedFile?.size || 0) / 1024).toFixed(1)} KB
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Replace Image
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900 px-3 py-1.5 font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    void handleFileSelection(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {/* Privacy Consent & Storage Choice */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA]"
                />
                <span className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  <strong>Privacy Consent Required:</strong> I consent to DermaAI validating and
                  temporarily processing this skin image solely to run this informational assessment. I
                  understand DermaAI is not a diagnostic medical device, and my image will not be used
                  for AI model training.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeImageAfterAssessment}
                  onChange={(e) => setStoreImageAfterAssessment(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#1769AA] focus:ring-[#1769AA]"
                />
                <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  Retain this image privately in my assessment history (per my retention setting). Uncheck
                  to delete the image immediately after assessment while keeping the text summary.
                </span>
              </label>
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-300">
                  <span>Validating &amp; uploading securely…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#1769AA] transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleUploadAndProceed()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A] disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
                <span>Validate &amp; Continue</span>
              </button>
            </div>
          </div>

          {/* Image Capture & Quality Guidance */}
          <aside className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-5 h-fit">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Image Capture &amp; Quality Guidance
            </h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                'Use natural, even daylight and avoid harsh overhead shadows or flash glare.',
                'Keep the camera steady and focused sharply on the lesion borders.',
                'Avoid beauty filters, color enhancements, or heavy digital zoom.',
                'Photograph the spot clearly from roughly 10–15 cm away.',
                'Include a millimeter ruler or neutral reference scale next to the spot when possible.',
                'Do not include faces, tattoos, jewelry, or unnecessary personal details in the frame.',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#20B8A8] shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {/* STEP 2: PATIENT INFORMATION */}
      {step === 2 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Step 2: Lesion Timeline &amp; Clinical Context
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Only information relevant to risk awareness is requested. You may skip non-essential
                questions.
              </p>
            </div>
            {uploadedMeta && (
              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Image verified: {uploadedMeta.format} · {uploadedMeta.width}×{uploadedMeta.height}px
              </div>
            )}
          </div>

          {uploadedMeta && uploadedMeta.qualityStatus === 'suboptimal' && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-semibold">Image Quality Advisory</div>
              {uploadedMeta.qualityNotes.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
          )}

          {analyzeError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-sm text-rose-800 dark:text-rose-200"
            >
              {analyzeError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="age-range" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Age Range <span className="text-xs text-slate-400">(optional)</span>
              </label>
              <select
                id="age-range"
                value={patientContext.ageRange}
                onChange={(e) => setPatientContext({ ...patientContext, ageRange: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Prefer not to specify</option>
                <option value="Under 18">Under 18</option>
                <option value="18–29">18–29</option>
                <option value="30–49">30–49</option>
                <option value="50–64">50–64</option>
                <option value="65+">65 or older</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="body-location" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Body Location of the Lesion
              </label>
              <select
                id="body-location"
                value={patientContext.bodyLocation}
                onChange={(e) => setPatientContext({ ...patientContext, bodyLocation: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Select location</option>
                {BODY_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="duration-present" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                How long has the spot been present?
              </label>
              <select
                id="duration-present"
                value={patientContext.durationPresent}
                onChange={(e) =>
                  setPatientContext({ ...patientContext, durationPresent: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Not sure / Skip</option>
                <option value="Less than 1 month">Less than 1 month</option>
                <option value="1–6 months">1–6 months</option>
                <option value="6–12 months">6–12 months</option>
                <option value="More than 1 year">More than 1 year</option>
                <option value="Since childhood">Since childhood</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="has-changed" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                Has it changed in size, shape, or color?
              </label>
              <select
                id="has-changed"
                value={patientContext.hasChanged}
                onChange={(e) => setPatientContext({ ...patientContext, hasChanged: e.target.value })}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white"
              >
                <option value="">Unsure / Skip</option>
                <option value="no_change">No noticeable change</option>
                <option value="yes_gradually">Yes, changed gradually</option>
                <option value="yes_rapidly">Yes, changed rapidly (weeks to a few months)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Are you experiencing any of the following symptoms at this spot?
            </div>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((sym) => {
                const selected = patientContext.symptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                      selected
                        ? 'border-[#1769AA] bg-[#1769AA] text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="personal-history" className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Relevant Personal or Family History <span className="text-xs text-slate-400">(optional — do not include names or contact details)</span>
            </label>
            <textarea
              id="personal-history"
              rows={3}
              maxLength={500}
              value={patientContext.personalHistory}
              onChange={(e) =>
                setPatientContext({ ...patientContext, personalHistory: e.target.value })
              }
              placeholder="e.g., Prior sunburns, family history of melanoma, or multiple atypical moles"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Back to Image
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void runAnalysis(true)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Skip Non-Essential &amp; Run
              </button>
              <button
                type="button"
                onClick={() => void runAnalysis(false)}
                className="rounded-lg bg-[#1769AA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
              >
                Complete Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-12 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-[#1769AA] dark:text-[#20B8A8] animate-spin mx-auto" />
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {analyzing ? 'Evaluating Image Integrity & Generating Guidance…' : 'Preparing Results…'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            Running dermatology model scope verification, symptom triage checks, and plain-language
            educational synthesis without sending personally identifiable details.
          </p>
        </div>
      )}

      {/* STEP 4: RESULTS DASHBOARD */}
      {step === 4 && assessment && (
        <div className="space-y-6">
          {/* Mandatory Prominent Medical Warning Banner */}
          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-5 flex items-start gap-3.5">
            <ShieldAlert className="h-6 w-6 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-display text-sm font-bold text-amber-950 dark:text-amber-100">
                Clinical Diagnostic Limitation Notice
              </div>
              <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                An AI assessment cannot diagnose or exclude skin cancer. Only a qualified healthcare
                professional can evaluate your lesion and determine whether further testing or a
                biopsy is needed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column: Uploaded image & metadata */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Submitted Photograph
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(assessment.createdAt).toLocaleString()}
                  </span>
                </div>

                {assessment.imageStored ? (
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950">
                    <img
                      src={`/api/assessment/${encodeURIComponent(assessment.id)}/image`}
                      alt="Submitted skin lesion"
                      className="w-full max-h-72 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                    Image deleted in accordance with your privacy preference.
                  </div>
                )}

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 font-mono tabular-nums">
                  <div>
                    Format: {assessment.imageMetadata.format} · {assessment.imageMetadata.width}×
                    {assessment.imageMetadata.height}px
                  </div>
                  <div>Model Version: {assessment.modelResult.modelVersion}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-5 space-y-3">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Recommended Actions
                </h3>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDermModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1769AA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12548A]"
                  >
                    <Stethoscope className="h-4 w-4" />
                    <span>Find a Dermatologist</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadAssessmentPdf(assessment)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Summary Report (PDF)</span>
                  </button>
                  {user && (
                    <button
                      type="button"
                      onClick={() => onNavigate('dashboard')}
                      className="text-xs font-medium text-[#1769AA] dark:text-[#20B8A8] hover:underline pt-1"
                    >
                      View All Assessments in Dashboard
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Model output, limitations, warning signs, guidance */}
            <div className="lg:col-span-7 space-y-6">
              {/* Model Output Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Dermatology Model Output
                  </h2>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {assessment.modelResult.isClinicallyValidated
                      ? 'Validated Model Connected'
                      : 'Demonstration Mode · Unvalidated'}
                  </span>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm font-medium text-slate-900 dark:text-white">
                  {assessment.modelResult.displayMessage}
                </div>

                {assessment.modelResult.classificationAvailable &&
                  assessment.modelResult.probabilities && (
                    <div className="space-y-2.5 pt-2">
                      {assessment.modelResult.probabilities.map((p) => (
                        <div key={p.category} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-800 dark:text-slate-200">{p.category}</span>
                            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                              {(p.probability * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-[#1769AA] dark:bg-[#20B8A8]"
                              style={{ width: `${Math.round(p.probability * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Model Scope &amp; Limitations
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {assessment.modelResult.limitations.map((lim) => (
                      <li key={lim}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Warning Signs */}
              {assessment.warningSigns.length > 0 && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#111C2B] p-6 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-display text-base font-bold">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Relevant Warning Signs Identified</span>
                  </div>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {assessment.warningSigns.map((w) => (
                      <li key={w} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Next Steps & Gemini Educational Guidance */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C2B] p-6 space-y-5">
                <div className="space-y-2">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Recommended Next Steps
                  </h3>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {assessment.recommendedNextSteps.map((stepText) => (
                      <li key={stepText} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-[#20B8A8] shrink-0 mt-0.5" />
                        <span>{stepText}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Plain-Language Educational Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {assessment.geminiGuidance.plainLanguageSummary}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {assessment.geminiGuidance.limitationsExplained}
                  </p>

                  {assessment.geminiGuidance.terminologyExplained.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {assessment.geminiGuidance.terminologyExplained.map((item) => (
                        <div
                          key={item.term}
                          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3"
                        >
                          <div className="text-xs font-semibold text-[#1769AA] dark:text-[#20B8A8]">
                            {item.term}
                          </div>
                          <div className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                            {item.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {assessment.geminiGuidance.questionsForDoctor.length > 0 && (
                    <div className="pt-2 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Helpful Questions for Your Dermatologist
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {assessment.geminiGuidance.questionsForDoctor.map((q) => (
                          <li key={q}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Capture Modal */}
      {cameraOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Camera capture"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#111C2B] p-5 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold">Capture Skin Lesion Photo</span>
              <button
                type="button"
                onClick={stopCamera}
                aria-label="Close camera"
                className="rounded-lg p-1.5 hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full rounded-lg bg-black aspect-[4/3] object-cover"
            />
            {cameraError && <p className="text-xs text-rose-300">{cameraError}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={captureFromCamera}
                className="inline-flex items-center gap-2 rounded-lg bg-[#20B8A8] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-[#1aa394]"
              >
                <Camera className="h-4 w-4" />
                <span>Take Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <DermatologistFinderModal open={dermModalOpen} onClose={() => setDermModalOpen(false)} />
    </div>
  );
}
