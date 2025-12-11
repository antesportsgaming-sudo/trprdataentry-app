

import { db } from '../firebase';
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

// Collection References
const FACULTY_COLLECTION = 'faculties';

// Helper to check if error is just connection issue
const isOfflineError = (error: any) => {
    const msg = error?.message || '';
    const code = error?.code || '';
    return msg.includes('offline') || code.includes('unavailable');
};

// Helper for High-Speed Concurrency (Pool Pattern)
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
        await setDoc(docRef, { letterSettings: settings }, { merge: true });
    } catch (error) {
        console.error("Error saving faculty settings:", error);
        throw error;
    }
};

export const saveCurrentExamConfig = async (facultyId: string, examName: string, sessionYears: string[]) => {
    try {
        const docRef = doc(db, FACULTY_COLLECTION, facultyId);
        await setDoc(docRef, { currentExamName: examName, sessionYears }, { merge: true });
    } catch (error) {
        console.error("Error saving exam config:", error);
    }
};

export const saveAllowedFaculties = async (allowedIds: string[]) => {
    try {
        const docRef = doc(db, 'config', 'global_access');
        await setDoc(docRef, { allowedIds }, { merge: true });
    } catch (error) {
        console.error("Error saving allowed faculties:", error);
        throw error;
    }
};

export const fetchAllowedFaculties = async (): Promise<string[]> => {
    try {
        const docRef = doc(db, 'config', 'global_access');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data().allowedIds || ['medical'];
        }
        return ['medical'];
    } catch (error) {
        // Silently default to medical if offline
        return ['medical'];
    }
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
    await setDoc(studentRef, data);
};

export const updateStudentInDB = async (facultyId: string, student: StudentEntry) => {
    const { id, ...data } = student;
    const studentRef = doc(db, FACULTY_COLLECTION, facultyId, 'students', id);
    await updateDoc(studentRef, data as any);
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
    const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'master_records');
    // Using Max Batch Size (500)
    const BATCH_SIZE = 500;
    const chunks = chunkArray(records, BATCH_SIZE);
    
    console.log(`Starting SUPER-FAST upload of ${records.length} records in ${chunks.length} chunks...`);

    let processedCount = 0;

    // Helper to upload a single chunk
    const processChunk = async (chunk: MasterRecord[]) => {
        const batch = writeBatch(db);
        let batchHasOps = false;

        chunk.forEach(record => {
            const rawSeatNo = String(record.seatNo || '');
            const safeId = sanitizeDocId(rawSeatNo);
            
            if (safeId && safeId.length > 0) {
                const docRef = doc(collectionRef, safeId); 
                batch.set(docRef, record);
                batchHasOps = true;
            }
        });

        if (batchHasOps) {
            try {
                await batch.commit();
            } catch (e) {
                console.error("Batch commit failed:", e);
                // Retrying once might be useful in poor networks, but keep it simple for speed
                throw e;
            }
        }
        
        processedCount += chunk.length;
        if (onProgress) {
            onProgress(Math.min(processedCount, records.length), records.length);
        }
    };

    // PERFORMANCE UPGRADE: High Concurrency (25 Parallel Batches)
    const CONCURRENCY_LIMIT = 25;
    await processInPool(chunks, CONCURRENCY_LIMIT, processChunk);
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

export const uploadAddressesBatch = async (
    facultyId: string, 
    records: CollegeAddressRecord[],
    onProgress?: (processed: number, total: number) => void
) => {
    const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'college_addresses');
    const BATCH_SIZE = 500;
    const chunks = chunkArray(records, BATCH_SIZE);
    
    let processedCount = 0;

    const processChunk = async (chunk: CollegeAddressRecord[]) => {
        const batch = writeBatch(db);
        let batchHasOps = false;

        chunk.forEach(record => {
            const rawCode = String(record.collegeCode || '');
            const safeId = sanitizeDocId(rawCode);
            if (safeId && safeId.length > 0) {
                const docRef = doc(collectionRef, safeId);
                batch.set(docRef, record);
                batchHasOps = true;
            }
        });

        if (batchHasOps) {
             await batch.commit();
        }
        processedCount += chunk.length;
        if (onProgress) {
            onProgress(Math.min(processedCount, records.length), records.length);
        }
    };

    // High Concurrency
    await processInPool(chunks, 25, processChunk);
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

// --- JSON Restore / Backup ---

export const fetchAllStudentsForBackup = async (facultyId: string): Promise<StudentEntry[]> => {
     try {
        const studentsRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
        const snapshot = await getDocs(studentsRef);
        return snapshot.docs.map(doc => doc.data() as StudentEntry);
     } catch (error) {
         console.error("Backup Fetch Error", error);
         throw error;
     }
}

export const restoreBackupBatch = async (
    facultyId: string, 
    students: StudentEntry[],
    onProgress?: (processed: number, total: number) => void
) => {
    const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
    const BATCH_SIZE = 500; 
    const chunks = chunkArray(students, BATCH_SIZE);
    
    let processedCount = 0;

    const processChunk = async (chunk: StudentEntry[]) => {
        const batch = writeBatch(db);
        chunk.forEach(record => {
            // Ensure ID exists
            if (!record.id) record.id = crypto.randomUUID();
            const docRef = doc(collectionRef, record.id);
            batch.set(docRef, record);
        });
        await batch.commit();
        processedCount += chunk.length;
        if (onProgress) onProgress(processedCount, students.length);
    };

    // Very High Concurrency for Restore (25)
    await processInPool(chunks, 25, processChunk);
};

// --- Archives ---

export const archiveCurrentSession = async (facultyId: string, archiveData: ArchivedSession, nextExamName: string) => {
    const batch = writeBatch(db);
    
    // 1. Save Archive
    const archiveRef = doc(db, FACULTY_COLLECTION, facultyId, 'archives', archiveData.id);
    batch.set(archiveRef, archiveData);

    // 2. Update Current Exam Name
    const facultyRef = doc(db, FACULTY_COLLECTION, facultyId);
    batch.update(facultyRef, { currentExamName: nextExamName });

    await batch.commit();

    // 3. Delete current students
    try {
        const studentsRef = collection(db, FACULTY_COLLECTION, facultyId, 'students');
        const snapshot = await getDocs(studentsRef);
        
        // Fast Deletion
        const BATCH_SIZE = 500;
        const chunks = chunkArray(snapshot.docs, BATCH_SIZE);
        
        const processDeleteChunk = async (chunk: any[]) => {
             const delBatch = writeBatch(db);
             chunk.forEach((d) => delBatch.delete(d.ref));
             await delBatch.commit();
        };

        await processInPool(chunks, 25, processDeleteChunk);

    } catch (error) {
        console.error("Error clearing students for archive:", error);
        // Continue flow, data is at least archived.
    }
};

export const fetchArchivesDB = async (facultyId: string): Promise<ArchivedSession[]> => {
    try {
        const collectionRef = collection(db, FACULTY_COLLECTION, facultyId, 'archives');
        const snapshot = await getDocs(collectionRef);
        return snapshot.docs.map(doc => doc.data() as ArchivedSession);
    } catch (error) {
        if (!isOfflineError(error)) console.warn("Error fetching archives:", error);
        return [];
    }
};
