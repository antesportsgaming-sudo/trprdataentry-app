
import React, { useMemo, useState, useEffect } from 'react';
import { StudentEntry, CollegeAddressRecord, LetterSettings } from '../types';
import { getShortSubjectName, SUBJECT_CONFIG } from '../constants';
import { ArrowLeft, Printer, FileText, Copy, Mail, AlertTriangle, ChevronLeft, ChevronRight, School, Layers, Send, Receipt } from 'lucide-react';
import CoverLetter from './CoverLetter';
import DiscrepancyLetter from './DiscrepancyLetter';
import MailDashboard from './MailDashboard';
import CreditNoteLetter from './CreditNoteLetter';

interface LedgerProps {
  students: StudentEntry[];
  onBack: () => void;
  collegeAddresses?: CollegeAddressRecord[];
  letterSettings: LetterSettings;
  currentExamName: string;
}

const Ledger: React.FC<LedgerProps> = ({ students, onBack, collegeAddresses = [], letterSettings, currentExamName }) => {
  const [ledgerMode, setLedgerMode] = useState<'tr_pr' | 'photocopy'>('tr_pr');
  const [viewMode, setViewMode] = useState<'LEDGER' | 'COVER_LETTER' | 'DISCREPANCY_TR' | 'DISCREPANCY_PHOTO' | 'MAIL_DASHBOARD' | 'CREDIT_NOTE'>('LEDGER');
  const [courseName, setCourseName] = useState('II M.B.B.S.');
  const [currentCollegeIndex, setCurrentCollegeIndex] = useState(0);
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // 1. Filter students based on current ledger mode
  const filteredByMode = useMemo(() => {
    return students.filter(s => s.entryType === ledgerMode);
  }, [students, ledgerMode]);

  // 2. Group filtered students by College
  const colleges = useMemo(() => {
    const groups: Record<string, { name: string, code: string, students: StudentEntry[] }> = {};
    
    filteredByMode.forEach(s => {
        const key = s.collegeCode.trim();
        if (!groups[key]) {
            groups[key] = { 
                name: s.collegeName, 
                code: s.collegeCode, 
                students: [] 
            };
        }
        groups[key].students.push(s);
    });

    return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));
  }, [filteredByMode]);

  // Reset index on mode change
  useEffect(() => {
    setCurrentCollegeIndex(0);
  }, [ledgerMode]);

  // Handle Print All Sequence
  useEffect(() => {
    if (isPrintingAll) {
        const timer = setTimeout(() => {
            window.print();
            setIsPrintingAll(false);
        }, 1000);
        return () => clearTimeout(timer);
    }
  }, [isPrintingAll]);

  // Data Accessors
  const currentCollegeData = colleges[currentCollegeIndex];
  const currentStudents = currentCollegeData ? currentCollegeData.students : [];
  const collegeName = currentCollegeData ? currentCollegeData.name : '____________________';
  const collegeCode = currentCollegeData ? currentCollegeData.code : '____';

  // Get address for current college
  const currentCollegeAddress = useMemo(() => {
      const record = collegeAddresses.find(r => r.collegeCode === collegeCode);
      return record ? record.address : undefined;
  }, [collegeCode, collegeAddresses]);

  // --- Filtering for Letters ---
  // Cover Letter should only show students who have PAID (pendingFees <= 0)
  const paidStudents = useMemo(() => {
    return currentStudents.filter(s => s.pendingFees <= 0);
  }, [currentStudents]);

  // Discrepancy Letter should only show students who have PENDING FEES (pendingFees > 0)
  const unpaidStudents = useMemo(() => {
    return currentStudents.filter(s => s.pendingFees > 0);
  }, [currentStudents]);
  
  // Credit Note usually includes ALL students who have paid something
  const paidAnythingStudents = useMemo(() => {
      return currentStudents.filter(s => s.studentPayFees > 0);
  }, [currentStudents]);


  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    if (colleges.length === 0) return;
    if (confirm(`This will generate a print view for ALL ${colleges.length} colleges. Continue?`)) {
        setIsPrintingAll(true);
    }
  };

  // --- Helper Functions ---

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().split(/[\s-]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
  };

  const getResultRowData = (student: StudentEntry) => {
    const rows: any[] = [];
    let answerBooksCount = 0;
    let markSlipsCount = 0;

    student.years.forEach(year => {
        const selectedSubjects = year.subjects.filter(s => 
            s.papers.I || s.papers.II || s.papers.PR || s.papers.markSlipI || s.papers.markSlipII
        );

        if (selectedSubjects.length > 0) {
            let isTr = false;
            let isPr = false;
            const subjectStrings: string[] = [];
            
            selectedSubjects.forEach(s => {
                const parts = [];
                if (s.papers.I) { parts.push('I'); isTr = true; answerBooksCount++; }
                if (s.papers.II) { parts.push('II'); isTr = true; answerBooksCount++; }
                if (s.papers.PR) { isPr = true; }
                
                // For Markslips: Only add to string if NOT photocopy mode
                if (s.papers.markSlipI) { 
                    if (ledgerMode !== 'photocopy') parts.push('MS-I'); 
                    markSlipsCount++; 
                }
                if (s.papers.markSlipII) { 
                    if (ledgerMode !== 'photocopy') parts.push('MS-II'); 
                    markSlipsCount++; 
                }
                
                const suffix = parts.length > 0 ? `-${parts.join('-')}` : '';
                subjectStrings.push(`${s.subjectName}${suffix}`);
            });
            
            const cleanYear = year.yearName.replace('-', ' ').replace(' - ', ' ');
            const status = [];
            if (isTr) status.push('TR');
            if (isPr) status.push('PR');

            rows.push({
                year: cleanYear,
                subjects: subjectStrings,
                trPr: status.length > 0 ? status.join('/') : '-',
                remark: student.remark,
                answerBooks: answerBooksCount,
                markSlips: markSlipsCount
            });
        }
    });
    return rows;
  };

  // --- Helper to Render Result Sheet Table (Used in Cover Letter) ---
  const renderResultTable = (studentsForTable: StudentEntry[], colName: string, colCode: string) => (
    <div className="w-full text-black font-serif max-w-[210mm] mx-auto p-[15mm] bg-white min-h-[297mm] shadow-xl print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 print:p-8">
        {ledgerMode === 'photocopy' ? (
            <div className="font-bold text-center mb-4 text-lg underline">
                List of Candidate
            </div>
        ) : (
            <div className="mb-4 text-center">
                <div className="font-bold text-lg mb-1">
                    Name of College :- <span className="underline">{colName} ({colCode})</span>
                </div>
                <div className="font-bold text-lg">
                    Course :- <input 
                        type="text" 
                        value={courseName} 
                        onChange={(e) => setCourseName(e.target.value)} 
                        className="font-bold outline-none bg-transparent hover:bg-gray-50 focus:bg-gray-100 px-1 w-48 text-center text-black"
                    />
                </div>
            </div>
        )}

        <table className="w-full border-collapse border border-black text-sm text-black">
            <thead>
                <tr className="text-center">
                    <th className="border border-black p-2 w-12 align-middle font-bold text-black">Sr.<br/>No.</th>
                    <th className="border border-black p-2 w-16 align-middle font-bold text-black">Year</th>
                    <th className="border border-black p-2 w-24 align-middle font-bold text-black">Seat No.</th>
                    <th className={`border border-black p-2 align-middle font-bold text-black ${ledgerMode === 'photocopy' ? 'w-96' : ''}`}>Studnts Name</th>
                    <th className={`border border-black p-2 align-middle font-bold text-black ${ledgerMode === 'photocopy' ? 'w-32' : 'w-1/3'}`}>Subject</th>
                    
                    {ledgerMode === 'photocopy' ? (
                        <>
                            <th className="border border-black p-2 w-24 align-middle font-bold text-black">Answer<br/>Books</th>
                            <th className="border border-black p-2 w-24 align-middle font-bold text-black">Mark Slip</th>
                        </>
                    ) : (
                        <>
                            <th className="border border-black p-2 w-16 align-middle font-bold text-black">T/R<br/>P/R</th>
                            <th className="border border-black p-2 w-24 align-middle font-bold text-black">Remark<br/>Change/<br/>No Change</th>
                        </>
                    )}
                </tr>
            </thead>
            <tbody className="text-black">
                {studentsForTable.length === 0 ? (
                    <tr><td colSpan={7} className="border border-black p-8 text-center font-bold text-black">No Records</td></tr>
                ) : (
                    studentsForTable.map((student, idx) => {
                        const rowData = getResultRowData(student);
                        const yearDisplay = rowData.length > 0 ? rowData[0].year.split(' ').map((line: string, i: number) => <div key={i}>{line}</div>) : '-';
                        const subjectDisplay = rowData.map(r => r.subjects).flat();
                        const trPrDisplay = Array.from(new Set(rowData.map(r => r.trPr))).join('/');
                        const totalAnswerBooks = rowData.reduce((sum, r) => sum + r.answerBooks, 0);
                        const totalMarkSlips = rowData.reduce((sum, r) => sum + r.markSlips, 0);

                        return (
                            <tr key={student.id} className="text-black h-16">
                                <td className="border border-black p-2 text-center font-bold align-middle text-black">{idx + 1}</td>
                                <td className="border border-black p-2 text-center font-bold align-middle text-black">{yearDisplay}</td>
                                <td className="border border-black p-2 text-center font-bold align-middle text-black">{student.seatNo}</td>
                                <td className="border border-black p-2 font-bold align-middle text-black capitalize">{student.studentName}</td>
                                <td className="border border-black p-2 font-medium align-middle text-black">
                                    {subjectDisplay.map((sub, i) => <div key={i}>{sub}</div>)}
                                </td>
                                {ledgerMode === 'photocopy' ? (
                                    <>
                                        <td className="border border-black p-2 text-center font-bold align-middle text-black">
                                            {totalAnswerBooks > 0 ? `${String(totalAnswerBooks).padStart(2, '0')} Copies` : '-'}
                                        </td>
                                        <td className="border border-black p-2 text-center font-bold align-middle text-black">
                                            {totalMarkSlips > 0 ? `${String(totalMarkSlips).padStart(2, '0')} Copies` : '-'}
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="border border-black p-2 text-center font-bold align-middle text-black">{trPrDisplay}</td>
                                        <td className="border border-black p-2 text-center font-bold align-middle text-black">
                                            {student.remark || 'No Change'}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
        {ledgerMode === 'tr_pr' && (
            <div className="mt-4 text-sm text-black">
                <p>T/R= Theory Retotaling.</p>
                <p>P/R= Practical Retotalings.</p>
            </div>
        )}
        <div className="fixed bottom-4 right-8 print:block hidden">
             <p className="text-right text-xs">Page 1</p>
        </div>
    </div>
  );

  // --- Printing Loop ---
  if (isPrintingAll) {
      return (
          <div className="print:block bg-white text-black">
              {colleges.map((college, idx) => {
                  const addrRecord = collegeAddresses.find(r => r.collegeCode === college.code);
                  const addr = addrRecord ? addrRecord.address : undefined;

                  const printPaidStudents = college.students.filter(s => s.pendingFees <= 0);
                  const printUnpaidStudents = college.students.filter(s => s.pendingFees > 0);
                  const printPaidAnythingStudents = college.students.filter(s => s.studentPayFees > 0);

                  return (
                    <div key={college.code} className="print:break-after-page mb-8 border-b-2 border-dashed border-gray-300 pb-8 print:border-none print:mb-0 print:pb-0">
                        {viewMode === 'COVER_LETTER' && (
                            <CoverLetter 
                                collegeName={college.name} 
                                collegeCode={college.code} 
                                mode={ledgerMode}
                                collegeAddress={addr}
                                settings={letterSettings}
                                examName={currentExamName}
                                onBack={() => {}}
                            >
                                {renderResultTable(printPaidStudents, college.name, college.code)}
                            </CoverLetter>
                        )}
                        {viewMode === 'DISCREPANCY_TR' && (
                            <DiscrepancyLetter
                                mode="TR_PR"
                                students={printUnpaidStudents}
                                collegeName={college.name}
                                collegeCode={college.code}
                                collegeAddress={addr}
                                settings={letterSettings}
                                examName={currentExamName}
                                onBack={() => {}}
                            />
                        )}
                        {viewMode === 'DISCREPANCY_PHOTO' && (
                            <DiscrepancyLetter
                                mode="PHOTOCOPY"
                                students={printUnpaidStudents}
                                collegeName={college.name}
                                collegeCode={college.code}
                                collegeAddress={addr}
                                settings={letterSettings}
                                examName={currentExamName}
                                onBack={() => {}}
                            />
                        )}
                        {viewMode === 'CREDIT_NOTE' && (
                            <CreditNoteLetter
                                mode={ledgerMode === 'tr_pr' ? 'TR_PR' : 'PHOTOCOPY'}
                                students={printPaidAnythingStudents}
                                collegeName={college.name}
                                collegeCode={college.code}
                                collegeAddress={addr}
                                settings={letterSettings}
                                examName={currentExamName}
                                onBack={() => {}}
                            />
                        )}
                        {viewMode === 'LEDGER' && (
                            <div className="p-4 text-center font-bold">Main Ledger Matrix - Batch printing not supported for matrix view.</div>
                        )}
                    </div>
                  );
              })}
          </div>
      );
  }

  // --- View Switching Logic ---

  if (viewMode === 'MAIL_DASHBOARD') {
      return (
          <MailDashboard 
              students={students}
              collegeAddresses={collegeAddresses}
              letterSettings={letterSettings}
              currentExamName={currentExamName}
              onBack={() => setViewMode('LEDGER')}
          />
      );
  }

  if (viewMode === 'COVER_LETTER') {
    return (
        <CoverLetter 
            collegeName={collegeName} 
            collegeCode={collegeCode}
            mode={ledgerMode}
            collegeAddress={currentCollegeAddress}
            settings={letterSettings}
            examName={currentExamName}
            onBack={() => setViewMode('LEDGER')}
        >
            {renderResultTable(paidStudents, collegeName, collegeCode)}
        </CoverLetter>
    );
  }

  if (viewMode === 'DISCREPANCY_TR') {
    return (
      <DiscrepancyLetter
        mode="TR_PR"
        students={unpaidStudents}
        collegeName={collegeName}
        collegeCode={collegeCode}
        collegeAddress={currentCollegeAddress}
        settings={letterSettings}
        examName={currentExamName}
        onBack={() => setViewMode('LEDGER')}
      />
    );
  }

  if (viewMode === 'DISCREPANCY_PHOTO') {
    return (
      <DiscrepancyLetter
        mode="PHOTOCOPY"
        students={unpaidStudents}
        collegeName={collegeName}
        collegeCode={collegeCode}
        collegeAddress={currentCollegeAddress}
        settings={letterSettings}
        examName={currentExamName}
        onBack={() => setViewMode('LEDGER')}
      />
    );
  }

  if (viewMode === 'CREDIT_NOTE') {
      return (
          <CreditNoteLetter
            mode={ledgerMode === 'tr_pr' ? 'TR_PR' : 'PHOTOCOPY'}
            students={paidAnythingStudents}
            collegeName={collegeName}
            collegeCode={collegeCode}
            collegeAddress={currentCollegeAddress}
            settings={letterSettings}
            examName={currentExamName}
            onBack={() => setViewMode('LEDGER')}
          />
      );
  }

  // --- Detailed Ledger View Logic (Main Matrix) ---
  const paperCols = ledgerMode === 'tr_pr' ? 3 : 4;
  const paperLabels = ledgerMode === 'tr_pr' ? ['I', 'II', 'PR'] : ['I', 'MS', 'II', 'MS'];
  const maxSubjects = Math.max(...SUBJECT_CONFIG.map(y => y.subjects.length));
  
  const getStudentYear = (student: StudentEntry): string => {
      for (const year of student.years) {
          if (year.subjects.some(s => Object.values(s.papers).some(v => v))) { return year.yearName; }
      }
      return "-";
  };

  const renderCellChecks = (student: StudentEntry, slotIndex: number) => {
      const activeYearName = getStudentYear(student);
      const yearConfig = SUBJECT_CONFIG.find(y => y.year === activeYearName);
      if (!yearConfig || !yearConfig.subjects[slotIndex]) {
          return <>{Array(paperCols).fill(0).map((_, i) => <td key={i} className="border-r border-black"></td>)}</>;
      }
      const subjectName = yearConfig.subjects[slotIndex];
      const studentYearData = student.years.find(y => y.yearName === activeYearName);
      const subjectData = studentYearData?.subjects.find(s => s.subjectName === subjectName);
      const papers = subjectData?.papers;
      if (!papers) {
         return <>{Array(paperCols).fill(0).map((_, i) => <td key={i} className="border-r border-black"></td>)}</>;
      }
      if (ledgerMode === 'tr_pr') {
        return (
            <>
                <td className="border-r border-black text-center font-bold">{papers.I ? '✓' : ''}</td>
                <td className="border-r border-black text-center font-bold">{papers.II ? '✓' : ''}</td>
                <td className="border-r border-black text-center font-bold">{papers.PR ? '✓' : ''}</td>
            </>
        );
      } else {
        return (
            <>
                <td className="border-r border-black text-center font-bold">{papers.I ? '✓' : ''}</td>
                <td className="border-r border-black text-center font-bold">{papers.markSlipI ? '✓' : ''}</td>
                <td className="border-r border-black text-center font-bold">{papers.II ? '✓' : ''}</td>
                <td className="border-r border-black text-center font-bold">{papers.markSlipII ? '✓' : ''}</td>
            </>
        );
      }
  };

  const totalMatrixCols = maxSubjects * paperCols;
  const matrixTotals = new Array(totalMatrixCols).fill(0);

  currentStudents.forEach(student => {
      const yearName = getStudentYear(student);
      const yearConfig = SUBJECT_CONFIG.find(y => y.year === yearName);
      if(!yearConfig) return;
      yearConfig.subjects.forEach((subName, subjectIdx) => {
          const studentSubject = student.years.find(y => y.yearName === yearName)?.subjects.find(s => s.subjectName === subName);
          if(studentSubject) {
             const baseIdx = subjectIdx * paperCols;
             if (ledgerMode === 'tr_pr') {
                 if(studentSubject.papers.I) matrixTotals[baseIdx + 0]++;
                 if(studentSubject.papers.II) matrixTotals[baseIdx + 1]++;
                 if(studentSubject.papers.PR) matrixTotals[baseIdx + 2]++;
             } else {
                 if(studentSubject.papers.I) matrixTotals[baseIdx + 0]++;
                 if(studentSubject.papers.markSlipI) matrixTotals[baseIdx + 1]++;
                 if(studentSubject.papers.II) matrixTotals[baseIdx + 2]++;
                 if(studentSubject.papers.markSlipII) matrixTotals[baseIdx + 3]++;
             }
          }
      });
  });

  const totalSubSum = currentStudents.reduce((acc, s) => acc + s.totalSubjects, 0);
  const totalFeesSum = currentStudents.reduce((acc, s) => acc + s.totalFees, 0);
  const totalPendingSum = currentStudents.reduce((acc, s) => acc + s.pendingFees, 0);
  const totalPaidSum = currentStudents.reduce((acc, s) => acc + s.studentPayFees, 0);
  const totalReceivedSum = currentStudents.reduce((acc, s) => acc + s.totalFeesReceived, 0);

  return (
    <div className="bg-white min-h-screen text-black font-sans">
      {/* Navigation Header */}
      <div className="print:hidden bg-slate-800 text-white px-6 py-4 flex flex-col xl:flex-row justify-between items-center sticky top-0 z-20 shadow-md gap-4">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition-colors" title="Back to Dashboard">
            <ArrowLeft size={20} />
          </button>
          <div className="bg-slate-700 p-1 rounded-lg flex items-center">
             <button onClick={() => setLedgerMode('tr_pr')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${ledgerMode === 'tr_pr' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'}`}>
                <FileText size={14} /> TR/PR
             </button>
             <button onClick={() => setLedgerMode('photocopy')} className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${ledgerMode === 'photocopy' ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'}`}>
                <Copy size={14} /> Photocopy
             </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-700 p-1 rounded-lg">
             <button onClick={() => setCurrentCollegeIndex(prev => Math.max(0, prev - 1))} disabled={currentCollegeIndex === 0} className="p-1.5 hover:bg-slate-600 rounded disabled:opacity-50 transition-colors">
                <ChevronLeft size={16} />
             </button>
             <div className="flex items-center gap-2 px-2">
                <School size={16} className="text-slate-400" />
                <select value={currentCollegeIndex} onChange={(e) => setCurrentCollegeIndex(Number(e.target.value))} className="bg-transparent text-sm font-medium focus:outline-none max-w-[200px] truncate">
                    {colleges.length === 0 ? <option value={0}>No Data</option> : colleges.map((col, idx) => <option key={col.code} value={idx} className="text-black">{col.code} - {col.name}</option>)}
                </select>
             </div>
             <button onClick={() => setCurrentCollegeIndex(prev => Math.min(colleges.length - 1, prev + 1))} disabled={currentCollegeIndex >= colleges.length - 1} className="p-1.5 hover:bg-slate-600 rounded disabled:opacity-50 transition-colors">
                <ChevronRight size={16} />
             </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-end w-full xl:w-auto">
             <button onClick={() => setViewMode('MAIL_DASHBOARD')} className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2 border border-teal-400">
                <Send size={14} /> Send Mail Data
            </button>
            <div className="w-px h-8 bg-slate-600 mx-1"></div>
             
             <button onClick={() => setViewMode('CREDIT_NOTE')} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2">
                <Receipt size={14} /> Credit Note
            </button>

             {ledgerMode === 'tr_pr' && (
                 <button onClick={() => setViewMode('DISCREPANCY_TR')} className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2">
                    <AlertTriangle size={14} /> Discrepancy (TR/PR)
                </button>
             )}
             {ledgerMode === 'photocopy' && (
                 <button onClick={() => setViewMode('DISCREPANCY_PHOTO')} className="px-3 py-2 rounded-lg bg-orange-700 hover:bg-orange-600 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2">
                    <AlertTriangle size={14} /> Discrepancy (Photo)
                </button>
             )}
             <button onClick={() => setViewMode('COVER_LETTER')} className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2">
                <Mail size={14} /> Generate Letter
            </button>
            <div className="flex gap-1">
                <button onClick={handlePrint} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2">
                    <Printer size={14} /> Print
                </button>
                <button onClick={handlePrintAll} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg flex items-center gap-2" title="Print for All Colleges">
                    <Layers size={14} /> All
                </button>
            </div>
        </div>
      </div>

      <div className="p-2 md:p-8 print:p-0 w-full overflow-x-auto text-black print:text-[10px]">
        {/* Ledger Matrix Table */}
        <div className="border border-black mb-0 text-black text-center p-1 font-bold">
            <h1 className="text-xl">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES, NASHIK</h1>
            <h2 className="text-lg">THEORY PAPER RE-TOTALING/VERYFICATION ({currentExamName}) EXAMINATION</h2>
        </div>
        <div className="border-l border-r border-b border-black mb-0 text-black">
           <div className="flex bg-white print:bg-transparent">
            <div className="p-1 border-r border-black font-bold text-base flex items-center">
                C_Code:- {collegeCode}
            </div>
            <div className="flex-1 p-1 font-bold text-base flex items-center">
              Name of College :- <span className="ml-2 uppercase">{collegeName} ({collegeCode})</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border-l border-r border-b border-black text-xs leading-tight text-black">
          {/* ... Table Header and Body (Unchanged logic, just structure) ... */}
          <thead>
            <tr className="border-b border-black">
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-10 bg-white print:bg-white text-black p-1">SR.<br/>NO.</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-12 rotate-180 [writing-mode:vertical-rl] text-center bg-white print:bg-white text-black p-1">Inward<br/>No. &<br/>Date</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 rotate-180 [writing-mode:vertical-rl] text-center bg-white print:bg-white text-black p-1">Seat No.</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black min-w-[180px] bg-white print:bg-white text-lg text-black p-2">Students Name</th>
              <th colSpan={1 + (maxSubjects * paperCols)} className="border-r border-black p-1 bg-white print:bg-white text-black font-bold text-base h-[30px]">Subject Applied for</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-10 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Total sub.</th>
              
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-20 rotate-180 text-center [writing-mode:vertical-rl] bg-white print:bg-white text-black font-bold">Total fees</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-20 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Pending fees if<br/>Fee Less Exess</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-20 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Student pay fees</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">DD.NO.\<br/>Online Payment</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">D.D. DATE \<br/>Online RS. Date</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 bg-white print:bg-white text-black font-bold p-1">Bank</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Dispatch Date /<br/>Send To College Mail</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-24 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">TOTAL FEES RECEIVED</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-10 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Checked By</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-16 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Signature of I/C Faculty</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="border-r border-black w-16 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Signature of Finance for D.D.<br/>Received</th>
              <th rowSpan={SUBJECT_CONFIG.length + 2} className="w-16 rotate-180 text-center [writing-mode:vertical-rl] px-1 bg-white print:bg-white text-black font-bold">Remark Dispatch Details</th>
            </tr>
            {SUBJECT_CONFIG.map((year, i) => (
                <tr key={i} className="border-b border-black bg-white print:bg-white text-black">
                    <th className="border-r border-black p-1 text-center font-bold text-xs whitespace-nowrap bg-gray-50 print:bg-white w-[80px]">{year.year}</th>
                    {Array.from({ length: maxSubjects }).map((_, slotIdx) => {
                        const subjectName = year.subjects[slotIdx];
                        return <th key={slotIdx} colSpan={paperCols} className="border-r border-black p-1 text-center font-bold text-[10px] align-middle">{subjectName ? getShortSubjectName(subjectName) : ''}</th>
                    })}
                </tr>
            ))}
            <tr className="border-b border-black bg-white print:bg-white text-black">
                <th className="border-r border-black text-center font-bold text-[9px] p-1">Paper</th>
                {Array.from({ length: maxSubjects }).map((_, slotIdx) => (
                     <React.Fragment key={slotIdx}>
                        {paperLabels.map((label, pIdx) => <th key={`${slotIdx}-${pIdx}`} className="border-r border-black text-center font-bold text-[9px] min-w-[15px]">{label}</th>)}
                     </React.Fragment>
                ))}
            </tr>
          </thead>
          <tbody className="text-black">
             {currentStudents.map((student, index) => {
                const studentYear = getStudentYear(student);
                const payments = student.payments || (student.studentPayFees > 0 ? [{
                     amount: student.studentPayFees,
                     ddNo: student.ddNo,
                     ddDate: student.ddDate,
                     bankName: student.bankName
                }] : []);
                
                return (
                    <tr key={student.id} className="border-b border-black hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="border-r border-black text-center font-bold py-1 align-top">{index + 1}</td>
                        <td className="border-r border-black text-center align-top"><div className="font-bold leading-tight">{student.inwardNo}</div><div className="text-[9px] leading-tight">{student.inwardDate.split('-').reverse().join('-')}</div></td>
                        <td className="border-r border-black text-center font-bold font-mono align-top">{student.seatNo}</td>
                        <td className="border-r border-black px-2 font-bold uppercase whitespace-nowrap align-top">{student.studentName}</td>
                        <td className="border-r border-black text-center font-bold text-[10px] whitespace-nowrap bg-gray-50 print:bg-transparent align-top">{studentYear}</td>
                        {Array.from({ length: maxSubjects }).map((_, slotIdx) => <React.Fragment key={slotIdx}>{renderCellChecks(student, slotIdx)}</React.Fragment>)}
                        <td className="border-r border-black text-center font-bold align-top">{student.totalSubjects}</td>
                        <td className="border-r border-black text-right px-1 font-bold align-top whitespace-nowrap">₹ {student.totalFees.toLocaleString()}</td>
                        <td className="border-r border-black text-right px-1 font-bold text-red-600 align-top whitespace-nowrap">{student.pendingFees !== 0 ? `-₹ ${Math.abs(student.pendingFees)}` : '₹ 0'}</td>
                        <td className="border-r border-black text-right px-1 font-bold align-top whitespace-nowrap">
                             {payments.map((p, idx) => (
                                 <div key={idx} className={idx > 0 ? 'border-t border-gray-300 mt-1 pt-1' : ''}>₹ {Number(p.amount).toLocaleString()}</div>
                             ))}
                             {payments.length === 0 && '₹ 0'}
                        </td>
                        <td className="border-r border-black px-1 text-center font-mono text-[10px] align-top whitespace-nowrap">
                             {payments.map((p, idx) => (
                                 <div key={idx} className={idx > 0 ? 'border-t border-gray-300 mt-1 pt-1' : ''}>{p.ddNo}</div>
                             ))}
                        </td>
                        <td className="border-r border-black px-1 text-center text-[10px] align-top whitespace-nowrap">
                             {payments.map((p, idx) => (
                                 <div key={idx} className={idx > 0 ? 'border-t border-gray-300 mt-1 pt-1' : ''}>{p.ddDate ? p.ddDate.split('-').reverse().join('-') : ''}</div>
                             ))}
                        </td>
                        <td className="border-r border-black px-1 text-center text-[10px] align-top whitespace-nowrap">
                             {payments.map((p, idx) => (
                                 <div key={idx} className={idx > 0 ? 'border-t border-gray-300 mt-1 pt-1' : ''}>{p.bankName}</div>
                             ))}
                        </td>
                        <td className="border-r border-black px-1 text-center text-[10px] align-top whitespace-nowrap">{student.dispatchDate}</td>
                        <td className="border-r border-black px-1 text-right font-bold align-top whitespace-nowrap">{student.totalFeesReceived > 0 ? `₹ ${student.totalFeesReceived.toLocaleString()}` : ''}</td>
                        <td className="border-r border-black px-1 text-center text-[10px] align-top">{student.checkedBy}</td>
                        <td className="border-r border-black px-1 align-top"></td>
                        <td className="border-r border-black px-1 align-top"></td>
                        <td className="px-1 text-center text-[10px] align-top">{student.remark}</td>
                    </tr>
                );
             })}
             <tr className="bg-gray-100 print:bg-white font-bold border-b border-black">
                <td className="border-r border-black p-2 text-center">Total</td>
                <td className="border-r border-black p-2 text-center">{currentStudents.length}</td>
                <td colSpan={2} className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                {matrixTotals.map((total, idx) => <td key={idx} className="border-r border-black text-center text-[10px]">{total}</td>)}
                <td className="border-r border-black text-center">{totalSubSum}</td>
                <td className="border-r border-black text-right px-1 whitespace-nowrap">₹ {totalFeesSum.toLocaleString()}</td>
                <td className="border-r border-black text-right px-1 text-red-600 whitespace-nowrap">₹ {totalPendingSum.toLocaleString()}</td>
                <td className="border-r border-black text-right px-1 whitespace-nowrap">₹ {totalPaidSum.toLocaleString()}</td>
                <td colSpan={4} className="border-r border-black"></td>
                <td className="border-r border-black text-right px-1 whitespace-nowrap">₹ {totalReceivedSum.toLocaleString()}</td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td className="border-r border-black"></td>
                <td></td>
             </tr>
          </tbody>
        </table>
      </div>

      <style>{`
        @media print {
            @page {
                size: A3 landscape;
                margin-top: 10mm;
                margin-bottom: 10mm;
                margin-left: 25.4mm;
                margin-right: 12.7mm;
            }
            body {
                background-color: white;
                font-family: 'Arial', sans-serif;
                color: #000 !important;
                width: 100%;
            }
            .print\\:hidden {
                display: none !important;
            }
        }
      `}</style>
    </div>
  );
};

export default Ledger;
