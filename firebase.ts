
import { 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    writeBatch, 
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { StudentEntry, MasterRecord, CollegeAddressRecord, LetterSettings, ArchivedSession } from '../types';
import { SUBJECT_CONFIG } from './constants';

// Collection References
const FACULTY_COLLECTION = 'faculties';

// Helper to check if error is just connection issue
export const isOfflineError = (error: any) => {
    const msg = error?.message || '';
    const code = error?.code || '';
    return msg.includes('offline') || code.includes('unavailable');
};

// Helper: Remove undefined values (Firestore rejects undefined)
const cleanData = (data: any) => {
    return JSON.parse(JSON.stringify(data));
};

// Helper for High-Speed Concurrency (Pool Pattern)
// This prevents the browser from freezing by limiting active requests
const processInPool = async <T>(
    items: T[], 
    concurrency: number, 
    processItem: (item: T) => Promise<void>
) => {
    const queue = [...items];
    const workers = [];
    const workerCount = Math.min(concurrency, items.length);

    for (let i = 0; i < workerCount; i++) {
        workers.push((async () => {
            while (queue.length > 0) {
                const item = queue.shift();
                if (item) await processItem(item);
            }
        })());
    }
    await Promise.all(workers);
};

// --- Global/Settings Operations ---

export const fetchFacultySettings = async (facultyId: string) => {
    try {
        const docRef = doc(db, FACULTY_COLLECTION, facultyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        if (!isOfflineError(error)) {
             console.warn("Error fetching faculty settings:", error);
        }
        return null;
    }
};

export const saveFacultySettings = async (facultyId: string, settings: Partial<LetterSettings>) => {
    try {
        const docRef = doc(db, FACULTY_COLLECTION, facultyId);
        // Clean settings to remove undefined
        await setDoc(docRef, { letterSettings: cleanData(settings) }, { merge: true });
    } catch (error) {
        console.error("Error saving faculty settings:", error);
        throw error;
    }
};

export const saveCurrentExamConfig = async (facultyId: string, examName: string, sessionYears: string[], examList?: string[]) => {
    try {
        const docRef = doc(db, FACULTY_COLLECTION, facultyId, 'config');
        const data: any = { currentExamName: examName, sessionYears };
        if (examList) {
            data.examList = examList;
        }
        await setDoc(docRef, cleanData(data), { merge: true });
    } catch (error) {
        console.error("Error saving exam config:", error);
    }
};

// --- Access & Password Control ---

export const fetchAccessConfig = async () => {
    try {
        const docRef = doc(db, 'config', 'global_access');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                allowedIds: data.allowedIds || ['medical'],
                passwords: data.passwords || {}
            };
        }
        return { allowedIds: ['medical'], passwords: {} };
    } catch (error) {
        // Silently default to medical if offline
        if (!isOfflineError(error)) {
            console.warn("Error fetching access config:", error);
        }
        return { allowedIds: ['medical'], passwords: {} };
    }
};

export const saveAccessConfig = async (allowedIds: string[], passwords: Record<string, string>) => {
    try {
        const docRef = doc(db, 'config', 'global_access');
        await setDoc(docRef, cleanData({ allowedIds, passwords }), { merge: true });
    } catch (error) {
        console.error("Error saving access config:", error);
        throw error;
    }
};

// Deprecated: kept for backward compatibility if imported elsewhere, but directs to new config
export const saveAllowedFaculties = async (allowedIds: string[]) => {
    try {
        const docRef = doc(db, 'config', 'global_access');
        await setDoc(docRef, cleanData({ allowedIds }), { merge: true });
    } catch (error) {
        console.error("Error saving allowed faculties:", error);
        throw error;
    }
};

export const fetchAllowedFaculties = async (): Promise<string[]> => {
    const config = await fetchAccessConfig();
    return config.allowedIds;
};

// --- Student Operations ---

export const subscribeToStudents = (facultyId: string, onUpdate: (data: StudentEntry[]) => void) => {
    const studentsRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
    
    return onSnapshot(studentsRef, (snapshot) => {
        const students: StudentEntry[] = [];
        snapshot.forEach((doc) => {
            students.push({ ...doc.data(), id: doc.id } as StudentEntry);
        });
        onUpdate(students);
    }, (error) => {
        if (!isOfflineError(error)) {
            console.error("Error subscribing to students:", error);
        }
        // CRITICAL: Call onUpdate with empty array so App.tsx turns off isLoading.
        onUpdate([]); 
    });
};

export const addStudentToDB = async (facultyId: string, student: StudentEntry) => {
    const { id, ...data } = student;
    const studentRef = doc(db, FACULTY_COLLECTION, facultyId, 'students', id);
    // Sanitize data before saving
    await setDoc(studentRef, cleanData(data));
};

export const updateStudentInDB = async (facultyId: string, student: StudentEntry) => {
    const { id, ...data } = student;
    const studentRef = doc(db, FACULTY_COLLECTION, facultyId, 'students', id);
    // Sanitize data before saving
    await updateDoc(studentRef, cleanData(data));
};

export const deleteStudentFromDB = async (facultyId: string, studentId: string) => {
    const studentRef = doc(db, FACULTY_COLLECTION, facultyId, 'students', studentId);
    await deleteDoc(studentRef);
};

// --- Bulk Data Operations (Master & Addresses) ---

const chunkArray = <T>(array: T[], size: number): T[][] => {
    const chunked_arr = [];
    let index = 0;
    while (index < array.length) {
        chunked_arr.push(array.slice(index, size + index));
        index += size;
    }
    return chunked_arr;
};

// Helper to clean document IDs for Firestore
// Firestore IDs cannot contain / . # $ [ ]
const sanitizeDocId = (id: string): string => {
    return id.replace(/[.\/#$\[\]\\]/g, '_').trim();
};

export const uploadMasterRecordsBatch = async (
  facultyId: string,
  records: MasterRecord[],
  onProgress?: (processed: number, total: number) => void
) => {
  if (onProgress) onProgress(0, records.length);

  const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'master_records');
  const BATCH_SIZE = 300;
  const chunks = chunkArray(records, BATCH_SIZE);

  let processedCount = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    let operationCount = 0;

    chunk.forEach(record => {
      const rawSeatNo = String(record.seatNo || '');
      const safeId = sanitizeDocId(rawSeatNo);

      if (safeId && safeId.length > 0) {
        // Use cleanData to avoid undefined fields
        batch.set(
          doc(collectionRef, safeId),
          cleanData(record)
        );
        operationCount++;
      }
    });

    // CRITICAL FIX: Only commit if operations exist to prevent "Empty Batch" error
    if (operationCount > 0) {
        await batch.commit();
    }

    processedCount += chunk.length;

    if (onProgress) {
      onProgress(
        Math.min(processedCount, records.length),
        records.length
      );
      // 🔑 React UI repaint allow
      await new Promise(r => setTimeout(r, 0));
    }
  }
};

export const fetchMasterRecordsDB = async (facultyId: string): Promise<MasterRecord[]> => {
    try {
        const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'master_records');
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => doc.data() as MasterRecord);
    } catch (error) {
        if (!isOfflineError(error)) console.warn("Error fetching master records:", error);
        return [];
    }
};

export const fetchAddressesDB = async (facultyId: string): Promise<CollegeAddressRecord[]> => {
    try {
        const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'college_addresses');
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => doc.data() as CollegeAddressRecord);
    } catch (error) {
        if (!isOfflineError(error)) console.warn("Error fetching addresses:", error);
        return [];
    }
};

export const uploadAddressesBatch = async (
  facultyId: string,
  records: CollegeAddressRecord[],
  onProgress?: (processed: number, total: number) => void
) => {
  if (onProgress) onProgress(0, records.length);

  const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'college_addresses');
  const BATCH_SIZE = 300;
  const chunks = chunkArray(records, BATCH_SIZE);

  let processedCount = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    let operationCount = 0;

    chunk.forEach(record => {
      const rawCode = String(record.collegeCode || '');
      const safeId = sanitizeDocId(rawCode);

      if (safeId && safeId.length > 0) {
        batch.set(
          doc(collectionRef, safeId),
          cleanData(record),
          { merge: true }
        );
        operationCount++;
      }
    });

    if (operationCount > 0) {
        await batch.commit();
    }

    processedCount += chunk.length;

    if (onProgress) {
      onProgress(
        Math.min(processedCount, records.length),
        records.length
      );
      // ⬇️ UI ला repaint ची chance
      await new Promise(r => setTimeout(r, 0));
    }
  }
};

// --- Archive Operations ---

export const fetchArchivesDB = async (facultyId: string): Promise<ArchivedSession[]> => {
    try {
        const archivesRef = collection(db, FACULTY_COLLECTION, facultyId, 'archives');
        const snapshot = await getDocs(archivesRef);
        return snapshot.docs.map(doc => doc.data() as ArchivedSession);
    } catch (error) {
        if (!isOfflineError(error)) console.warn("Error fetching archives:", error);
        return [];
    }
};

export const archiveCurrentSession = async (facultyId: string, archiveData: ArchivedSession, newExamName: string) => {
    // 1. Save to Archives Collection
    const archiveRef = doc(db, FACULTY_COLLECTION, facultyId, 'archives', archiveData.id);
    await setDoc(archiveRef, cleanData(archiveData));

    // 2. Delete all current students (Batch delete)
    const studentsRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
    const snapshot = await getDocs(studentsRef);
    
    const chunks = chunkArray(snapshot.docs, 500); // Delete can be max 500
    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(docSnap => {
            batch.delete((docSnap as any).ref);
        });
        await batch.commit();
    }

    // 3. Update Current Exam Config
    // When archiving, we reset the exam list to just the new one
    const defaultYears = SUBJECT_CONFIG.map(c => c.year);
    const newExamList = [newExamName];
    await saveCurrentExamConfig(facultyId, newExamName, defaultYears, newExamList);
};

// --- Backup & Restore Operations ---

export const fetchAllStudentsForBackup = async (facultyId: string) => {
    const studentsRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
    const snapshot = await getDocs(studentsRef);
    return snapshot.docs.map(doc => doc.data());
};

export const restoreBackupBatch = async (
  facultyId: string,
  students: any[],
  onProgress?: (processed: number, total: number) => void
) => {
  if (onProgress) onProgress(0, students.length);

  const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
  const BATCH_SIZE = 300;
  const chunks = chunkArray(students, BATCH_SIZE);

  let processedCount = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    let operationCount = 0;

    chunk.forEach(student => {
      const id = student.id || crypto.randomUUID();
      if (id) {
          batch.set(
            doc(collectionRef, id),
            cleanData({ ...student, id })
          );
          operationCount++;
      }
    });

    if (operationCount > 0) {
        await batch.commit();
    }

    processedCount += chunk.length;

    if (onProgress) {
      onProgress(
        Math.min(processedCount, students.length),
        students.length
      );
      // ⬇️ UI repaint allow
      await new Promise(r => setTimeout(r, 0));
    }
  }
};
