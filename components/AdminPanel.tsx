
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { MasterRecord, CollegeAddressRecord, LetterSettings, FacultyUser, ArchivedSession, StudentEntry } from '../types';
import { FACULTIES, SUBJECT_CONFIG, createEmptyStudent } from '../constants';
import { Upload, Database, CheckCircle, AlertCircle, FileSpreadsheet, MapPin, Settings, Save, Users, Lock, Archive, RefreshCw, Eye, PenTool, CheckSquare, Square, UploadCloud, Mail, Download, FileJson, ArrowRightCircle, Clock } from 'lucide-react';
import { 
    uploadMasterRecordsBatch, 
    uploadAddressesBatch, 
    saveAllowedFaculties, 
    fetchAllowedFaculties,
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
    onRestoreArchive
}) => {
  const [activeTab, setActiveTab] = useState<'MASTER' | 'ADDRESS' | 'SETTINGS' | 'ACCESS' | 'SESSION'>('MASTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Timer State
  const [estimatedTime, setEstimatedTime] = useState<string>('Calculating...');
  
  // Settings State
  const [settingsForm, setSettingsForm] = useState<LetterSettings>(currentSettings);

  // Access Control State
  const [allowedFaculties, setAllowedFaculties] = useState<string[]>(['medical']);

  // Session State
  const [nextExamName, setNextExamName] = useState('SUMMER-2025_PHASE-IV');

  // Update form if props change
  useEffect(() => {
    setSettingsForm(currentSettings);
  }, [currentSettings]);

  // Load permissions from Firestore
  useEffect(() => {
      const loadPermissions = async () => {
          try {
              const ids = await fetchAllowedFaculties();
              setAllowedFaculties(ids);
          } catch (e) {
              console.error("Failed to load permissions", e);
          }
      };
      if (isAdminUser) {
          loadPermissions();
      }
  }, []);

  const resetStatus = () => {
    setLoading(false);
    setError(null);
    setSuccessMsg(null);
    setPreviewData([]);
    setUploadProgress(0);
    setEstimatedTime('');
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

  const handleSaveSettings = () => {
      onSettingsSaved(settingsForm);
      setSuccessMsg("Letter configuration saved to cloud successfully.");
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

  const handleSavePermissions = async () => {
      try {
        await saveAllowedFaculties(allowedFaculties);
        setSuccessMsg("User access permissions synced to cloud.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (e) {
          setError("Failed to save permissions.");
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
          const pct = Math.round((processed / total) * 100);
          setUploadProgress(pct);

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
          setEstimatedTime('Calculating...');
          setError(null);
          
          // Use setTimeout to allow UI to render the loading state before heavy processing
          setTimeout(async () => {
              try {
                  const jsonStr = event.target?.result as string;
                  const data = JSON.parse(jsonStr);
                  if (!Array.isArray(data)) throw new Error("Invalid JSON format. Expected an array.");
                  
                  const startTime = Date.now();
                  await restoreBackupBatch(currentUser.id, data, createProgressCallback(startTime));
                  
                  setSuccessMsg(`Success! ${data.length} records restored. (सर्व डेटा परत आला आहे. डॅशबोर्ड चेक करा.)`);
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

                // Use the Restore function because it does exactly what we want: Bulk Upload StudentEntry[]
                const startTime = Date.now();
                await restoreBackupBatch(currentUser.id, studentsToUpload, createProgressCallback(startTime));

                setSuccessMsg(`Successfully imported ${studentsToUpload.length} students from Excel into the active session.`);

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
            // Upload to Firestore
            const startTime = Date.now();
            await uploadMasterRecordsBatch(currentUser.id, normalizedData, createProgressCallback(startTime));
            
            setPreviewData(normalizedData);
            onDataLoaded(normalizedData); // Update local state for immediate feedback
            setSuccessMsg(`Successfully uploaded ${normalizedData.length} student records to Cloud Database. (अपलोड यशस्वी!)`);
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

  const handleAddressFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputElement = e.target;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setLoading(true);
      setUploadProgress(0);
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

            // Normalize Data for Addresses
            const normalizedData: CollegeAddressRecord[] = jsonData.map((row: any) => ({
            collegeCode: String(getFlexibleValue(row, ['College Code', 'college_code', 'CODE', 'code', 'C_Code', 'Center Code']) || '').trim(),
            address: String(getFlexibleValue(row, ['Address', 'address', 'College Address', 'addr', 'LOCATION', 'Coll_Address']) || '').trim(),
            email: String(getFlexibleValue(row, ['Email', 'email', 'E-mail', 'EMAIL', 'mail', 'Email_Id', 'EmailId']) || '').trim()
            })).filter(r => r.collegeCode && r.address);

            if (normalizedData.length === 0) {
            setError("No valid address records found. Ensure Excel has 'College Code' and 'Address'.");
            } else {
            // Upload to Firestore
            const startTime = Date.now();
            await uploadAddressesBatch(currentUser.id, normalizedData, createProgressCallback(startTime));

            setPreviewData(normalizedData);
            onAddressDataLoaded(normalizedData);
            setSuccessMsg(`Successfully uploaded ${normalizedData.length} college addresses to Cloud Database.`);
            }
        } catch (err: any) {
            console.error("Address Upload Error:", err);
            if (err.code === 'permission-denied') {
                setError("Permission Error: Cannot write to Database.");
            } else {
                setError(`Failed to upload addresses. Error: ${err.message}`);
            }
        } finally {
            setLoading(false);
            if (inputElement) inputElement.value = ''; // Reset input
        }
      }, 50);
    };
    reader.readAsArrayBuffer(file);
  };

  const isAdminUser = currentUser.id === 'medical';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden overflow-x-auto">
        <button onClick={() => handleTabChange('MASTER')} className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'MASTER' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Database size={18} /> Student Data
        </button>
        <button onClick={() => handleTabChange('ADDRESS')} className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'ADDRESS' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <MapPin size={18} /> Addresses
        </button>
        <button onClick={() => handleTabChange('SETTINGS')} className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'SETTINGS' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Settings size={18} /> Configuration
        </button>
        <button onClick={() => handleTabChange('SESSION')} className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'SESSION' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Archive size={18} /> Session / Data
        </button>
        {isAdminUser && (
            <button onClick={() => handleTabChange('ACCESS')} className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'ACCESS' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <Users size={18} /> Access
            </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-b-xl shadow-md border border-gray-200 border-t-0 mt-0">
        
        {activeTab === 'MASTER' && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Student Data Upload</h2>
            <p className="text-gray-500 mb-8">
              Upload an Excel/CSV file containing student details to enable auto-fill in the application form.
              <span className="block text-xs text-blue-500 mt-1 font-semibold">NOTE: Data is saved to Cloud Database.</span>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                    <UploadCloud size={48} className="text-blue-600 mb-4" />
                    <label className="cursor-pointer">
                        <span className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block mb-2">
                            Select Master File (Excel/CSV)
                        </span>
                        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleMasterFileUpload} />
                    </label>
                    <p className="text-xs text-gray-400 mt-2">Supported formats: .csv, .xlsx, .xls</p>
                    <p className="text-xs text-gray-400 mt-1">Required: Seat No, Student Name, College Code, College Name</p>
                </div>
                {/* Status Area */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-4">Master Data Status</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-gray-600 text-sm">Total Records (Local)</span>
                            <span className="font-mono font-bold text-blue-600">{currentRecordCount}</span>
                        </div>
                        {loading && (
                            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
                                        <UploadCloud className="animate-bounce" size={16} /> 
                                        <span>Uploading... {uploadProgress}%</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                                        <Clock size={12} /> {estimatedTime}
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 text-center">Please wait, do not close.</p>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg whitespace-pre-wrap">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}
                        {successMsg && <div className="flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"><CheckCircle size={16} className="mt-0.5 shrink-0" />{successMsg}</div>}
                    </div>
                </div>
            </div>
          </>
        )}

        {activeTab === 'ADDRESS' && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-2">College Address Upload</h2>
            <p className="text-gray-500 mb-8">
              Upload an Excel/CSV file containing college addresses and emails.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                    <MapPin size={48} className="text-emerald-600 mb-4" />
                    <label className="cursor-pointer">
                        <span className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors inline-block mb-2">
                            Select Address File (Excel/CSV)
                        </span>
                        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleAddressFileUpload} />
                    </label>
                    <p className="text-xs text-gray-400 mt-2">Supported formats: .csv, .xlsx, .xls</p>
                    <p className="text-xs text-gray-400 mt-1">Required: College Code, Address (Optional: Email)</p>
                </div>
                {/* Status Area */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-700 mb-4">Address Data Status</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100">
                            <span className="text-gray-600 text-sm">Total Addresses (Local)</span>
                            <span className="font-mono font-bold text-emerald-600">{currentAddressCount}</span>
                        </div>
                         {loading && (
                            <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center gap-2 text-blue-600 text-sm font-semibold">
                                        <UploadCloud className="animate-bounce" size={16} /> 
                                        <span>Uploading... {uploadProgress}%</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                                        <Clock size={12} /> {estimatedTime}
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg whitespace-pre-wrap">
                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                {error}
                            </div>
                        )}
                        {successMsg && <div className="flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"><CheckCircle size={16} className="mt-0.5 shrink-0" />{successMsg}</div>}
                    </div>
                </div>
            </div>
          </>
        )}

        {/* SETTINGS, ACCESS tabs remain the same (removed for brevity as no changes needed there) */}
        
        {activeTab === 'SETTINGS' && (
             <>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Letter Configuration</h2>
                {successMsg && <div className="mb-4 flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"><CheckCircle size={16} className="mt-0.5 shrink-0" />{successMsg}</div>}
                 
                 {/* Email Configuration Section */}
                 <div className="mb-8 bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Mail size={18} /> Automatic Email Configuration (EmailJS)
                    </h3>
                    <p className="text-xs text-blue-700 mb-4">
                        Configure this to enable "Direct Send" from your own faculty email. 
                        Sign up at <a href="https://www.emailjs.com/" target="_blank" className="underline font-bold">emailjs.com</a>, 
                        connect your Office Email (Gmail/Outlook), and paste the keys here.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-blue-800 mb-1">Service ID</label>
                             <input type="text" name="emailServiceId" value={settingsForm.emailServiceId} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. service_xyz" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-blue-800 mb-1">Template ID</label>
                             <input type="text" name="emailTemplateId" value={settingsForm.emailTemplateId} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. template_abc" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-blue-800 mb-1">Public Key</label>
                             <input type="text" name="emailPublicKey" value={settingsForm.emailPublicKey} onChange={handleSettingsChange} className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. user_12345" />
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Marathi Section */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                         <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Marathi Details</h3>
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Officer Name (Mr/Mrs)</label>
                                 <input type="text" name="officerNameMr" value={settingsForm.officerNameMr} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                 <input type="text" name="officerDesigMr" value={settingsForm.officerDesigMr} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Department/Faculty</label>
                                 <input type="text" name="officerDeptMr" value={settingsForm.officerDeptMr} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                         </div>
                    </div>

                    {/* English Section */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                         <h3 className="font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">English Details</h3>
                         <div className="space-y-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Officer Name</label>
                                 <input type="text" name="officerNameEn" value={settingsForm.officerNameEn} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                 <input type="text" name="officerDesigEn" value={settingsForm.officerDesigEn} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Department/Faculty</label>
                                 <input type="text" name="officerDeptEn" value={settingsForm.officerDeptEn} onChange={handleSettingsChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                             </div>
                         </div>
                    </div>

                     {/* Signature Upload Section */}
                     <div className="lg:col-span-2 bg-blue-50 p-6 rounded-xl border border-blue-200">
                        <div className="flex justify-between items-center mb-4 border-b border-blue-200 pb-2">
                            <h3 className="font-bold text-blue-900 flex items-center gap-2">
                                <PenTool size={18} /> Digital Signature
                            </h3>
                            {settingsForm.signatureImage && (
                                <button onClick={handleRemoveSignature} className="text-xs text-red-600 hover:text-red-800 font-medium">
                                    Remove Signature
                                </button>
                            )}
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-blue-800 mb-2">Upload Signature Image</label>
                                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-white hover:bg-blue-50 transition-colors text-center">
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" id="sig-upload" />
                                    <label htmlFor="sig-upload" className="cursor-pointer block w-full">
                                        <div className="flex flex-col items-center gap-2 text-blue-600">
                                            <Upload size={24} />
                                            <span className="text-sm font-medium">Click to select file</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="w-full md:w-64">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">Preview</label>
                                <div className="bg-white border border-gray-300 rounded-lg h-32 flex items-center justify-center overflow-hidden relative">
                                    {settingsForm.signatureImage ? (
                                        <img 
                                            src={settingsForm.signatureImage} 
                                            alt="Signature Preview" 
                                            className="max-h-24 max-w-[90%] object-contain mix-blend-multiply"
                                            style={{ filter: 'grayscale(100%) sepia(100%) hue-rotate(190deg) saturate(500%) brightness(80%) contrast(150%)' }}
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-sm">No signature</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
                 <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleSaveSettings}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg transition-colors"
                    >
                        <Save size={18} /> Save Settings
                    </button>
                </div>
             </>
        )}

        {/* SESSION TAB */}
        {activeTab === 'SESSION' && (
             <>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Exam Session Management</h2>
                 {successMsg && <div className="mb-4 flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"><CheckCircle size={16} className="mt-0.5 shrink-0" />{successMsg}</div>}

                {/* --- IMPORT EXCEL AS SESSION DATA --- */}
                <div className="mb-8 bg-green-50 p-6 rounded-xl border border-green-200">
                    <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                        <FileSpreadsheet size={20} /> Import Excel Data to Session (New)
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                        <b>Direct Import:</b> Upload your Master Excel file here to automatically convert and load it as active student applications for this session. 
                        No need to convert to JSON manually.
                    </p>
                    <div className="flex gap-4 items-center flex-wrap">
                        <div className="relative">
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcelToSession} className="hidden" id="excel-import" />
                            <label htmlFor="excel-import" className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 shadow-sm transition-colors">
                                <Upload size={18} /> Import Students from Excel
                            </label>
                        </div>
                         <div className="flex items-center gap-2 text-xs text-green-800 bg-white px-3 py-1 rounded-full border border-green-200">
                            <ArrowRightCircle size={14} /> Fastest Way to Initialize Data
                        </div>
                    </div>
                     {loading && (
                        <div className="mt-4 p-3 bg-white rounded-lg border border-green-100 shadow-sm">
                             <div className="flex justify-between items-center mb-1">
                                <div className="text-xs text-green-700 font-bold">Importing Data...</div>
                                <div className="flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">
                                    <Clock size={12} /> {estimatedTime}
                                </div>
                             </div>
                             <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-green-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                             </div>
                             <p className="text-xs text-gray-500 mt-1 text-center">{uploadProgress}% Complete</p>
                        </div>
                    )}
                     {error && (
                        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mt-2 whitespace-pre-wrap">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>
                 
                {/* Full Data Backup / Restore (Using JSON) - Solves "Use Storage" question */}
                 <div className="mb-8 bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                         <FileJson size={20} /> Full System Backup & Restore
                    </h3>
                    <p className="text-sm text-indigo-700 mb-4">
                        Use this to backup the <b>Full Application State</b> (JSON) to your Drive. 
                        <b>Note:</b> Only use "Restore" for files created by this "Download Backup" button.
                    </p>
                    <div className="flex gap-4 items-center flex-wrap">
                        <button 
                            onClick={handleBackupData}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
                        >
                            <Download size={18} /> Download Backup
                        </button>
                        
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleRestoreData} className="hidden" id="json-restore" />
                            <label htmlFor="json-restore" className="cursor-pointer bg-white border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-50 shadow-sm">
                                <Upload size={18} /> Restore Backup
                            </label>
                        </div>
                    </div>
                     {error && (
                        <div className="flex items-start gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mt-2 whitespace-pre-wrap">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}
                 </div>

                {/* Session UI Grids (No changes needed) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                            <h3 className="font-bold text-blue-800">Current Session</h3>
                        </div>
                        <div className="p-6">
                             <div className="flex flex-wrap gap-3 mb-6">
                                {SUBJECT_CONFIG.map(config => {
                                    const isSelected = currentSessionYears.includes(config.year);
                                    return (
                                        <button
                                            key={config.year}
                                            type="button"
                                            onClick={() => handleToggleSessionYear(config.year)}
                                            className={`
                                                flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-all
                                                ${isSelected 
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                            {config.year}
                                        </button>
                                    );
                                })}
                            </div>

                             <input 
                                type="text" 
                                value={nextExamName}
                                onChange={(e) => setNextExamName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. WINTER-2025"
                            />
                            <button 
                                onClick={handleStartNewSession}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                                <RefreshCw size={18} /> Archive & Start Fresh
                            </button>
                        </div>
                     </div>
                     
                     <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                            <h3 className="font-bold text-gray-800">Archived Sessions</h3>
                        </div>
                         <div className="p-0 overflow-y-auto max-h-[400px]">
                             {archives.length === 0 ? (
                                <div className="p-6 text-center text-gray-500 text-sm">No archives found in Cloud.</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 border-b">
                                        <tr>
                                            <th className="px-4 py-2">Exam Name</th>
                                            <th className="px-4 py-2">Date</th>
                                            <th className="px-4 py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {archives.map((arch) => (
                                            <tr key={arch.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    <div>{arch.examName}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">{arch.archivedDate}</td>
                                                <td className="px-4 py-3">
                                                    <button 
                                                        onClick={() => onRestoreArchive(arch)}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-bold border border-blue-200 hover:border-blue-400 px-2 py-1 rounded bg-blue-50 flex items-center gap-1"
                                                    >
                                                        <Eye size={12} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                         </div>
                     </div>
                </div>
             </>
        )}

        {/* ACCESS TAB logic (no changes) */}
        {activeTab === 'ACCESS' && isAdminUser && (
             <>
                <h2 className="text-xl font-bold text-gray-800 mb-2">User Access Control</h2>
                {successMsg && <div className="mb-4 flex items-start gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg"><CheckCircle size={16} className="mt-0.5 shrink-0" />{successMsg}</div>}
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {FACULTIES.map(faculty => (
                        <div key={faculty.id} className={`p-4 rounded-lg border ${allowedFaculties.includes(faculty.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                    checked={allowedFaculties.includes(faculty.id)}
                                    onChange={() => handleTogglePermission(faculty.id)}
                                    disabled={faculty.id === 'medical'}
                                />
                                <span className={`font-medium ${allowedFaculties.includes(faculty.id) ? 'text-blue-800' : 'text-gray-600'}`}>
                                    {faculty.label}
                                </span>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-end">
                    <button 
                        onClick={handleSavePermissions}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg transition-colors"
                    >
                        <Lock size={18} /> Save Permissions
                    </button>
                </div>
             </>
        )}

      </div>

      {previewData.length > 0 && activeTab !== 'SETTINGS' && activeTab !== 'ACCESS' && activeTab !== 'SESSION' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-gray-700">Preview (Top 5 Records)</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            {activeTab === 'MASTER' ? (
                              <>
                                <th className="px-6 py-3">Seat No</th>
                                <th className="px-6 py-3">Student Name</th>
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">College</th>
                              </>
                            ) : (
                              <>
                                <th className="px-6 py-3">College Code</th>
                                <th className="px-6 py-3">Address</th>
                                <th className="px-6 py-3">Email</th>
                              </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {previewData.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                {activeTab === 'MASTER' ? (
                                  <>
                                    <td className="px-6 py-3 font-mono text-gray-900">{row.seatNo}</td>
                                    <td className="px-6 py-3 text-gray-900 font-medium">{row.studentName}</td>
                                    <td className="px-6 py-3 text-gray-900">{row.collegeCode}</td>
                                    <td className="px-6 py-3 truncate max-w-xs text-gray-900">{row.collegeName}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-6 py-3 font-mono font-bold text-emerald-600">{row.collegeCode}</td>
                                    <td className="px-6 py-3 truncate max-w-lg text-gray-900 font-medium" title={row.address}>{row.address}</td>
                                    <td className="px-6 py-3 text-gray-700">{row.email || '-'}</td>
                                  </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
