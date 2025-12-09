
import React, { useState, useEffect } from 'react';
import { Printer, ArrowLeft, Upload } from 'lucide-react';
import { LetterSettings } from '../types';

interface CoverLetterProps {
  collegeName: string;
  collegeCode: string;
  onBack: () => void;
  children?: React.ReactNode;
  mode?: 'tr_pr' | 'photocopy';
  collegeAddress?: string;
  settings?: LetterSettings;
  examName: string;
}

const CoverLetter: React.FC<CoverLetterProps> = ({ 
    collegeName, 
    collegeCode, 
    onBack, 
    children, 
    mode = 'tr_pr', 
    collegeAddress, 
    settings,
    examName
}) => {
  // Editable states for the letter
  const [outwardNo, setOutwardNo] = useState('8878');
  const [refYear, setRefYear] = useState('2025');
  const [date, setDate] = useState('06/11/2025');
  
  const [address, setAddress] = useState(`To,\nThe Dean/Principal\n${collegeName}\nSolapur Road, Wanawadi,\nPune – 411 040.`);
  const [currentExamName, setCurrentExamName] = useState(examName);
  const [logo, setLogo] = useState<string | null>(null);
  
  // Officer Details (Bilingual) - Default fallback if settings are missing
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

  // Generate repeated MUHS text
  const muhsText = Array(180).fill("MUHS").join(" ");

  return (
    <div className="min-h-screen bg-gray-100 font-serif text-black">
      {/* Action Bar - Hidden on Print */}
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
          <Printer size={16} /> Print Letter & List
        </button>
      </div>

      {/* A4 Paper Container - Page 1 (Letter) */}
      <div className="max-w-[210mm] mx-auto bg-white min-h-[297mm] p-[15mm] shadow-xl print:shadow-none print:m-0 print:w-full print:h-auto print:min-h-0 print:p-8 relative">
        
        {/* Header Section */}
        <div className="pb-0 mb-1 text-center relative">
          <div className="flex flex-col items-center">
             
             {/* Logo Upload Section */}
            <div className="absolute left-0 top-1 group cursor-pointer print:cursor-auto">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload" className="block cursor-pointer">
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
            
            <h1 className="text-3xl font-bold mb-1 leading-none tracking-wide text-black mt-2">महाराष्ट्र आरोग्य विज्ञान विद्यापीठ, नाशिक</h1>
            <h2 className="text-sm font-bold uppercase mb-1 leading-none tracking-wide text-black">MAHARASHTRA UNIVERSITY OF HEALTH SCIENCES, NASHIK</h2>
            <p className="text-[10px] font-bold text-black">दिंडोरी रोड, म्हसरूळ, नाशिक-४२२००४ Dindori Road, Mhasrul, Nashik-422004</p>
            <p className="text-[10px] font-medium text-black">EPABX: 0253- 2539100/300, Fax: 0253 - 2539134, Ph.: 2539138/216</p>
            <p className="text-[10px] text-blue-800 underline print:no-underline print:text-black font-medium">Email: ugexammedical@muhs.ac.in Website: www.muhs.ac.in</p>
          </div>
        </div>

        {/* Divider Line above Officer Details */}
        <div className="border-b border-black mb-1"></div>

        {/* Officer Details Row */}
        <div className="flex justify-between items-start pb-2 mb-0 mt-1">
            <div className="w-1/2 text-left">
                 <input 
                    type="text" 
                    value={officerNameMr}
                    onChange={(e) => setOfficerNameMr(e.target.value)}
                    className="font-bold text-base w-full outline-none bg-transparent leading-tight" 
                />
                 <input 
                    type="text" 
                    value={officerDesigMr}
                    onChange={(e) => setOfficerDesigMr(e.target.value)}
                    className="font-bold text-black text-sm w-full outline-none bg-transparent leading-tight"
                />
                 <input 
                    type="text" 
                    value={officerDeptMr}
                    onChange={(e) => setOfficerDeptMr(e.target.value)}
                    className="font-bold text-black text-sm w-full outline-none bg-transparent leading-tight"
                />
            </div>
            <div className="w-1/2 text-right">
                 <input 
                    type="text" 
                    value={officerNameEn}
                    onChange={(e) => setOfficerNameEn(e.target.value)}
                    className="font-bold text-base text-right w-full outline-none bg-transparent leading-tight" 
                />
                 <input 
                    type="text" 
                    value={officerDesigEn}
                    onChange={(e) => setOfficerDesigEn(e.target.value)}
                    className="font-bold text-black text-right text-sm w-full outline-none bg-transparent leading-tight"
                />
                 <input 
                    type="text" 
                    value={officerDeptEn}
                    onChange={(e) => setOfficerDeptEn(e.target.value)}
                    className="font-bold text-black text-right text-sm w-full outline-none bg-transparent leading-tight"
                />
            </div>
        </div>

        {/* MUHS Micro Text Line (Sandwiched between Officer Details and Ref No) */}
        <div className="mb-2">
            <div className="border-b border-black"></div>
            <div className="w-full overflow-hidden whitespace-nowrap text-[5px] font-bold tracking-widest leading-none text-center select-none text-black py-[1px]">
                 {muhsText}
            </div>
            <div className="border-b border-black"></div>
        </div>

        {/* Ref No & Date Row */}
        <div className="flex justify-between font-bold text-black text-sm mt-1 mb-4">
            <div className="flex items-center">
                <span>Ref. No.: MUHS/X-1/UG/</span>
                <input 
                    type="text" 
                    value={outwardNo} 
                    onChange={(e) => setOutwardNo(e.target.value)}
                    className="outline-none bg-transparent w-12 text-center hover:bg-gray-50 focus:bg-gray-100 font-bold px-0 mx-0"
                    placeholder="8878"
                />
                <span>/</span>
                <input 
                    type="text" 
                    value={refYear} 
                    onChange={(e) => setRefYear(e.target.value)}
                    className="outline-none bg-transparent w-10 text-center hover:bg-gray-50 focus:bg-gray-100 font-bold px-0 mx-0"
                />
            </div>
            <div className="flex items-center gap-1">
                <span>Date:-</span>
                <input 
                    type="text" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="outline-none bg-transparent w-24 text-right hover:bg-gray-50 focus:bg-gray-100 px-1 font-bold"
                />
            </div>
        </div>

        {/* Address and College Code Block */}
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
            
            {/* College Code Box */}
            <div className="w-auto pt-4">
                <div className="border-2 border-black px-8 py-2 font-bold text-xl min-w-[120px] text-center text-black">
                    {collegeCode || '1201'}
                </div>
            </div>
        </div>

        {/* Subject */}
        <div className="mb-6 text-center px-4">
            <p className="font-bold text-sm leading-relaxed text-black">
                {mode === 'photocopy' ? (
                    <>
                        Sub: - Forwarding of Photocopies of Answer Books of 
                        <input 
                            type="text" 
                            value={currentExamName}
                            onChange={(e) => setCurrentExamName(e.target.value)}
                            className="text-center font-bold outline-none bg-transparent hover:bg-gray-50 focus:bg-gray-100 mx-1 border-b border-black"
                            style={{ width: `${Math.max(10, currentExamName.length)}ch` }}
                        /> Examinations.
                    </>
                ) : (
                    <>
                        Sub: - Practical & Theory Verification/Re-totaling Marks for <br/>
                        <input 
                            type="text" 
                            value={currentExamName}
                            onChange={(e) => setCurrentExamName(e.target.value)}
                            className="text-center font-bold outline-none bg-transparent min-w-[300px] hover:bg-gray-50 focus:bg-gray-100"
                        /> Examination.
                    </>
                )}
            </p>
        </div>

        {/* Salutation */}
        <p className="font-bold mb-4 text-black text-sm">Sir / Madam,</p>

        {/* Body */}
        {mode === 'photocopy' ? (
            <div className="text-justify leading-relaxed mb-6 space-y-4 text-black text-sm">
                <p className="indent-8">
                    With reference to above cited subject, University has received applications for photocopies of answer-books
                    from the student(s) of your college of <b>{currentExamName}</b> University Examinations. Please find
                    attached herewith list of students along with photocopies of their answer-books with a request to handover the
                    softcopy of it to the respective students only. Kindly ensure while handover of answer-books, it is not
                    interchanged with other students as well proper record about receipt of answer-book is maintained at college
                    level.
                </p>
                <div className="font-bold mt-4 text-center">
                    <p>List of Candidate</p>
                </div>
                {/* Render the Table Inline for Photocopy Mode */}
                <div className="my-4">
                    {children}
                </div>
            </div>
        ) : (
            <div className="text-justify leading-relaxed mb-6 space-y-4 text-black text-sm">
                <p className="indent-8">
                    With reference to the above subject, Practical & Theory Verification/Re-totaling status of your college 
                    student (s) for <b>{currentExamName}</b> Examination is listed overleaf. You are requested to inform to the 
                    concerned students, the status of Practical & Theory Verification/Re-totaling of his/her marks where there is:-
                </p>
                
                <div className="pl-16 font-bold space-y-1 my-4">
                    <p>1. No Change</p>
                    <p>2. Change of Marks (increase/decrease)in subject (s)</p>
                    <p>3. Change in Result (in any subject/overall)</p>
                </div>

                <p className="indent-8">
                    In case of change of marks (increase/decrease) without effect the final result, in subject(s) as 
                    mentioned in point no.2, the statement of marks already issued to the concerned student shall remain same.
                </p>
                <p className="indent-8">
                    Revised statement of marks shall be issued in due course of time only in case there is any change in 
                    final result as mentioned in point no.3. The statement of marks already issued to the concerned students 
                    should be returned to the University immediately.
                </p>
            </div>
        )}

        {/* Footer Signoff */}
        <div className="flex flex-col items-end mt-4 mb-8 text-black text-sm">
            <div className="text-center mr-8 flex flex-col items-center">
                <p className="font-bold">Yours,</p>
                
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

                {mode === 'photocopy' ? (
                    <>
                        <p className="font-bold">{officerDeptEn}</p>
                        <p className="font-bold">{officerDesigEn}</p>
                    </>
                ) : (
                    <>
                        <p className="font-bold">{officerDesigEn}</p>
                        <p className="font-bold">{officerDeptEn}</p>
                    </>
                )}
            </div>
        </div>

        {/* Encl */}
        <div className="font-bold mt-12 text-black text-sm">
            {mode === 'photocopy' ? <p>Encl.: As above.</p> : <p>Encl: - As stated above</p>}
        </div>

        {mode !== 'photocopy' && (
            <div className="text-right font-bold mt-4 text-black text-sm">
                <p>P.T.O</p>
            </div>
        )}
      </div>
      
      {/* Page 2: The List (Children) - Only if NOT in Photocopy mode */}
      {children && mode !== 'photocopy' && (
        <div className="max-w-[210mm] mx-auto bg-white print:break-before-page p-[15mm] print:p-8 min-h-[297mm]">
            {children}
        </div>
      )}

      {/* Print Styles */}
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
            .print\\:break-before-page {
                break-before: page;
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

export default CoverLetter;
