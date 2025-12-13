
import React, { useMemo, useState } from 'react';
import { StudentEntry, CollegeAddressRecord, LetterSettings } from '../types';
import { ArrowLeft, Mail, Printer, ExternalLink, X, Receipt, Send, Loader2 } from 'lucide-react';
import CoverLetter from './CoverLetter';
import DiscrepancyLetter from './DiscrepancyLetter';
import CreditNoteLetter from './CreditNoteLetter';
import { generateAndUploadPDF, sendDirectEmail } from '../services/email';

interface MailDashboardProps {
    students: StudentEntry[];
    collegeAddresses: CollegeAddressRecord[];
    letterSettings: LetterSettings;
    currentExamName: string;
    onBack: () => void;
}

type PreviewMode = 'NONE' | 'DISCREPANCY_TR' | 'DISCREPANCY_PHOTO' | 'COVER_TR' | 'COVER_PHOTO' | 'CREDIT_NOTE';

const MailDashboard: React.FC<MailDashboardProps> = ({ 
    students, 
    collegeAddresses, 
    letterSettings, 
    currentExamName,
    onBack 
}) => {
    const [previewMode, setPreviewMode] = useState<PreviewMode>('NONE');
    const [selectedCollegeCode, setSelectedCollegeCode] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendingStatus, setSendingStatus] = useState<string>('');

    // Check if Direct Send is Configured
    const isDirectSendConfigured = !!(letterSettings.emailServiceId && letterSettings.emailTemplateId && letterSettings.emailPublicKey);

    // Group students by college
    const collegeGroups = useMemo(() => {
        const groups: Record<string, { 
            name: string, 
            code: string, 
            trPrStudents: StudentEntry[],
            photoStudents: StudentEntry[],
            allStudents: StudentEntry[],
            email?: string
        }> = {};

        students.forEach(s => {
            const code = s.collegeCode.trim();
            if (!groups[code]) {
                const addr = collegeAddresses.find(a => a.collegeCode === code);
                groups[code] = {
                    name: s.collegeName,
                    code: code,
                    trPrStudents: [],
                    photoStudents: [],
                    allStudents: [],
                    email: addr?.email
                };
            }
            if (s.entryType === 'tr_pr') {
                groups[code].trPrStudents.push(s);
            } else {
                groups[code].photoStudents.push(s);
            }
            groups[code].allStudents.push(s);
        });

        return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));
    }, [students, collegeAddresses]);

    const handlePreview = (mode: PreviewMode, collegeCode: string) => {
        setSelectedCollegeCode(collegeCode);
        setPreviewMode(mode);
    };

    const handleClosePreview = () => {
        setPreviewMode('NONE');
        setSelectedCollegeCode(null);
    };

    const handleManualMail = (email: string | undefined, collegeCode: string, collegeName: string) => {
        if (!email) {
            alert('No email address found for this college.');
            return;
        }
        
        const subject = `Theory Retotaling/Photocopy Verification Data - ${currentExamName} - (${collegeCode})`;
        const bodyText = `Respected Sir/Madam,\n\nPlease find attached herewith the letters (PDF) for the ${currentExamName} examination.\n\nCollege Name: ${collegeName}\nCollege Code: ${collegeCode}\n\nRegards,\n\nExam Section\nMaharashtra University of Health Sciences, Nashik`;

        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    };

    const handleDirectSend = async (email: string | undefined, collegeCode: string, collegeName: string) => {
        if (!email) {
            alert('No email address found.');
            return;
        }
        if (!isDirectSendConfigured) {
            alert("Please configure EmailJS keys in Admin > Configuration first.");
            return;
        }

        if(!confirm(`Send automatic email to ${email}? This will generate the current preview PDF and email it.`)) return;

        // Auto-select a view mode to generate PDF from if not selected?
        // Actually, we need to know WHICH letter to send. 
        // For simplicity, this button is usually next to the View button.
        // But the table has multiple columns.
        // Strategy: We can't auto-guess which letter.
        // The user must OPEN preview first, then click "Send Direct" from the preview modal.
        
        alert("Please Open/View the specific letter you want to send first, then click 'Send Direct' inside the preview.");
    };

    const handleSendFromPreview = async () => {
        if (!selectedCollegeCode || !previewMode || previewMode === 'NONE') return;
        const group = collegeGroups.find(g => g.code === selectedCollegeCode);
        if (!group || !group.email) return;

        setIsSending(true);
        setSendingStatus('Generating PDF...');

        try {
            // 1. Generate PDF & Upload
            // We assume the preview content is wrapped in a div with id="letter-preview-content"
            const pdfUrl = await generateAndUploadPDF('letter-preview-content', `${group.code}_${previewMode}`);
            
            setSendingStatus('Sending Email...');

            // 2. Send Email
            await sendDirectEmail(
                {
                    serviceId: letterSettings.emailServiceId!,
                    templateId: letterSettings.emailTemplateId!,
                    publicKey: letterSettings.emailPublicKey!
                },
                group.email,
                `MUHS Exam Letter - ${currentExamName}`,
                `Dear Sir/Madam,\n\nPlease find attached the exam letter for ${group.name} (${group.code}).\n\nDownload Link: ${pdfUrl}\n\nRegards,\nMUHS Exam Section`,
                pdfUrl
            );

            alert('Email Sent Successfully!');
            handleClosePreview();

        } catch (e) {
            console.error(e);
            alert('Failed to send email. Check console.');
        } finally {
            setIsSending(false);
            setSendingStatus('');
        }
    };

    // --- Helper for Cover Letter Table ---
    const getResultRowData = (student: StudentEntry, mode: 'tr_pr' | 'photocopy') => {
        const rows: any[] = [];
        let answerBooksCount = 0;
        let markSlipsCount = 0;

        student.years.forEach(year => {
            const selectedSubjects = year.subjects.filter(s => 
                s.papers.I || s.papers.II || s.papers.PR || s.papers.markSlipI || s.papers.markSlipII
            );
            if (selectedSubjects.length > 0) {
                const subjectStrings: string[] = [];
                selectedSubjects.forEach(s => {
                    const parts = [];
                    if (s.papers.I) { parts.push('I'); answerBooksCount++; }
                    if (s.papers.II) { parts.push('II'); answerBooksCount++; }
                    if (s.papers.PR) { }
                    if (s.papers.markSlipI) { if (mode !== 'photocopy') parts.push('MS-I'); markSlipsCount++; }
                    if (s.papers.markSlipII) { if (mode !== 'photocopy') parts.push('MS-II'); markSlipsCount++; }
                    const suffix = parts.length > 0 ? `-${parts.join('-')}` : '';
                    subjectStrings.push(`${s.subjectName}${suffix}`);
                });
                
                rows.push({
                    year: year.yearName,
                    subjects: subjectStrings,
                    answerBooks: answerBooksCount,
                    markSlips: markSlipsCount,
                    remark: student.remark
                });
            }
        });
        return rows;
    };

    const renderCoverLetterTable = (studentsList: StudentEntry[], groupName: string, groupCode: string, mode: 'tr_pr' | 'photocopy') => {
        return (
             <div className="w-full text-black font-serif">
                {mode === 'photocopy' ? (
                    <div className="font-bold text-center mb-4 text-lg underline">List of Candidate</div>
                ) : (
                    <div className="mb-4 text-center">
                        <div className="font-bold text-lg mb-1">Name of College :- <span className="underline">{groupName} ({groupCode})</span></div>
                    </div>
                )}
                 <table className="w-full border-collapse border border-black text-sm text-black">
                    <thead>
                        <tr className="text-center bg-gray-50">
                            <th className="border border-black p-2 w-10">Sr.</th>
                            <th className="border border-black p-2">Name</th>
                            <th className="border border-black p-2 w-24">Seat No</th>
                            <th className="border border-black p-2">Subject</th>
                             {mode === 'photocopy' ? (
                                <>
                                    <th className="border border-black p-2 w-16">Ans<br/>Books</th>
                                    <th className="border border-black p-2 w-16">Mark<br/>Slip</th>
                                </>
                            ) : (
                                <th className="border border-black p-2 w-32">Remark</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {studentsList.length === 0 ? <tr><td colSpan={6} className="text-center p-4">No Data</td></tr> : 
                        studentsList.map((s: StudentEntry, idx: number) => {
                            const rowData = getResultRowData(s, mode);
                            const subjectDisplay = rowData.map((r: any) => r.subjects).flat().join(', ');
                            const totalAB = rowData.reduce((sum: number, r: any) => sum + r.answerBooks, 0);
                            const totalMS = rowData.reduce((sum: number, r: any) => sum + r.markSlips, 0);

                            return (
                                <tr key={s.id}>
                                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                                    <td className="border border-black p-2">{s.studentName}</td>
                                    <td className="border border-black p-2 text-center">{s.seatNo}</td>
                                    <td className="border border-black p-2">{subjectDisplay}</td>
                                     {mode === 'photocopy' ? (
                                        <>
                                            <td className="border border-black p-2 text-center">{totalAB || '-'}</td>
                                            <td className="border border-black p-2 text-center">{totalMS || '-'}</td>
                                        </>
                                    ) : (
                                        <td className="border border-black p-2 text-center">{s.remark || 'No Change'}</td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                 </table>
             </div>
        );
    };

    // Render Preview Modal content
    const renderPreview = () => {
        if (!selectedCollegeCode) return null;
        const group = collegeGroups.find(g => g.code === selectedCollegeCode);
        if (!group) return null;

        const addrRecord = collegeAddresses.find(a => a.collegeCode === group.code);
        const address = addrRecord?.address;

        let content = null;

        if (previewMode === 'DISCREPANCY_TR') {
            const unpaid = group.trPrStudents.filter(s => s.pendingFees > 0);
            content = (
                <DiscrepancyLetter 
                    collegeName={group.name} 
                    collegeCode={group.code} 
                    students={unpaid} 
                    mode="TR_PR" 
                    onBack={handleClosePreview}
                    collegeAddress={address}
                    settings={letterSettings}
                    examName={currentExamName}
                />
            );
        } else if (previewMode === 'DISCREPANCY_PHOTO') {
            const unpaid = group.photoStudents.filter(s => s.pendingFees > 0);
            content = (
                <DiscrepancyLetter 
                    collegeName={group.name} 
                    collegeCode={group.code} 
                    students={unpaid} 
                    mode="PHOTOCOPY" 
                    onBack={handleClosePreview}
                    collegeAddress={address}
                    settings={letterSettings}
                    examName={currentExamName}
                />
            );
        } else if (previewMode === 'COVER_TR') {
            const paid = group.trPrStudents.filter(s => s.pendingFees <= 0);
            content = (
                <CoverLetter
                    collegeName={group.name}
                    collegeCode={group.code}
                    mode="tr_pr"
                    onBack={handleClosePreview}
                    collegeAddress={address}
                    settings={letterSettings}
                    examName={currentExamName}
                >
                    {renderCoverLetterTable(paid, group.name, group.code, 'tr_pr')}
                </CoverLetter>
            );
        } else if (previewMode === 'COVER_PHOTO') {
            const paid = group.photoStudents.filter(s => s.pendingFees <= 0);
            content = (
                <CoverLetter
                    collegeName={group.name}
                    collegeCode={group.code}
                    mode="photocopy"
                    onBack={handleClosePreview}
                    collegeAddress={address}
                    settings={letterSettings}
                    examName={currentExamName}
                >
                    {renderCoverLetterTable(paid, group.name, group.code, 'photocopy')}
                </CoverLetter>
            );
        } else if (previewMode === 'CREDIT_NOTE') {
            const paidStudents = group.allStudents.filter(s => s.studentPayFees > 0);
            content = (
                <CreditNoteLetter
                    collegeName={group.name}
                    collegeCode={group.code}
                    students={paidStudents}
                    mode="TR_PR"
                    onBack={handleClosePreview}
                    collegeAddress={address}
                    settings={letterSettings}
                    examName={currentExamName}
                />
            );
        }

        return (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 overflow-y-auto">
                <div className="min-h-screen">
                    <div className="relative">
                        <button 
                            onClick={handleClosePreview}
                            className="fixed top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-red-700 print:hidden"
                        >
                            <X size={24} />
                        </button>
                        
                        {/* Direct Send Button (Only visible if config present) */}
                        {isDirectSendConfigured && group.email && (
                            <button 
                                onClick={handleSendFromPreview}
                                disabled={isSending}
                                className="fixed top-4 right-20 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 hover:bg-blue-700 print:hidden flex items-center gap-2 font-bold"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                {isSending ? sendingStatus : 'Send Direct Mail'}
                            </button>
                        )}

                        <div id="letter-preview-content">
                             {content}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen p-8">
            {previewMode !== 'NONE' && renderPreview()}

            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">Mail Data Dashboard</h1>
                    </div>
                    <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <span className="font-bold text-blue-800">Direct Send Status: </span> 
                        {isDirectSendConfigured ? 
                            <span className="text-green-600 font-bold">Active (Ready to Send)</span> : 
                            <span className="text-red-600 font-bold">Inactive (Configure in Admin &gt; Settings)</span>
                        }
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wider w-24">Code</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-900 uppercase tracking-wider">College Name</th>
                                    
                                    <th className="px-4 py-4 text-xs font-bold text-center text-emerald-700 uppercase tracking-wider border-l border-gray-200 w-32">
                                        Letters<br/>(Preview)
                                    </th>
                                    
                                    <th className="px-4 py-4 text-xs font-bold text-center text-blue-700 uppercase tracking-wider border-l border-gray-200 w-32 bg-blue-50">
                                        Direct Mail<br/>(One-Click)
                                    </th>
                                    
                                    <th className="px-6 py-4 text-xs font-bold text-center text-gray-900 uppercase tracking-wider border-l border-gray-200 w-32">Manual Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {collegeGroups.map((group) => {
                                    const hasLetterTR = group.trPrStudents.some(s => s.pendingFees <= 0);
                                    
                                    return (
                                    <tr key={group.code} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-gray-600">{group.code}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            {group.name}
                                            {group.email ? (
                                                <div className="text-xs text-blue-600 mt-1 flex items-center gap-1 font-normal">
                                                    <Mail size={10} /> {group.email}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-red-400 mt-1 italic font-normal">No email found</div>
                                            )}
                                        </td>
                                        
                                        <td className="px-4 py-4 text-center border-l border-gray-50">
                                            <div className="flex flex-col gap-1 items-center">
                                                <button 
                                                    onClick={() => handlePreview('COVER_TR', group.code)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-100 text-[10px] font-bold shadow-sm transition-all"
                                                >
                                                    <Printer size={10} /> Letter (TR/PR)
                                                </button>
                                                <button 
                                                    onClick={() => handlePreview('COVER_PHOTO', group.code)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-100 text-[10px] font-bold shadow-sm transition-all"
                                                >
                                                    <Printer size={10} /> Letter (Photo)
                                                </button>
                                            </div>
                                        </td>

                                        {/* Direct Mail Column */}
                                        <td className="px-4 py-4 text-center border-l border-gray-50 bg-blue-50/30">
                                            {group.email ? (
                                                <button 
                                                    onClick={() => handlePreview('COVER_TR', group.code)}
                                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold shadow-md transition-all ${isDirectSendConfigured ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                                    disabled={!isDirectSendConfigured}
                                                    title={!isDirectSendConfigured ? "Configure EmailJS in Admin Panel first" : "Opens preview to send mail"}
                                                >
                                                    <Send size={14} /> Send PDF
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Add Email in Admin</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-center border-l border-gray-50">
                                            <button 
                                                onClick={() => handleManualMail(group.email, group.code, group.name)}
                                                className="inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-bold shadow-sm transition-all"
                                                disabled={!group.email}
                                                title={!group.email ? "Upload email in Admin first" : "Open Outlook/Gmail manually"}
                                            >
                                                <ExternalLink size={12} /> Manual
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MailDashboard;
