
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { MasterRecord, CollegeAddressRecord, LetterSettings, FacultyUser, ArchivedSession, StudentEntry } from '../types';
import { FACULTIES, SUBJECT_CONFIG, createEmptyStudent } from '../constants';
import { Upload, Database, CheckCircle, AlertCircle, FileSpreadsheet, MapPin, Settings, Save, Users, Lock, Archive, RefreshCw, Eye, PenTool, CheckSquare, Square, UploadCloud, Mail, Download, FileJson, ArrowRightCircle, Clock, Clipboard, CheckCircle2, Plus, X, Key, Image } from 'lucide-react';
import { 
    uploadMasterRecordsBatch, 
    uploadAddressesBatch, 
    fetchAccessConfig,
    saveAccessConfig,
    fetchAllStudentsForBackup,
    restoreBackupBatch
} from '../services/firestore';

interface AdminPanelProps {
  onDataLoaded: (data: MasterRecord[]) => void;
  onAddressDataLoaded: (data: CollegeAddressRecord[]) => void;
  onSettingsSaved: (settings: LetterSettings) => void;
  currentRecordCount: number;
  currentAddressCount: number;
  currentSettings: LetterSettings;
  currentUser: FacultyUser;
  // Archive Props
  currentExamName: string;
  currentSessionYears: string[];
  onUpdateSessionYears: (years: string[]) => void;
  archives: ArchivedSession[];
  onArchiveAndReset: (newExamName: string) => void;
  onRestoreArchive: (session: ArchivedSession) => void;
  // New Props for Multiple Exams
  examList?: string[];
  onUpdateExamList?: (list: string[]) => void;
  onSelectExam?: (name: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    onDataLoaded, 
    onAddressDataLoaded, 
    onSettingsSaved, 
    currentRecordCount, 
    currentAddressCount,
    currentSettings,
    currentUser,
    currentExamName,
    currentSessionYears,
    onUpdateSessionYears,
    archives,
    onArchiveAndReset,
    onRestoreArchive,
    examList = [],
    onUpdateExamList,
    onSelectExam
}) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'ADDRESS' | 'SETTINGS' | 'ACCESS' | 'SESSION'>('MASTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ processed: 0, total: 0 }); // New State for Live Count
  
  // Paste Data State
  const [pasteData, setPasteData] = useState('');
  
  // Timer State
  const [estimatedTime, setEstimatedTime] = useState<string>('Calculating...');
  
  // Settings State
  const [settingsForm, setSettingsForm] = useState<LetterSettings>(currentSettings);

  // Access Control State
  const [allowedFaculties, setAllowedFaculties] = useState<string[]>(['medical']);
  const [passwords, setPasswords] = useState<Record<string, string>>({});

  // Session State
  const [nextExamName, setNextExamName] = useState('SUMMER-2025_PHASE-IV');

  // Define Admin User Check
  const isAdminUser = currentUser.id === 'medical';

  // Update form if props change
  useEffect(() => {
    setSettingsForm(currentSettings);
  }, [currentSettings]);

  // Load permissions from Firestore
  useEffect(() => {
      const loadPermissions = async () => {
          try {
              const config = await fetchAccessConfig();
              setAllowedFaculties(config.allowedIds);
              setPasswords(config.passwords);
          } catch (e) {
              console.error("Failed to load permissions", e);
          }
      };
      if (isAdminUser) {
          loadPermissions();
      }
  }, [isAdminUser]);

  const resetStatus = () => {
    setLoading(false);
    setError(null);
    setSuccessMsg(null);
    setPreviewData([]);
    setUploadProgress(0);
    setUploadStats({ processed: 0, total: 0 });
    setEstimatedTime('');
    setPasteData('');
  };

  const handleTabChange = (tab: 'MASTER' | 'ADDRESS' | 'SETTINGS' | 'ACCESS' | 'SESSION') => {
    setActiveTab(tab);
    resetStatus();
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setSettingsForm(prev => ({
          ...prev,
          [name]: value
      }));
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            setSettingsForm(prev => ({
                ...prev,
                signatureImage: ev.target?.result as string
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveSignature = () => {
    setSettingsForm(prev => ({
        ...prev,
        signatureImage: ''
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            setSettingsForm(prev => ({
                ...prev,
                universityLogo: ev.target?.result as string
            }));
        };
        reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettingsForm(prev => ({
        ...prev,
        universityLogo: ''
    }));
  };

  const handleSaveSettings = () => {
      onSettingsSaved(settingsForm);
      setSuccessMsg("Letter configuration saved to cloud successfully.");
      setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Specific handler just for email keys to reassure user
  const handleSaveEmailKeys = () => {
      onSettingsSaved(settingsForm);
      setSuccessMsg("✅ Email Keys Saved Permanently for Medical Faculty.");
      setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleTogglePermission = (facultyId: string) => {
      if (facultyId === 'medical') return; // Cannot disable self
      setAllowedFaculties(prev => {
          if (prev.includes(facultyId)) {
              return prev.filter(id => id !== facultyId);
          } else {
              return [...prev, facultyId];
          }
      });
  };

  const handlePasswordChange = (facultyId: string, val: string) => {
      setPasswords(prev => ({
          ...prev,
          [facultyId]: val
      }));
  };

  const handleSavePermissions = async () => {
      try {
        await saveAccessConfig(allowedFaculties, passwords);
        setSuccessMsg("Permissions & Passwords updated successfully.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (e) {
          setError("Failed to save configuration.");
      }
  };

  const handleToggleSessionYear = (yearName: string) => {
    let newYears;
    if (currentSessionYears.includes(yearName)) {
        newYears = currentSessionYears.filter(y => y !== yearName);
    } else {
        newYears = [...currentSessionYears, yearName];
    }
    onUpdateSessionYears(newYears);
  };

  const handleStartNewSession = () => {
    if (!nextExamName.trim()) {
        setError("Please enter a name for the New Exam Session.");
        return;
    }
    if (confirm(`ARE YOU SURE?\n\nThis will ARCHIVE all current student data under "${currentExamName}" and start a FRESH session for "${nextExamName}".\n\nCurrent data will be moved to the Archive list in the Cloud.`)) {
        onArchiveAndReset(nextExamName);
        setSuccessMsg(`Session archived. Started fresh session for ${nextExamName}`);
    }
  };

  // --- Exam Tabs Handlers ---
  const handleAddExamTab = () => {
      const name = prompt("Enter New Exam Name (e.g. WINTER-2025_PHASE-I):");
      if (name && name.trim()) {
          const newList = [...examList, name.trim()];
          if (onUpdateExamList) onUpdateExamList(newList);
          if (onSelectExam) onSelectExam(name.trim()); // Switch to it
      }
  };

  const handleDeleteExamTab = (e: React.MouseEvent, nameToDelete: string) => {
      e.stopPropagation(); // Prevent selection
      if (!confirm(`Remove "${nameToDelete}" from the list? Data will not be deleted, but the tab will vanish.`)) return;
      
      const newList = examList.filter(n => n !== nameToDelete);
      if (onUpdateExamList) onUpdateExamList(newList);
      
      // If we deleted the active one, select the first one available
      if (currentExamName === nameToDelete && newList.length > 0 && onSelectExam) {
          onSelectExam(newList[0]);
      }
  };

  // --- Helper: Time Formatter ---
  const formatTime = (seconds: number) => {
      if (seconds < 0) return "Finishing...";
      if (seconds < 60) return `${seconds} Sec remaining`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins} Min ${secs} Sec remaining`;
  };

  // --- Helper: Progress & Time Calculator Callback ---
  const createProgressCallback = (startTime: number) => {
      return (processed: number, total: number) => {
          // 1. Update Percentage
          const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
          setUploadProgress(pct);
          setUploadStats({ processed, total }); // LIVE COUNT UPDATE

          // 2. Calculate Time Remaining
          const now = Date.now();
          const elapsedSeconds = (now - startTime) / 1000;
          
          if (processed > 0 && elapsedSeconds > 0) {
              const recordsPerSecond = processed / elapsedSeconds;
              const remainingRecords = total - processed;
              
              if (remainingRecords <= 0) {
                  setEstimatedTime("Finishing up...");
              } else {
                  const secondsRemaining = Math.round(remainingRecords / recordsPerSecond);
                  setEstimatedTime(formatTime(secondsRemaining));
              }
          }
      };
  };

  // --- JSON Backup & Restore ---
  const handleBackupData = async () => {
      setLoading(true);
      try {
          const allData = await fetchAllStudentsForBackup(currentUser.id);
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData));
          const downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", `Backup_${currentExamName}_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(downloadAnchorNode); // required for firefox
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
          setSuccessMsg(`Backup downloaded successfully! (${allData.length} records)`);
      } catch (e: any) {
          setError("Backup Failed: " + e.message);
      } finally {
          setLoading(false);
      }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          setLoading(true); // Immediate UI feedback
          setUploadProgress(0);
          setUploadStats({ processed: 0, total: 0 });
          setEstimatedTime('Calculating...');
          setError(null);
          
          // Use setTimeout to allow UI to render the loading state before heavy processing
          setTimeout(async () => {
              try {
                  const jsonStr = event.target?.result as string;
                  const data = JSON.parse(jsonStr);
                  if (!Array.isArray(data)) throw new Error("Invalid JSON format. Expected an array.");
                  
                  // LIVE COUNT INIT
                  setUploadStats({ processed: 0, total: data.length });

                  const startTime = Date.now();
                  await restoreBackupBatch(currentUser.id, data, createProgressCallback(startTime));
                  
                  setSuccessMsg(`✅ DONE! ${data.length} records restored. (सर्व डेटा परत आला आहे.)`);
              } catch (e: any) {
                  if (e.code === 'permission-denied') {
                      setError("Permission Denied: Database is locked. Check Firestore Rules.");
                  } else {
                      setError("Restore Failed: " + e.message);
                  }
              } finally {
                  setLoading(false);
              }
          }, 50);
      };
      reader.readAsText(file);
  };

  // Helper to find value case-insensitively/loosely
  const getFlexibleValue = (row: any, keys: string[]) => {
    // 1. Exact match
    for (const key of keys) {
        if (row[key] !== undefined) return row[key];
    }
    // 2. Case-insensitive match against row keys
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        const foundKey = rowKeys.find(rk => rk.toLowerCase().trim() === key.toLowerCase().trim());
        if (foundKey) return row[foundKey];
    }
    return '';
  };

  // --- Import Excel directly to StudentEntry ---
  const handleImportExcelToSession = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const inputElement = e.target;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        setLoading(true);
        setUploadProgress(0);
        setUploadStats({ processed: 0, total: 0 });
        setEstimatedTime('Calculating...');
        setError(null);
        setSuccessMsg(null);

        // Async wrapper to prevent UI freeze during parsing
        setTimeout(async () => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                if (!jsonData || jsonData.length === 0) {
                    throw new Error("Excel file is empty. (फाईल रिकामी आहे)");
                }

                // Convert Excel Row -> StudentEntry
                const studentsToUpload: StudentEntry[] = jsonData.map((row: any) => {
                    const base = createEmptyStudent();
                    base.seatNo = String(getFlexibleValue(row, ['Seat No', 'seat_no', 'SEAT NO', 'Seat_No', 'SeatNo']) || '').trim();
                    base.studentName = String(getFlexibleValue(row, ['Student Name', 'student_name', 'NAME', 'Student_Name', 'StudentName', 'Name']) || '').trim();
                    base.collegeCode = String(getFlexibleValue(row, ['College Code', 'college_code', 'CODE', 'College_Code', 'CollegeCode', 'C_Code']) || '').trim();
                    base.collegeName = String(getFlexibleValue(row, ['College Name', 'college_name', 'COLLEGE', 'College_Name', 'CollegeName']) || '').trim();
                    
                    // Optional: Try to read other fields if present in Excel
                    base.inwardNo = String(getFlexibleValue(row, ['Inward No', 'inward_no']) || '');
                    // Ensure ID is unique
                    base.id = crypto.randomUUID();
                    return base;
                }).filter((s: StudentEntry) => s.seatNo && s.studentName); // Filter invalid

                if (studentsToUpload.length === 0) {
                    const firstRowKeys = Object.keys(jsonData[0] as object).join(', ');
                    throw new Error(`
                        No valid data found. 
                        
                        Expected columns: 'Seat No', 'Student Name'. 
                        Found columns: [${firstRowKeys}].
                        
                        Please Rename columns in Excel.
                    `);
                }

                // LIVE COUNT INIT
                setUploadStats({ processed: 0, total: studentsToUpload.length });

                // Use the Restore function because it does exactly what we want: Bulk Upload StudentEntry[]
                const startTime = Date.now();
                await restoreBackupBatch(currentUser.id, studentsToUpload, createProgressCallback(startTime));

                setSuccessMsg(`✅ DONE! Imported ${studentsToUpload.length} students from Excel.`);

            } catch (err: any) {
                console.error("Import Error:", err);
                if (err.code === 'permission-denied') {
                    setError("Permission Error: Cannot write to Database. Please check Firebase Rules.");
                } else {
                    setError(`Import Failed: ${err.message}`);
                }
            } finally {
                setLoading(false);
                if (inputElement) inputElement.value = '';
            }
        }, 50);
      };
      reader.readAsArrayBuffer(file);
  };

  const handleMasterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLoading(true);
      setUploadProgress(0);
      setUploadStats({ processed: 0, total: 0 });
      setEstimatedTime('Calculating...');
      setError(null);
      setSuccessMsg(null);

      // Async wrapper
      setTimeout(async () => {
        try {
            const data = event.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            
            // Normalize Data with stricter safe check
            const normalizedData: MasterRecord[] = jsonData.map((row: any) => ({
            seatNo: String(getFlexibleValue(row, ['Seat No', 'seat_no', 'SEAT NO', 'Seat_No', 'SeatNo', 'Seat Number', 'Seat No.']) || '').trim(),
            studentName: String(getFlexibleValue(row, ['Student Name', 'student_name', 'NAME', 'Student_Name', 'StudentName', 'Name', 'Student Name']) || '').trim(),
            collegeCode: String(getFlexibleValue(row, ['College Code', 'college_code', 'CODE', 'College_Code', 'CollegeCode', 'C_Code']) || '').trim(),
            collegeName: String(getFlexibleValue(row, ['College Name', 'college_name', 'COLLEGE', 'College_Name', 'CollegeName', 'Name of College']) || '').trim()
            })).filter(r => r.seatNo && r.studentName);

            if (normalizedData.length === 0) {
                const firstRowKeys = jsonData.length > 0 ? Object.keys(jsonData[0] as object).join(', ') : 'Empty File';
                setError(`No valid records. Excel must have 'Seat No' and 'Student Name'. Found: [${firstRowKeys}]`);
            } else {
            // LIVE COUNT INIT
            setUploadStats({ processed: 0, total: normalizedData.length });

            // Upload to Firestore
            const startTime = Date.now();
            await uploadMasterRecordsBatch(currentUser.id, normalizedData, createProgressCallback(startTime));
            
            setPreviewData(normalizedData);
            onDataLoaded(normalizedData); // Update local state for immediate feedback
            setSuccessMsg(`✅ DONE! Successfully uploaded ${normalizedData.length} student records.`);
            }
        } catch (err: any) {
            console.error("Master Upload Error:", err);
            if (err.code === 'permission-denied') {
                setError("Permission Error: Cannot write to Database.");
            } else {
                setError(`Upload Failed (अपलोड अयशस्वी). Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
            if (inputElement) inputElement.value = ''; // Reset input
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  const handlePasteMasterData = () => {
      if (!pasteData.trim()) return;
      
      setLoading(true);
      setUploadProgress(0);
      setUploadStats({ processed: 0, total: 0 });
      setEstimatedTime('Calculating...');
      setError(null);
      setSuccessMsg(null);

      // Async wrapper
      setTimeout(async () => {
        try {
            const rawRows = pasteData.trim().split(/\r?\n/); // Handle CR LF
            if (rawRows.length < 2) {
                throw new Error("Data too short. Please include headers in the first row.");
            }

            const headers = rawRows[0].split('\t').map(h => h.trim());
            const dataRows = rawRows.slice(1);

            const jsonData = dataRows.map(rowStr => {
                const cells = rowStr.split('\t');
                const obj: any = {};
                headers.forEach((h, i) => {
                    if (cells[i] !== undefined) obj[h] = cells[i].trim();
                });
                return obj;
            });
            
             // Normalize Data
            const normalizedData: MasterRecord[] = jsonData.map((row: any) => ({
                seatNo: String(getFlexibleValue(row, ['Seat No', 'seat_no', 'SEAT NO', 'Seat_No', 'SeatNo', 'Seat Number', 'Seat No.']) || '').trim(),
                studentName: String(getFlexibleValue(row, ['Student Name', 'student_name', 'NAME', 'Student_Name', 'StudentName', 'Name', 'Student Name']) || '').trim(),
                collegeCode: String(getFlexibleValue(row, ['College Code', 'college_code', 'CODE', 'College_Code', 'CollegeCode', 'C_Code']) || '').trim(),
                collegeName: String(getFlexibleValue(row, ['College Name', 'college_name', 'COLLEGE', 'College_Name', 'CollegeName', 'Name of College']) || '').trim()
            })).filter(r => r.seatNo && r.studentName);

            if (normalizedData.length === 0) {
                 setError(`No valid records parsed. Ensure headers (Seat No, Student Name) are correct.`);
            } else {
                 // LIVE COUNT INIT
                 setUploadStats({ processed: 0, total: normalizedData.length });

                 const startTime = Date.now();
                 await uploadMasterRecordsBatch(currentUser.id, normalizedData, createProgressCallback(startTime));
                 
                 setPreviewData(normalizedData);
                 onDataLoaded(normalizedData);
                 setSuccessMsg(`✅ DONE! Successfully processed and uploaded ${normalizedData.length} records.`);
                 setPasteData('');
            }

        } catch (err: any) {
            console.error("Paste Error:", err);
             setError(`Paste Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
      }, 50);
  };

  const handleAddressFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const inputElement = e.target;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          setLoading(true);
          setUploadProgress(0);
          setUploadStats({ processed: 0, total: 0 });
          setEstimatedTime('Calculating...');
          setError(null);
          setSuccessMsg(null);

          setTimeout(async () => {
              try {
                  const data = event.target?.result;
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const jsonData = XLSX.utils.sheet_to_json(sheet);
                  
                  const normalizedData: CollegeAddressRecord[] = jsonData.map((row: any) => ({
                      collegeCode: String(getFlexibleValue(row, ['College Code', 'college_code', 'code']) || '').trim(),
                      address: String(getFlexibleValue(row, ['Address', 'address', 'addr']) || '').trim(),
                      email: String(getFlexibleValue(row, ['Email', 'email', 'E-mail']) || '').trim()
                  })).filter(r => r.collegeCode && r.address);
                  
                  if (normalizedData.length === 0) {
                      throw new Error("No valid address records found. Need 'College Code' and 'Address'.");
                  }

                  // LIVE COUNT INIT
                  setUploadStats({ processed: 0, total: normalizedData.length });

                  const startTime = Date.now();
                  await uploadAddressesBatch(currentUser.id, normalizedData, createProgressCallback(startTime));
                  
                  onAddressDataLoaded(normalizedData);
                  setSuccessMsg(`✅ DONE! Updated ${normalizedData.length} addresses.`);
              } catch (err: any) {
                  setError(`Address Upload Failed: ${err.message}`);
              } finally {
                  setLoading(false);
                  if (inputElement) inputElement.value = '';
              }
          }, 50);
      };
      reader.readAsArrayBuffer(file);
  };

  // --- Render Functions ---

  const renderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
      <button 
        onClick={() => handleTabChange('MASTER')} 
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'MASTER' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        <Database size={16} /> Student Data
      </button>
      <button 
        onClick={() => handleTabChange('ADDRESS')} 
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ADDRESS' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        <MapPin size={16} /> College Addresses
      </button>
      <button 
        onClick={() => handleTabChange('SETTINGS')} 
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'SETTINGS' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        <Settings size={16} /> Configuration
      </button>
      <button 
        onClick={() => handleTabChange('SESSION')} 
        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'SESSION' ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
      >
        <Archive size={16} /> Session & Exam
      </button>
      {isAdminUser && (
          <button 
            onClick={() => handleTabChange('ACCESS')} 
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'ACCESS' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
          >
            <Lock size={16} /> Access Control
          </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-200 text-blue-600">
                <Settings size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
                <p className="text-sm text-gray-500">Manage master data, settings, and system configuration</p>
            </div>
        </div>

        {renderTabs()}

        {/* Status Messages */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
                <RefreshCw className="animate-spin" size={20} />
                Processing Request... {estimatedTime && <span className="text-sm bg-blue-200 px-2 py-0.5 rounded-full text-blue-800">{estimatedTime}</span>}
            </div>
            
            {/* Progress Bar with Live Counter */}
            <div className="w-full bg-blue-200 rounded-full h-4 mt-1 relative overflow-hidden">
                <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                    style={{ width: `${uploadProgress}%` }}
                >
                    {uploadProgress > 5 && `${uploadProgress}%`}
                </div>
            </div>
            <div className="text-xs text-blue-600 font-mono text-center">
                 Processed: {uploadStats.processed} / {uploadStats.total} records
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={20} />
            <span className="font-medium whitespace-pre-wrap">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2 animate-pulse">
            <CheckCircle size={20} />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* MASTER DATA TAB */}
        {activeTab === 'MASTER' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stats Card */}
             <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-blue-100 font-medium mb-1">Total Master Records</p>
                        <h2 className="text-4xl font-bold">{currentRecordCount}</h2>
                    </div>
                    <Database size={48} className="text-blue-300 opacity-50" />
                </div>
                <div className="mt-4 text-sm text-blue-100 bg-white/10 p-2 rounded">
                    ℹ️ Uploading Master Records enables "Auto-fill" in Student Form.
                </div>
            </div>

            {/* Upload XLSX */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-green-600" />
                    Upload Master List (XLSX)
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Upload an Excel file with columns: 
                    <span className="font-mono bg-gray-100 px-1 rounded mx-1">Seat No</span>
                    <span className="font-mono bg-gray-100 px-1 rounded mx-1">Student Name</span>
                    (Optional: College Code, College Name)
                </p>
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-gray-500">XLSX files only</p>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleMasterFileUpload} disabled={loading} />
                </label>
            </div>

            {/* Paste Data */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Clipboard size={20} className="text-orange-600" />
                    Paste From Excel
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                    Copy columns from Excel (Header + Data) and paste here.
                </p>
                <textarea 
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg text-xs font-mono mb-3 focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder={`Seat No\tStudent Name\tCollege Code\n12345\tJohn Doe\t1024`}
                    value={pasteData}
                    onChange={(e) => setPasteData(e.target.value)}
                ></textarea>
                <button 
                    onClick={handlePasteMasterData}
                    disabled={loading || !pasteData.trim()}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                >
                    Process Paste Data
                </button>
            </div>

            {/* Backup & Restore Zone */}
            <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl text-white shadow-lg mt-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Archive size={20} className="text-yellow-400" />
                    Data Backup & Restore
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <h4 className="font-bold text-yellow-400 mb-2 flex items-center gap-2"><Download size={16}/> Backup JSON</h4>
                        <p className="text-xs text-gray-300 mb-3">Download all current student data as a JSON file.</p>
                        <button onClick={handleBackupData} disabled={loading} className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded text-sm transition-colors">
                            Download Backup
                        </button>
                    </div>
                    
                    <div className="bg-slate-700 p-4 rounded-lg">
                         <h4 className="font-bold text-green-400 mb-2 flex items-center gap-2"><Upload size={16}/> Restore JSON</h4>
                         <p className="text-xs text-gray-300 mb-3">Restore data from a previously downloaded JSON file.</p>
                         <label className="block w-full text-center py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-sm cursor-pointer transition-colors">
                            Select JSON File
                            <input type="file" className="hidden" accept=".json" onChange={handleRestoreData} disabled={loading} />
                        </label>
                    </div>

                    <div className="bg-slate-700 p-4 rounded-lg border border-teal-500/30">
                         <h4 className="font-bold text-teal-400 mb-2 flex items-center gap-2"><FileSpreadsheet size={16}/> Import Excel Session</h4>
                         <p className="text-xs text-gray-300 mb-3">Directly import student data from Excel into the current session.</p>
                         <label className="block w-full text-center py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-sm cursor-pointer transition-colors">
                            Select Excel File
                            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportExcelToSession} disabled={loading} />
                        </label>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* ADDRESS DATA TAB */}
        {activeTab === 'ADDRESS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">College Address Data</h3>
                        <p className="text-sm text-gray-500">Total Records: {currentAddressCount}</p>
                    </div>
                    <MapPin size={32} className="text-red-500" />
                </div>
                
                <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 mb-4">
                    Required Columns: <span className="font-bold">College Code</span>, <span className="font-bold">Address</span>
                    <br/>Optional: <span className="font-bold">Email</span> (For Automated Mailing)
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Upload Address File</span></p>
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleAddressFileUpload} disabled={loading} />
                </label>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Officer Details */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <PenTool size={20} className="text-purple-600" /> Letter Signatories
                   </h3>
                   <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase">Officer Name (Marathi)</label>
                               <input type="text" name="officerNameMr" value={settingsForm.officerNameMr} onChange={handleSettingsChange} className="w-full p-2 border rounded" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase">Designation (Marathi)</label>
                               <input type="text" name="officerDesigMr" value={settingsForm.officerDesigMr} onChange={handleSettingsChange} className="w-full p-2 border rounded" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase">Officer Name (English)</label>
                               <input type="text" name="officerNameEn" value={settingsForm.officerNameEn} onChange={handleSettingsChange} className="w-full p-2 border rounded" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase">Designation (English)</label>
                               <input type="text" name="officerDesigEn" value={settingsForm.officerDesigEn} onChange={handleSettingsChange} className="w-full p-2 border rounded" />
                           </div>
                       </div>
                       <button onClick={handleSaveSettings} className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold">Save Details</button>
                   </div>
               </div>

               {/* Images */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                   <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <Image size={20} className="text-pink-600" /> Digital Assets
                   </h3>
                   <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">University Logo</label>
                            <div className="flex items-center gap-4">
                                {settingsForm.universityLogo && <img src={settingsForm.universityLogo} className="h-12 w-12 object-contain border rounded" />}
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
                                {settingsForm.universityLogo && <button onClick={handleRemoveLogo} className="text-red-500 text-xs hover:underline">Remove</button>}
                            </div>
                        </div>
                        <hr/>
                        <div>
                            <label className="block text-sm font-medium mb-1">Officer Signature</label>
                            <div className="flex items-center gap-4">
                                {settingsForm.signatureImage && <img src={settingsForm.signatureImage} className="h-12 w-auto object-contain border rounded bg-gray-50" />}
                                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="text-xs" />
                                {settingsForm.signatureImage && <button onClick={handleRemoveSignature} className="text-red-500 text-xs hover:underline">Remove</button>}
                            </div>
                        </div>
                   </div>
                   <button onClick={handleSaveSettings} className="w-full mt-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-bold">Save Images</button>
               </div>

               {/* EmailJS Configuration */}
               <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                   <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                       <Mail size={20} className="text-blue-600" /> Automated Email Configuration (EmailJS)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase">Service ID</label>
                           <input type="text" name="emailServiceId" value={settingsForm.emailServiceId} onChange={handleSettingsChange} className="w-full p-2 border rounded font-mono text-sm" placeholder="service_xxx" />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase">Template ID</label>
                           <input type="text" name="emailTemplateId" value={settingsForm.emailTemplateId} onChange={handleSettingsChange} className="w-full p-2 border rounded font-mono text-sm" placeholder="template_xxx" />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase">Public Key</label>
                           <input type="text" name="emailPublicKey" value={settingsForm.emailPublicKey} onChange={handleSettingsChange} className="w-full p-2 border rounded font-mono text-sm" placeholder="user_xxx" />
                       </div>
                   </div>
                   <div className="mt-4 flex justify-end">
                       <button onClick={handleSaveEmailKeys} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold">Save Email Keys</button>
                   </div>
               </div>
           </div>
        )}

        {/* ACCESS CONTROL TAB */}
        {activeTab === 'ACCESS' && isAdminUser && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Lock size={20} className="text-orange-600" /> Faculty Access Control
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b">
                                <th className="p-3">Faculty</th>
                                <th className="p-3 text-center">Access Enabled</th>
                                <th className="p-3">Password</th>
                            </tr>
                        </thead>
                        <tbody>
                            {FACULTIES.map(faculty => (
                                <tr key={faculty.id} className="border-b">
                                    <td className="p-3 font-medium">{faculty.label}</td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={allowedFaculties.includes(faculty.id)} 
                                            onChange={() => handleTogglePermission(faculty.id)}
                                            disabled={faculty.id === 'medical'} // Medical always active
                                            className="w-5 h-5 accent-orange-600"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2 max-w-xs">
                                            <Key size={14} className="text-gray-400" />
                                            <input 
                                                type="text" 
                                                value={passwords[faculty.id] || ''} 
                                                onChange={(e) => handlePasswordChange(faculty.id, e.target.value)}
                                                placeholder="Set Password"
                                                className="w-full p-1 border rounded text-sm font-mono"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={handleSavePermissions} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-bold shadow-lg">
                        Update Access Rules
                    </button>
                </div>
            </div>
        )}

        {/* SESSION & EXAM TAB */}
        {activeTab === 'SESSION' && (
            <div className="space-y-6">
                
                {/* Exam List Management */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Clock size={20} className="text-purple-600" /> Active Exams
                        </h3>
                        <button onClick={handleAddExamTab} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold hover:bg-purple-200 flex items-center gap-1">
                            <Plus size={14} /> Add Exam
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {examList.map(exam => (
                            <div 
                                key={exam}
                                onClick={() => onSelectExam && onSelectExam(exam)}
                                className={`px-4 py-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${currentExamName === exam ? 'bg-purple-600 text-white border-purple-600 shadow' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            >
                                <span className="font-bold text-sm">{exam}</span>
                                {examList.length > 1 && (
                                    <button 
                                        onClick={(e) => handleDeleteExamTab(e, exam)}
                                        className="bg-white/20 p-0.5 rounded-full hover:bg-white/40"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 bg-purple-50 text-purple-800 text-sm rounded border border-purple-100">
                        Current Active Exam: <span className="font-bold">{currentExamName}</span>
                    </div>
                </div>

                {/* Session Years Configuration */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CheckSquare size={20} className="text-teal-600" /> Active Academic Years
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {SUBJECT_CONFIG.map(config => {
                            const isActive = currentSessionYears.includes(config.year);
                            return (
                                <div 
                                    key={config.year} 
                                    onClick={() => handleToggleSessionYear(config.year)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isActive ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`font-bold ${isActive ? 'text-teal-700' : 'text-gray-500'}`}>{config.year}</span>
                                        {isActive ? <CheckSquare size={20} className="text-teal-600" /> : <Square size={20} className="text-gray-300" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Archive Zone */}
                <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                    <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                        <Archive size={20} /> Archive & Reset Session
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                        This will move ALL current student records for <b>{currentExamName}</b> to the archive and clear the dashboard for a new session.
                    </p>
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-red-600 uppercase mb-1">New Session Name</label>
                            <input 
                                type="text" 
                                value={nextExamName}
                                onChange={(e) => setNextExamName(e.target.value)}
                                className="w-full p-2 border border-red-300 rounded focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="e.g. SUMMER-2025_PHASE-I"
                            />
                        </div>
                        <button 
                            onClick={handleStartNewSession}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold shadow-lg flex items-center gap-2"
                        >
                            <Archive size={18} /> Archive & Start New
                        </button>
                    </div>
                </div>

                {/* Archive History */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Archive History</h3>
                    <div className="space-y-3">
                        {archives.length === 0 ? <p className="text-gray-400 italic">No archived sessions found.</p> : 
                            archives.map(arch => (
                                <div key={arch.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <p className="font-bold text-gray-800">{arch.examName}</p>
                                        <p className="text-xs text-gray-500">Archived: {arch.archivedDate} • Students: {arch.studentCount}</p>
                                    </div>
                                    <button 
                                        onClick={() => onRestoreArchive(arch)}
                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-bold"
                                    >
                                        <Eye size={14} /> View Data
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
