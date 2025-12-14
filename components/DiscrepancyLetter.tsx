
import React, { useState, useEffect } from 'react';
import { StudentEntry, LetterSettings } from '../types';
import { ArrowLeft, Printer } from 'lucide-react';

interface DiscrepancyLetterProps {
  collegeName: string;
  collegeCode: string;
  students: StudentEntry[];
  mode: 'TR_PR' | 'PHOTOCOPY';
  onBack: () => void;
  collegeAddress?: string;
  settings: LetterSettings;
  examName: string;
}

const DiscrepancyLetter: React.FC<DiscrepancyLetterProps> = ({
  collegeName,
  collegeCode,
  students,
  mode,
  onBack,
  collegeAddress,
  settings,
  examName
}) => {
  const [refNo, setRefNo] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-GB').replace(/\//g, ' / '));

  const handlePrint = () => {
    window.print();
  };

  // Generate the repeating MUHS string
  const muhsString = Array(350).fill("MUHS").join("");

  // Helper to calculate TR/PR status and Subjects string
  const getStudentData = (student: StudentEntry) => {
    const subjects: string[] = [];
    let isTr = false;
    let isPr = false;

    student.years.forEach(year => {
        year.subjects.forEach(sub => {
            const p = sub.papers;
            // Check if any paper is selected for this subject
            const hasSelection = p.I || p.II || p.PR || p.markSlipI || p.markSlipII;
            
            if (hasSelection) {
                // Build the suffix string based on selection (e.g., -I-II)
                // Note: PR is intentionally EXCLUDED from the subject string as per user request
                const parts = [];
                if (p.I) parts.push('I');
                if (p.II) parts.push('II');
                
                if (p.markSlipI) parts.push('MS-I');
                if (p.markSlipII) parts.push('MS-II');

                const suffix = parts.length > 0 ? `-${parts.join('-')}` : '';
                
                // Show Full Subject Name + Suffix (without PR)
                subjects.push(`${sub.subjectName}${suffix}`);
                
                if (p.I || p.II) isTr = true;
                if (p.PR) isPr = true;
            }
        });
    });

    let trPrStatus = '-';
    if (mode === 'PHOTOCOPY') {
        trPrStatus = 'PHOTO'; // For Photocopy mode
    } else {
        if (isTr && isPr) trPrStatus = 'TR/PR';
        else if (isTr) trPrStatus = 'TR';
        else if (isPr) trPrStatus = 'PR';
    }

    return {
        subjectString: subjects.join(', '),
        trPrStatus
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 text-black font-serif relative">
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
          <Printer size={16} /> Print Letter
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-[15mm] shadow-xl print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 print:p-8">
        
        {/* --- HEADER START --- */}
        <div className="flex items-start justify-center gap-4 mb-2">
            {/* Logo */}
            {settings.universityLogo ? (
                <div className="w-24 h-24 flex-shrink-0">
                    <img src={settings.universityLogo} alt="MUHS Logo" className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className="w-24 h-24 flex-shrink-0 border border-gray-300 flex items-center justify-center text-xs text-gray-400 print:hidden">No Logo</div>
            )}
            
            {/* University Details */}
            <div className="text-center flex-1">
                <h1 className="text-2xl font-bold text-black mb-1 leading-none">महाराष्ट्र आरोग्य विज्ञान विद्यापीठ, नाशिक</h1>
                <h2 className="text-lg font-bold text-black uppercase tracking-wide mb-1 leading-none">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES, NASHIK</h2>
                <p className="text-sm font-bold leading-tight">दिंडोरी रोड, म्हसरूळ, नाशिक - ४२२००४ Dindori Road, Mhasrul, Nashik - 422004</p>
                <p className="text-xs font-bold mt-1 leading-tight">EPABX: 0253- 2539100/300, Fax: 0253 - 2539134, Ph.: 2539138/216</p>
                <p className="text-xs font-bold leading-tight">Email: ugexammedical@muhs.ac.in Website: www.muhs.ac.in</p>
            </div>
        </div>

        {/* Officer Details Row */}
        <div className="border-t-2 border-black py-1 flex justify-between items-start">
            <div className="w-1/2 text-left border-r-0 border-black pr-2">
                <p className="font-bold text-base leading-snug">{settings.officerNameMr || 'श्री. प्रविण म. पटले'}</p>
                <p className="font-bold text-sm leading-snug">{settings.officerDesigMr || 'कक्ष अधिकारी.'}</p>
                <p className="font-bold text-sm leading-snug">{settings.officerDeptMr || 'वैद्यकीय विद्याशाखा'}</p>
            </div>
            <div className="w-1/2 text-right pl-2">
                <p className="font-bold text-base leading-snug">{settings.officerNameEn || 'Shri. Pravin M. Patle'}</p>
                <p className="font-bold text-sm leading-snug">{settings.officerDesigEn || 'Section Officer'}</p>
                <p className="font-bold text-sm leading-snug">{settings.officerDeptEn || 'Medical Faculty(UG)'}</p>
            </div>
        </div>

        {/* MUHS Micro Text Line - Removed mb-6 to touch the Ref No line */}
        <div className="w-full overflow-hidden text-[5px] font-bold border-t border-b border-black leading-none whitespace-nowrap select-none tracking-tight">
            {muhsString}
        </div>
        {/* --- HEADER END --- */}

        {/* Ref No & Date */}
        <div className="flex justify-between items-center mb-6 font-bold text-sm">
            <div className="flex items-center">
                <span>Ref. No.: MUHS/X-1/UG/</span>
                <input 
                    type="text" 
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-20 mx-1 border-b border-black outline-none text-center bg-transparent"
                    placeholder="8878"
                />
                <span>/{new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center">
                <span>Date:-</span>
                <input 
                    type="text" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-32 mx-1 border-b border-black outline-none text-right bg-transparent"
                />
            </div>
        </div>

        {/* To Address & Box Code */}
        <div className="flex justify-between items-start mb-6">
            <div className="text-sm font-bold w-2/3">
                <p className="mb-1">To,</p>
                <p className="mb-1">The Dean/Principal</p>
                <p className="uppercase mb-1">{collegeName}</p>
                <p className="whitespace-pre-wrap font-normal leading-snug max-w-sm">{collegeAddress || 'Address Not Available'}</p>
            </div>
            <div className="border-2 border-black px-6 py-2 font-bold text-lg h-fit">
                {collegeCode}
            </div>
        </div>

        {/* Subject */}
        <div className="text-center mb-6 px-4">
            <p className="font-bold text-sm leading-relaxed">
                Sub: - Regarding Discrepancy in Fee Amount for {mode === 'TR_PR' ? 'Theory Retotaling / Practical Retotaling' : 'Photocopy Verification'} of <br />
                {examName.replace(/_/g, ' ')} Examination.
            </p>
        </div>

        {/* Body */}
        <div className="text-sm text-justify leading-relaxed font-medium">
            <p className="mb-2 font-bold">Sir / Madam,</p>
            <p className="mb-2">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;With reference to the subject cited above, it is observed that the following students have submitted their application forms for 
                {mode === 'TR_PR' ? ' Theory Retotaling / Practical Retotaling' : ' Photocopy Verification'} but the requisite fee has not been received / is short.
            </p>
            <p className="mb-4">
                You are requested to recover the pending amount from the concerned students and submit it to the University immediately.
            </p>
            
            {/* Table of Discrepancies */}
            <table className="w-full border-collapse border border-black text-sm text-black mb-4 mt-4">
                <thead>
                    <tr className="bg-gray-100 print:bg-gray-200 text-center font-bold">
                        <th className="border border-black p-2 w-10">Sr.</th>
                        <th className="border border-black p-2">Student Name</th>
                        <th className="border border-black p-2 w-20">Seat No</th>
                        <th className="border border-black p-2 w-32">Subject</th>
                        <th className="border border-black p-2 w-16">TR/PR</th>
                        <th className="border border-black p-2 w-48">Discrepancy</th>
                    </tr>
                </thead>
                <tbody>
                    {students.length === 0 ? (
                        <tr><td colSpan={6} className="border border-black p-4 text-center">No Discrepancies Found</td></tr>
                    ) : (
                        students.map((s, idx) => {
                            const { subjectString, trPrStatus } = getStudentData(s);
                            return (
                                <tr key={s.id}>
                                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                                    <td className="border border-black p-2 font-bold">{s.studentName}</td>
                                    <td className="border border-black p-2 text-center">{s.seatNo}</td>
                                    <td className="border border-black p-2 text-center">{subjectString}</td>
                                    <td className="border border-black p-2 text-center font-bold">{trPrStatus}</td>
                                    <td className="border border-black p-2 text-center font-bold text-red-700">
                                        Less Fees {s.pendingFees} /- Payment Receipt Pending
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            <p>Thanking you,</p>
        </div>

        {/* Signature Block */}
        <div className="mt-12 flex justify-end">
            <div className="text-center w-64">
                <p className="font-bold mb-8">Yours,</p>
                
                {settings.signatureImage && (
                    <div className="flex justify-center mb-2">
                        <img 
                            src={settings.signatureImage} 
                            alt="Signature" 
                            className="h-16 object-contain" 
                            style={{ filter: 'grayscale(100%) contrast(120%)' }}
                        />
                    </div>
                )}
                
                <p className="font-bold">Section Officer</p>
                <p className="font-bold">Medical Faculty(UG)</p>
            </div>
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

export default DiscrepancyLetter;
