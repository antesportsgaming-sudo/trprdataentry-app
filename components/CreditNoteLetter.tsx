
import React, { useState, useEffect } from 'react';
import { StudentEntry, LetterSettings } from '../types';
import { Printer, ArrowLeft } from 'lucide-react';

interface CreditNoteLetterProps {
  collegeName: string;
  collegeCode: string;
  students: StudentEntry[];
  mode: 'TR_PR' | 'PHOTOCOPY';
  onBack: () => void;
  collegeAddress?: string;
  settings?: LetterSettings;
  examName: string;
}

const CreditNoteLetter: React.FC<CreditNoteLetterProps> = ({ 
    collegeName, 
    collegeCode, 
    students, 
    mode, 
    onBack, 
    settings,
    examName
}) => {
  const [currentExamName, setCurrentExamName] = useState(examName);
  const [facultyName, setFacultyName] = useState('Medical Faculty (UG)');

  // Initialize faculty name based on settings if available, else default
  useEffect(() => {
    if (settings?.officerDeptEn) {
        setFacultyName(settings.officerDeptEn);
    }
  }, [settings]);

  useEffect(() => {
    setCurrentExamName(examName);
  }, [examName]);

  const handlePrint = () => {
    window.print();
  };

  // --- Calculations ---

  // Filter to exclude Online Payments (Only Physical DDs/RTGS should be in Credit Note)
  const physicalStudents = students.filter(s => {
      const bank = (s.bankName || '').toUpperCase();
      // Exclude if it is strictly Online Payment or contains it
      return !bank.includes('ONLINE PAYMENT');
  });
  
  // 1. Separate students by type (using filtered list)
  const trPrStudents = physicalStudents.filter(s => s.entryType === 'tr_pr');
  const photoStudents = physicalStudents.filter(s => s.entryType === 'photocopy');

  // 2. Calculate Counts
  const trPrCount = trPrStudents.length;
  const photoCount = photoStudents.length;
  const totalStudentsCount = physicalStudents.length;

  // 3. Calculate Amounts
  const trPrAmount = trPrStudents.reduce((sum, s) => sum + (s.studentPayFees || 0), 0);
  const photoAmount = photoStudents.reduce((sum, s) => sum + (s.studentPayFees || 0), 0);
  
  const excessAmount = 0; // Placeholder for Row 20
  const lessAmount = 0;   // Placeholder for Row 21

  const totalAmount = trPrAmount + photoAmount + excessAmount - lessAmount;

  // --- Number to Words ---
  const numberToWords = (num: number): string => {
    const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    if (num === 0) return 'Zero';
    const numStr = Math.floor(num).toString();
    if (numStr.length > 9) return 'Overflow'; // Simple guard

    const getLT20 = (n: number) => a[Number(n)];
    const get20Plus = (n: number) => b[Number(n.toString()[0])] + ' ' + a[Number(n.toString()[1])];

    const convertGroup = (n: number): string => {
        if (n < 20) return getLT20(n);
        if (n < 100) return get20Plus(n);
        return a[Math.floor(n/100)] + 'Hundred ' + (n%100 !== 0 ? 'and ' + convertGroup(n%100) : '');
    }
    
    // Quick implementation for thousands/lakhs
    if (num < 1000) return convertGroup(num);
    if (num < 100000) return convertGroup(Math.floor(num/1000)) + 'Thousand ' + (num%1000 !== 0 ? convertGroup(num%1000) : '');
    if (num < 10000000) return convertGroup(Math.floor(num/100000)) + 'Lakh ' + (num%100000 !== 0 ? convertGroup(num%100000) : '');

    return String(num);
  };

  const totalAmountWords = numberToWords(totalAmount).trim() + " Only";

  const studentsWithPayments = physicalStudents.filter(s => s.studentPayFees > 0 || s.ddNo);
  const srNosString = studentsWithPayments.map((_, i) => i + 1).join(', ');

  const isSingleStudent = totalStudentsCount === 1;
  const studentDisplayValue = isSingleStudent ? physicalStudents[0].studentName.toUpperCase() : totalStudentsCount;

  return (
    <div className="min-h-screen bg-gray-100 font-serif text-black">
       {/* Action Bar */}
       <div className="print:hidden bg-slate-800 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <button 
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
        >
          <Printer size={16} /> Print Credit Note
        </button>
      </div>

      {/* A4 Page */}
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-[10mm] shadow-xl print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 print:p-4">
        
        {/* Header Section with Logo Left & Address Center */}
        <div className="flex items-start justify-center gap-4 mb-4">
             {/* Logo */}
             {settings?.universityLogo ? (
                <div className="w-24 h-24 flex-shrink-0">
                    <img 
                        src={settings.universityLogo} 
                        alt="University Logo" 
                        className="w-full h-full object-contain" 
                    />
                </div>
             ) : (
                <div className="w-24 h-24 flex-shrink-0 border border-gray-300 flex items-center justify-center text-xs text-gray-400 print:hidden">No Logo</div>
             )}

             {/* University Details */}
             <div className="text-center flex-1">
                <h1 className="text-xl font-bold uppercase tracking-wide text-black mb-1 leading-none">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES, NASHIK</h1>
                <p className="text-sm font-bold text-black leading-tight">दिंडोरी रोड, म्हसरूळ, नाशिक - ४२२००४ Dindori Road, Mhasrul, Nashik - 422004</p>
                
                <div className="mt-2 font-bold text-black">
                    <span className="underline">Exam Section</span> <span className="underline ml-2">{currentExamName.replace(/_/g, ' ')}</span>
                </div>
                
                <h2 className="text-lg font-bold mt-2 underline text-black">SUBMISSION OF DDs TO FINANCE SECTION</h2>
             </div>
        </div>

        {/* College & Faculty Info */}
        <div className="mb-4 font-bold text-sm text-black">
            <div className="text-center mb-2">
                <p>College Code & Name</p>
            </div>
            <div className="flex justify-between items-end">
                <div className="pl-8">{collegeCode}</div>
                <div className="pr-8 uppercase flex-1 text-center">{collegeName}</div>
            </div>
            
            <div className="mt-4 flex justify-between items-center border border-black p-2">
                 <div className="flex items-center gap-2 flex-1">
                    <span>Student Name:</span>
                    <div className={`border border-black px-4 py-1 text-center ${isSingleStudent ? 'flex-1 mx-2' : 'min-w-[60px]'}`}>
                        {studentDisplayValue}
                    </div>
                    {!isSingleStudent && <span>STUDENTS</span>}
                 </div>
                 <div className="uppercase ml-4 whitespace-nowrap">
                    Faculty: {facultyName}
                 </div>
            </div>
        </div>

        {/* Table 1: Account Heads */}
        <div className="mb-1">
            <div className="text-center font-bold mb-1 text-black">DETAILS OF ACCOUNT HEADS</div>
            <table className="w-full border-collapse border border-black text-sm text-black">
                <thead>
                    <tr className="text-center">
                        <th className="border border-black p-1 w-12 text-black font-bold">Sr No</th>
                        <th className="border border-black p-1 text-black font-bold">Account Head</th>
                        <th className="border border-black p-1 w-20 text-black font-bold">Tick Here</th>
                        <th className="border border-black p-1 w-20 text-black font-bold">No. of<br/>Studs</th>
                        <th className="border border-black p-1 w-32 text-black font-bold">Amount (Rs)</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Row 11: Marks Verification */}
                    <tr className="h-10">
                        <td className="border border-black text-center">11</td>
                        <td className="border border-black px-2">Marks Verification Fee</td>
                        <td className="border border-black text-center font-bold">{trPrCount > 0 ? '√' : ''}</td>
                        <td className="border border-black text-center font-bold">{trPrCount}</td>
                        <td className="border border-black text-right px-2 font-bold">{trPrAmount > 0 ? `₹ ${trPrAmount}` : ''}</td>
                    </tr>
                    {/* Row 12: Photocopy */}
                    <tr className="h-10">
                        <td className="border border-black text-center">12</td>
                        <td className="border border-black px-2">Photocopy of Theory Ans. Book</td>
                        <td className="border border-black text-center font-bold">{photoCount > 0 ? '√' : ''}</td>
                        <td className="border border-black text-center font-bold">{photoCount}</td>
                        <td className="border border-black text-right px-2 font-bold">{photoAmount > 0 ? `₹ ${photoAmount}` : ''}</td>
                    </tr>
                    {/* Row 20: Excess Fee */}
                    <tr className="h-10">
                        <td className="border border-black text-center">20</td>
                        <td className="border border-black px-2">Excess Fee against. . . . .</td>
                        <td className="border border-black text-center"></td>
                        <td className="border border-black text-center"></td>
                        <td className="border border-black text-right px-2"></td>
                    </tr>
                    {/* Row 21: If Fee Less Excess */}
                    <tr className="h-10">
                        <td className="border border-black text-center">21</td>
                        <td className="border border-black px-2">If Fee Less Exess</td>
                        <td className="border border-black text-center"></td>
                        <td className="border border-black text-center"></td>
                        <td className="border border-black text-right px-2"></td>
                    </tr>
                    {/* Rupees Words & Total */}
                    <tr>
                        <td colSpan={3} className="border border-black p-2 align-top h-16">
                            <div className="mb-1">Rupees In Words</div>
                            <div className="font-bold italic uppercase text-sm">{totalAmountWords}</div>
                        </td>
                        <td className="border border-black text-center font-bold align-middle">Total</td>
                        <td className="border border-black text-right px-2 font-bold align-middle text-lg">₹ {totalAmount}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        {/* Lower Section Page 1 */}
        <div className="mt-4 text-sm font-bold text-black">
            {/* Row 1: Ref No and Date aligned horizontally */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span>(DD details overleaf)</span>
                    <span>X-1/ {srNosString} /2024</span>
                </div>
                <div>
                    Date:- {new Date().toLocaleDateString('en-GB')}
                </div>
            </div>
            
            {/* Row 2: Signature Block */}
            <div className="mt-32 text-right">
                <p>I/c Faculty/Section</p>
                <p>{facultyName}</p>
            </div>
        </div>

        {/* Page Break for DD Details */}
        <div className="print:break-before-page mt-8 pt-4 border-t-2 border-dashed border-gray-300 print:border-none text-black">
            <div className="text-center font-bold text-lg mb-2">DETAILS OF DDs</div>
            
            <table className="w-full border-collapse border border-black text-sm text-black">
                <thead>
                    <tr className="bg-gray-100 print:bg-transparent text-center text-black">
                        <th className="border border-black p-1 w-12 text-black font-bold">Sr No</th>
                        <th className="border border-black p-1 text-black font-bold">Bank Instrument No (DD/RTGS)</th>
                        <th className="border border-black p-1 w-24 text-black font-bold">Date</th>
                        <th className="border border-black p-1 text-black font-bold">Bank</th>
                        <th className="border border-black p-1 w-32 text-black font-bold">Amount (Rs)</th>
                    </tr>
                </thead>
                <tbody>
                    {studentsWithPayments.length === 0 ? (
                        <tr><td colSpan={5} className="border border-black p-4 text-center">No Physical Payments (DD/RTGS) Recorded</td></tr>
                    ) : (
                        studentsWithPayments.map((student, idx) => (
                            <tr key={student.id}>
                                <td className="border border-black text-center p-1">{idx + 1}</td>
                                <td className="border border-black text-center p-1 font-mono">{student.ddNo || '-'}</td>
                                <td className="border border-black text-center p-1">{student.ddDate ? student.ddDate.split('-').reverse().join('-') : '-'}</td>
                                <td className="border border-black text-center p-1 text-xs">{student.bankName || '-'}</td>
                                <td className="border border-black text-right p-1 font-bold">₹ {student.studentPayFees}</td>
                            </tr>
                        ))
                    )}
                    
                    {Array.from({ length: Math.max(0, 5 - studentsWithPayments.length) }).map((_, i) => (
                        <tr key={`empty-${i}`} className="h-8">
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                            <td className="border border-black"></td>
                        </tr>
                    ))}

                    <tr className="font-bold">
                        <td colSpan={2} className="border border-black p-2 text-right">Total No. of DDs: {studentsWithPayments.length}</td>
                        <td colSpan={2} className="border border-black p-2 text-right">Total</td>
                        <td className="border border-black p-2 text-right">₹ {totalAmount}</td>
                    </tr>
                     <tr>
                        <td colSpan={5} className="border border-black p-2">
                             Rupees In Words: <span className="italic uppercase ml-2">{totalAmountWords}</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

      </div>

      <style>{`
        @media print {
            @page {
                size: A4;
                margin: 0;
            }
            body {
                background-color: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .print\\:hidden {
                display: none !important;
            }
            .print\\:break-before-page {
                break-before: page;
            }
        }
      `}</style>
    </div>
  );
};

export default CreditNoteLetter;
