import React, { useState, useEffect } from 'react';
import { StudentEntry, LetterSettings } from '../types';
import { Printer, ArrowLeft, Upload } from 'lucide-react';

interface DiscrepancyLetterProps {
  collegeName: string;
  collegeCode: string;
  students: StudentEntry[];
  mode: 'TR_PR' | 'PHOTOCOPY';
  onBack: () => void;
  collegeAddress?: string;
  settings?: LetterSettings;
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
  // Editable states
  const [outwardNo, setOutwardNo] = useState('8879');
  const [refYear, setRefYear] = useState('2025');
  const [date, setDate] = useState('06/11/2025');
  const [course, setCourse] = useState('II MBBS');
  
  const [address, setAddress] = useState(`To,\nThe Dean/Principal\n${collegeName}\nSolapur Road, Wanawadi,\nPune – 411 040.`);
  const [currentExamName, setCurrentExamName] = useState(examName);
  const [logo, setLogo] = useState<string | null>(null);
  
  // Officer Details
  const [officerNameMr, setOfficerNameMr] = useState('श्री. प्रविण म. पटले');
  const [officerDesigMr, setOfficerDesigMr] = useState('कक्ष अधिकारी.');
  const [officerDeptMr, setOfficerDeptMr] = useState('वैद्यकीय विद्याशाखा');
  
  const [officerNameEn, setOfficerNameEn] = useState('Shri. Pravin M. Patle');
  const [officerDesigEn, setOfficerDesigEn] = useState('Section Officer');
  const [officerDeptEn, setOfficerDeptEn] = useState('Medical Faculty(UG)');
  const [signatureImage, setSignatureImage] = useState<string | undefined>(undefined);

  // Initialize with settings if provided
  useEffect(() => {
    if (settings) {
        setOfficerNameMr(settings.officerNameMr || 'श्री. प्रविण म. पटले');
        setOfficerDesigMr(settings.officerDesigMr || 'कक्ष अधिकारी.');
        setOfficerDeptMr(settings.officerDeptMr || 'वैद्यकीय विद्याशाखा');
        setOfficerNameEn(settings.officerNameEn || 'Shri. Pravin M. Patle');
        setOfficerDesigEn(settings.officerDesigEn || 'Section Officer');
        setOfficerDeptEn(settings.officerDeptEn || 'Medical Faculty(UG)');
        setSignatureImage(settings.signatureImage);
    }
  }, [settings]);

  // Sync with prop
  useEffect(() => {
    setCurrentExamName(examName);
  }, [examName]);

  useEffect(() => {
    if (collegeAddress) {
        setAddress(collegeAddress);
    } else {
        // Fallback or keep default based on college name if address not found
        setAddress(`To,\nThe Dean/Principal\n${collegeName}\nSolapur Road, Wanawadi,\nPune – 411 040.`);
    }
  }, [collegeAddress, collegeName]);

  const handlePrint = () => {
    window.print();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            setLogo(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(/[\s-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('-');
  };

  // Helper to format subjects for display in the table
  const getStudentSubjects = (student: StudentEntry) => {
    const subjectsList: string[] = [];
    student.years.forEach(year => {
        year.subjects.forEach(sub => {
            const parts = [];
            if(mode === 'PHOTOCOPY') {
                if (sub.papers.I) parts.push('I');
                if (sub.papers.II) parts.push('II');
                // Markslips usually implied in photocopy subject list or explicit? 
                // PDF example shows "Pharmacology-I-II".
            } else {
                if (sub.papers.I) parts.push('I');
                if (sub.papers.II) parts.push('II');
                if (sub.papers.PR) parts.push('PR');
            }
            
            if (parts.length > 0) {
                // Use full subject name instead of TitleCase
                subjectsList.push(`${sub.subjectName}-${parts.join('-')}`);
            }
        });
    });
    return subjectsList;
  };

  const muhsText = Array(180).fill("MUHS").join(" ");

  return (
    <div className="min-h-screen bg-gray-100 font-serif text-black">
       {/* Action Bar */}
       <div className="print:hidden bg-slate-800 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <button 
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Ledger
        </button>
        <div className="text-sm text-gray-300">
            Edit text fields directly before printing
        </div>
        <button
          onClick={handlePrint}
          className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg flex items-center gap-2"
        >
          <Printer size={16} /> Print Discrepancy Letter
        </button>
      </div>

      {/* A4 Page */}
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-[15mm] shadow-xl print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 print:p-8 relative">
        
        {/* Header */}
        <div className="text-center mb-1 relative">
             {/* Logo Upload Section */}
            <div className="absolute left-0 top-1 group cursor-pointer print:cursor-auto">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload-dl" />
                <label htmlFor="logo-upload-dl" className="block cursor-pointer">
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-20 h-20 object-contain" />
                    ) : (
                        <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                            <Upload size={16} />
                            <span className="text-[8px] mt-1 text-center leading-tight">Click to<br/>Upload Logo</span>
                        </div>
                    )}
                </label>
            </div>

            <h1 className="text-2xl font-bold mb-1 leading-none tracking-wide text-black">महाराष्ट्र आरोग्य विज्ञान विद्यापीठ, नाशिक</h1>
            <h2 className="text-sm font-bold uppercase mb-1 leading-none tracking-wide text-black">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES, NASHIK</h2>
            <p className="text-[10px] font-bold text-black">दिंडोरी रोड, म्हसरूळ, नाशिक-४२२००४ Dindori Road, Mhasrul, Nashik-422004</p>
            <p className="text-[10px] font-medium text-black">EPABX: 0253- 2539100/300, Fax: 0253 - 2539134, Ph.: 2539138/216</p>
            <p className="text-[10px] text-blue-800 underline print:no-underline print:text-black font-medium">Email: coe@muhs.ac.in Website: www.muhs.ac.in</p>
        </div>

        {/* Divider & Officer Info */}
        <div className="border-b border-black mb-1"></div>
        <div className="flex justify-between items-start pb-2 mb-0 mt-1">
            <div className="w-1/2 text-left">
                 <input type="text" value={officerNameMr} onChange={(e) => setOfficerNameMr(e.target.value)} className="font-bold text-base w-full outline-none bg-transparent leading-tight text-black" style={{ marginTop: '0.25rem' }} />
                 <input type="text" value={officerDesigMr} onChange={(e) => setOfficerDesigMr(e.target.value)} className="font-bold text-black text-sm w-full outline-none bg-transparent leading-tight" />
                 <input type="text" value={officerDeptMr} onChange={(e) => setOfficerDeptMr(e.target.value)} className="font-bold text-black text-sm w-full outline-none bg-transparent leading-tight" />
            </div>
            <div className="w-1/2 text-right">
                 <input type="text" value={officerNameEn} onChange={(e) => setOfficerNameEn(e.target.value)} className="font-bold text-base text-right w-full outline-none bg-transparent leading-tight text-black" style={{ marginTop: '0.25rem' }} />
                 <input type="text" value={officerDesigEn} onChange={(e) => setOfficerDesigEn(e.target.value)} className="font-bold text-black text-right text-sm w-full outline-none bg-transparent leading-tight" />
                 <input type="text" value={officerDeptEn} onChange={(e) => setOfficerDeptEn(e.target.value)} className="font-bold text-black text-right text-sm w-full outline-none bg-transparent leading-tight" />
            </div>
        </div>

        {/* MUHS Micro Text */}
        <div className="mb-2">
            <div className="border-b border-black"></div>
            <div className="w-full overflow-hidden whitespace-nowrap text-[5px] font-bold tracking-widest leading-none text-center select-none text-black py-[1px]">
                 {muhsText}
            </div>
            <div className="border-b border-black"></div>
        </div>

        {/* Ref No & Date */}
        <div className="flex justify-between font-bold text-black text-sm mt-1 mb-2">
            <div className="flex items-center">
                <span>Ref. No.: MUHS/X-1/UG/</span>
                <input type="text" value={outwardNo} onChange={(e) => setOutwardNo(e.target.value)} className="outline-none bg-transparent w-16 text-center hover:bg-gray-50 focus:bg-gray-100 font-bold px-0 mx-0" />
                <span>/</span>
                <input type="text" value={refYear} onChange={(e) => setRefYear(e.target.value)} className="outline-none bg-transparent w-12 text-center hover:bg-gray-50 focus:bg-gray-100 font-bold px-0 mx-0" />
            </div>
            <div className="flex items-center gap-1">
                <span>Date:-</span>
                <input type="text" value={date} onChange={(e) => setDate(e.target.value)} className="outline-none bg-transparent w-28 text-right hover:bg-gray-50 focus:bg-gray-100 px-1 font-bold" />
            </div>
        </div>

        {/* By E-mail Box */}
        <div className="flex justify-center mb-6">
            <div className="border border-black px-6 py-1 italic font-bold text-sm">
                By E-mail
            </div>
        </div>

        {/* To Address & College Code */}
        <div className="flex justify-between items-start mb-6 text-sm">
            <div className="w-1/2 text-black">
                {/* Reduced width to w-1/2 to allow text wrapping */}
                <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full font-bold resize-none outline-none bg-transparent hover:bg-gray-50 focus:bg-gray-100 p-1 leading-snug"
                    rows={8}
                />
            </div>
            <div className="w-auto pt-2">
                <div className="border border-black px-6 py-1 font-bold text-lg min-w-[100px] text-center text-black italic">
                    {collegeCode || '1102'}
                </div>
            </div>
        </div>

        {/* Subject */}
        <div className="mb-4 text-center px-4">
            <p className="font-bold text-sm leading-relaxed text-black">
                Sub: - Discrepancies Observed in Theory Re-totaling/Practical Verification/<br/>
                Photocopy form for <input 
                    type="text" 
                    value={currentExamName}
                    onChange={(e) => setCurrentExamName(e.target.value)}
                    className="text-center font-bold outline-none bg-transparent min-w-[200px] underline hover:bg-gray-50 focus:bg-gray-100"
                /> Examination.
            </p>
        </div>

        {/* Body (Moved Down above Table) */}
        <p className="font-bold mb-2 text-black text-sm">Sir / Madam,</p>
        <p className="text-justify leading-relaxed mb-4 text-black text-sm indent-8">
            With reference to the cited above, this is to inform you that, on scrutiny form of your college students for
            Theory Re-totaling/Practical Verification/Photocopy of <b>{currentExamName}</b> exam, the following
            discrepancies have been observed in respect of the students mentioned below.
        </p>

        {/* Table (Moved Below Body) */}
        <div className="mb-6">
            <table className="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr className="text-center bg-gray-50 print:bg-transparent">
                        <th className="border border-black p-2 w-12 align-top font-bold text-black">Sr.<br/>No.</th>
                        <th className="border border-black p-2 w-20 align-top font-bold text-black">Course</th>
                        <th className="border border-black p-2 w-24 align-top font-bold text-black">Seat<br/>No</th>
                        {/* Name Column: whitespace-nowrap maintained, w-auto will expand due to other cols shrinking */}
                        <th className="border border-black p-2 align-top font-bold text-black">Name of Student</th>
                        {/* Subject Column: Reduced width */}
                        <th className="border border-black p-2 w-24 align-top font-bold text-black">Subject</th>
                        <th className="border border-black p-2 w-20 align-top font-bold text-black">T/R-P/R<br/>P/C</th>
                        {/* Discrepancy Column: Reduced width */}
                        <th className="border border-black p-2 w-32 align-top font-bold text-black">Discrepancy</th>
                    </tr>
                </thead>
                <tbody>
                    {students.length === 0 ? (
                        <tr><td colSpan={7} className="border border-black p-8 text-center font-bold">No Discrepancies Selected</td></tr>
                    ) : (
                        students.map((student, idx) => (
                            <tr key={student.id} className="text-black">
                                <td className="border border-black p-2 text-center font-bold align-middle">{idx + 1}</td>
                                <td className="border border-black p-2 text-center align-middle">
                                    <input 
                                        type="text" 
                                        value={course} 
                                        onChange={(e) => setCourse(e.target.value)} 
                                        className="w-full text-center bg-transparent outline-none"
                                    />
                                </td>
                                <td className="border border-black p-2 text-center align-middle">{student.seatNo}</td>
                                <td className="border border-black p-2 text-left align-middle">{student.studentName}</td>
                                <td className="border border-black p-2 text-center align-middle">
                                    {getStudentSubjects(student).map((sub, i) => (
                                        <div key={i}>{sub}</div>
                                    ))}
                                </td>
                                <td className="border border-black p-2 text-center align-middle font-bold">
                                    {mode === 'PHOTOCOPY' ? 'PC' : 'TR'}
                                </td>
                                <td className="border border-black p-2 text-center align-middle">
                                    <textarea 
                                        defaultValue={student.ifFeeLessExcess || `Less Fees ${Math.abs(student.pendingFees)} /- Payment Receipt Pending`}
                                        className="w-full h-full text-center bg-transparent outline-none resize-none"
                                        rows={3}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer Notes */}
        <div className="text-justify leading-relaxed mb-8 space-y-2 text-black text-sm">
            <p className="indent-8">
                You are requested to fulfill the above discrepancies immediately, failing which the result of the concerned
                students will not be declared.
            </p>
            <p>
                <b>Important Note:-</b> Less fees or any other discrepancy concerning T/R-P/R Retotaling/Photocopy
                application should be cleared within 15 day from receival of this letter. There after no right/equity shall be
                claimed by student/College.
            </p>
        </div>

        {/* Signoff */}
        <div className="flex flex-col items-end mt-4 mb-8 text-black text-sm">
            <div className="text-center mr-8 flex flex-col items-center">
                <p className="font-bold mb-2">Yours,</p>
                
                 {/* Signature Image */}
                 <div className="h-16 flex items-center justify-center my-2">
                    {signatureImage && (
                        <img 
                            src={signatureImage} 
                            alt="Signature" 
                            className="max-h-16 object-contain mix-blend-multiply"
                            style={{ filter: 'grayscale(100%) sepia(100%) hue-rotate(190deg) saturate(500%) brightness(80%) contrast(150%)' }}
                        />
                    )}
                </div>

                <p className="font-bold">{officerDesigEn}</p>
                <p className="font-bold">{officerDeptEn}</p>
            </div>
        </div>

      </div>

      <style>{`
        @media print {
            @page {
                size: A4;
                margin: 0.5cm;
            }
            body {
                background-color: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .print\\:hidden {
                display: none !important;
            }
            input, textarea {
                border: none !important;
                background: transparent !important;
                resize: none;
            }
        }
      `}</style>
    </div>
  );
};

export default DiscrepancyLetter;