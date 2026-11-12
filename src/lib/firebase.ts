import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AssessmentRecord, UserPublic } from '../shared/types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function syncFirebaseUserProfile(user: UserPublic) {
  if (!auth.currentUser || auth.currentUser.uid !== user.id) return;
  const path = `users/${user.id}`;
  try {
    await setDoc(
      doc(db, 'users', user.id),
      {
        uid: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        ...(user.ageRange ? { ageRange: user.ageRange } : {}),
        defaultRetentionDays: user.defaultRetentionDays,
        allowImageStorage: user.allowImageStorage,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncFirebaseAssessment(assessment: AssessmentRecord) {
  if (!auth.currentUser || auth.currentUser.uid !== assessment.userId) return;
  const path = `assessments/${assessment.id}`;
  try {
    await setDoc(doc(db, 'assessments', assessment.id), {
      id: assessment.id,
      userId: assessment.userId,
      status: assessment.modelResult.status,
      bodyLocation: assessment.patientContext.bodyLocation,
      ageRange: assessment.patientContext.ageRange,
      durationPresent: assessment.patientContext.durationPresent,
      hasChanged: assessment.patientContext.hasChanged,
      symptoms: assessment.patientContext.symptoms,
      personalHistory: assessment.patientContext.personalHistory,
      consentAccepted: assessment.consentAccepted,
      imageStored: assessment.imageStored,
      modelVersion: assessment.modelResult.modelVersion,
      classificationAvailable: assessment.modelResult.classificationAvailable,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateFirebaseAssessmentImageState(
  assessmentId: string,
  userId: string,
  imageStored: boolean
) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `assessments/${assessmentId}`;
  try {
    await updateDoc(doc(db, 'assessments', assessmentId), {
      imageStored,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFirebaseAssessment(assessmentId: string, userId: string) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  const path = `assessments/${assessmentId}`;
  try {
    await deleteDoc(doc(db, 'assessments', assessmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
