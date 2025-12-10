import React, { useState, useEffect } from 'react';
import { ViewState, StudentEntry, MasterRecord, CollegeAddressRecord, FacultyUser, LetterSettings, ArchivedSession } from './types';
import { DEFAULT_LETTER_SETTINGS, SUBJECT_CONFIG } from './constants';
import StudentForm from './components/StudentForm';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import Ledger from './components/Ledger';
import Login from './components/Login';
import { Activity, ShieldCheck, LogOut, Loader2 } from 'lucide-react';

// Firebase Services
import { 
    fetchFacultySettings, 
    subscribeToStudents, 
    addStudentToDB, 
    updateStudentInDB, 
    deleteStudentFromDB,
    fetchMasterRecordsDB,
    fetchAddressesDB,
    fetchArchivesDB,
    saveFacultySettings,
    saveCurrentExamConfig,
    archiveCurrentSession
} from './services/firestore';

function App() {
  const [currentUser, setCurrentUser] = useState<FacultyUser | null>(null);
  const [viewState, setViewState] = useState<ViewState>('LIST');

  // Data States
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [masterRecords, setMasterRecords] = useState<MasterRecord[]>([]);
  const [collegeAddresses, setCollegeAddresses] = useState<CollegeAddressRecord[]>([]);
  const [letterSettings, setLetterSettings] = useState<LetterSettings>(DEFAULT_LETTER_SETTINGS);

  // Exam Management States
  const [currentExamName, setCurrentExamName] = useState<string>('SUMMER-2025_PHASE-IV');
  const [sessionYears, setSessionYears] = useState<string[]>(SUBJECT_CONFIG.map(c => c.year));
  const [archives, setArchives] = useState<ArchivedSession[]>([]);

  const [currentStudent, setCurrentStudent] = useState<StudentEntry | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
        setIsLoading(true);
        const facultyId = currentUser.id;

        const unsubscribe = subscribeToStudents(facultyId, (data) => {
            setStudents(data);
            setIsLoading(false);
        });

        const initData = async () => {
            try {
                const settingsData = await fetchFacultySettings(facultyId);
                if (settingsData) {
                    if (settingsData.letterSettings) setLetterSettings(settingsData.letterSettings);
                    if (settingsData.currentExamName) setCurrentExamName(settingsData.currentExamName);
                    if (settingsData.sessionYears) setSessionYears(settingsData.sessionYears);
                }

                const masters = await fetchMasterRecordsDB(facultyId);
                setMasterRecords(masters);

                const addresses = await fetchAddressesDB(facultyId);
                setCollegeAddresses(addresses);

                const archs = await fetchArchivesDB(facultyId);
                setArchives(archs);

            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };

        initData();

        return () => unsubscribe();
    }
  }, [currentUser]);

  const handleUpdateExamName = (name: string) => {
      setCurrentExamName(name);
      if (currentUser) {
          saveCurrentExamConfig(currentUser.id, name, sessionYears);
      }
  };

  const handleUpdateSessionYears = (years: string[]) => {
      setSessionYears(years);
      if (currentUser) {
          saveCurrentExamConfig(currentUser.id, currentExamName, years);
      }
  };

  const saveLetterSettings = (settings: LetterSettings) => {
      setLetterSettings(settings);
      if (currentUser) {
          saveFacultySettings(currentUser.id, settings);
      }
  };

  const handleArchiveAndReset = async (newExamName: string) => {
      if (!currentUser) return;
      setIsLoading(true);

      const newArchive: ArchivedSession = {
          id: Date.now().toString(),
          examName: currentExamName,
          activeYears: sessionYears,
          archivedDate: new Date().toISOString().split('T')[0],
          studentCount: students.length,
          students: [...students]
      };

      try {
        await archiveCurrentSession(currentUser.id, newArchive, newExamName);
        setArchives(prev => [newArchive, ...prev]);
        setCurrentExamName(newExamName);
        setViewState('LIST');
      } catch (e) {
          alert('Error archiving session. Check console.');
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleRestoreArchive = (session: ArchivedSession) => {
      if (confirm(`VIEW ONLY MODE: Loading archive "${session.examName}".\nChanges will NOT be saved.`)) {
          setStudents(session.students);
          setCurrentExamName(session.examName);
          if (session.activeYears) setSessionYears(session.activeYears);
      }
  };

  const handleLogin = (user: FacultyUser) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
      setViewState('LIST');
      setStudents([]);
      setMasterRecords([]);
  };

  const handleAddNew = () => {
    setCurrentStudent(undefined);
    setViewState('FORM');
  };

  const handleEdit = (student: StudentEntry) => {
    setCurrentStudent(student);
    setViewState('FORM');
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    if (confirm('Delete this record?')) {
      await deleteStudentFromDB(currentUser.id, id);
    }
  };

  const handleSaveStudent = async (data: StudentEntry) => {
    if (!currentUser) return;
    setViewState('LIST');
    
    try {
        if (students.find(s => s.id === data.id)) {
            await updateStudentInDB(currentUser.id, data);
        } else {
            await addStudentToDB(currentUser.id, data);
        }
    } catch (e) {
        console.error("Save failed", e);
        alert("Failed to save to cloud.");
    }
  };

  const refreshMasterData = (data: MasterRecord[]) => setMasterRecords(data);
  const refreshAddressData = (data: CollegeAddressRecord[]) => setCollegeAddresses(data);

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  if (isLoading && students.length === 0 && viewState === 'LIST') {
      return (
          <div className="min-h-screen flex items-center justify-center flex-col gap-4">
              <Loader2 className="animate-spin text-blue-600" size={48} />
              <p className="text-gray-500 font-medium">Connecting to Cloud Database...</p>
          </div>
      );
  }

  const renderContent = () => {
    switch (viewState) {
      case 'ADMIN':
        return (
            <AdminPanel 
                onDataLoaded={refreshMasterData}
                onAddressDataLoaded={refreshAddressData}
                onSettingsSaved={saveLetterSettings}
                currentRecordCount={masterRecords.length}
                currentAddressCount={collegeAddresses.length}
                currentSettings={letterSettings}
                currentUser={currentUser}
                currentExamName={currentExamName}
                currentSessionYears={sessionYears}
                onUpdateSessionYears={handleUpdateSessionYears}
                archives={archives}
                onArchiveAndReset={handleArchiveAndReset}
                onRestoreArchive={handleRestoreArchive}
            />
        );
      case 'FORM':
        return (
          <StudentForm 
            initialData={currentStudent}
            onSave={handleSaveStudent}
            onCancel={() => setViewState('LIST')}
            masterRecords={masterRecords}
            currentExamName={currentExamName}
            sessionYears={sessionYears}
            onExamNameChange={handleUpdateExamName}
          />
        );
      case 'LEDGER':
        return (
          <Ledger 
            students={students}
            onBack={() => setViewState('LIST')}
            collegeAddresses={collegeAddresses}
            letterSettings={letterSettings}
            currentExamName={currentExamName}
          />
        );
      case 'LIST':
      default:
        return (
          <Dashboard 
            students={students}
            onAdd={handleAddNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewLedger={() => setViewState('LEDGER')}
            currentExamName={currentExamName}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewState('LIST')}>
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Activity size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                    Theory Retotaling/Photocopy Verification data
                  </h1>
                  <div className="flex items-center gap-2">
                      <p className="text-xs text-blue-600 font-bold uppercase">{currentUser.label}</p>
                      <span className="text-gray-300">|</span>
                      <p className="text-xs text-gray-500 font-semibold">{currentExamName}</p>
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ONLINE
                      </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                    onClick={() => setViewState('ADMIN')}
                    className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                        viewState === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                    <ShieldCheck size={16} />
                    Admin
                </button>

                <div className="h-6 w-px bg-gray-300 mx-2"></div>

                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                >
                    <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
      </nav>

      <main className="flex-1 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Theory Retotaling/Photocopy Verification. Logged in as: {currentUser.name}.</p>
            <p className="mt-1 font-medium text-gray-500">Designed & Developed by Kiran Pawar</p>
          </div>
      </footer>
    </div>
  );
}

export default App;
