'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedDocRef.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} memoizedDocRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // 1. Initial robust check for a valid Firestore reference object
    if (!memoizedDocRef || typeof memoizedDocRef !== 'object') {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // 2. Verify the reference is properly attached to a Firestore instance.
    if (!memoizedDocRef.firestore) {
      return;
    }

    setIsLoading(true);
    setError(null);

    let isSubscribed = true;
    let unsubscribe: Unsubscribe | null = null;

    try {
      // 3. Initiate the listener with protection against synchronous SDK internal failures
      unsubscribe = onSnapshot(
        memoizedDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          if (!isSubscribed) return;

          if (snapshot.exists()) {
            setData({ ...(snapshot.data() as T), id: snapshot.id });
          } else {
            setData(null);
          }
          setError(null);
          setIsLoading(false);
        },
        (err: FirestoreError) => {
          if (!isSubscribed) return;

          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          });

          setError(contextualError);
          setData(null);
          setIsLoading(false);

          // trigger global error propagation
          errorEmitter.emit('permission-error', contextualError);
        }
      );
    } catch (syncError: any) {
      // 4. Graceful handling of internal listener failures
      if (isSubscribed) {
        console.warn('Firestore onSnapshot (doc) failed to initialize:', syncError.message);
        setIsLoading(false);
      }
    }

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
