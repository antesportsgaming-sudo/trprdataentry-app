

import React, { useState, useEffect, useCallback } from 'react';
import { StudentEntry, YearSelection, MasterRecord } from '../types';
import { FEE_CONSTANTS, createEmptyStudent, SUBJECT_CONFIG } from '../constants';
import AcademicMatrix from './AcademicMatrix';
import { Save, X, Calculator, Building, User, CreditCard, FileText, CheckSquare, Square } from 'lucide-react';

interface StudentFormProps {
  initialData?: StudentEntry;
  onSave: (data: StudentEntry) => void;
  onCancel: () => void;
  masterRecords?: MasterRecord[];
  currentExamName: string;
  onExamNameChange: (name: string) => void;
  sessionYears: string[]; // Years active for this exam session
}

const BANK_OPTIONS = [
  "State Bank of India",
  "Bank of Maharashtra",
  "Bank of Baroda",
  "Bank of India",
  "Central Bank of India",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Punjab National Bank",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IDBI Bank",
  "IndusInd Bank",
  "Yes Bank",
  "Saraswat Bank"
];

const StudentForm: React.FC<StudentFormProps> = ({ 
    initialData, 
    onSave, 
    onCancel, 
    masterRecords = [], 
    currentExamName,
    onExamNameChange,
    sessionYears
}) => {
  const [formData, setFormData] = useState<StudentEntry>(() => {
      const data = initialData || createEmptyStudent();
      // Ensure appliedYears is initialized for legacy data
      if (!data.appliedYears) {
          data.appliedYears = SUBJECT_CONFIG.map(c => c.year);
      }
      return data;
  });

  // Calculate fees whenever matrix or entry type changes
  const calculateFees = useCallback(() => {
    let paperCount = 0;
    let markSlipCount = 0;
    let practicalCount = 0;

    formData.years.forEach(year => {
      // Only calculate fees for years that are currently VISIBLE in this session
      if (sessionYears.includes(year.yearName)) {
        year.subjects.forEach(sub => {
            if (formData.entryType === 'photocopy') {
            // In Photocopy mode
            if (sub.papers.I) paperCount++;
            if (sub.papers.II) paperCount++;
            if (sub.papers.markSlipI) markSlipCount++;
            if (sub.papers.markSlipII) markSlipCount++;
            } else {
            // In Regular mode
            if (sub.papers.I) paperCount++;
            if (sub.papers.II) paperCount++;
            if (sub.papers.PR) practicalCount++;
            }
        });
      }
    });

    let totalFees = 0;
    let totalItems = 0;

    if (formData.entryType === 'photocopy') {
      const paperTotal = paperCount * FEE_CONSTANTS.PHOTOCOPY_PAPER;
      const markSlipTotal = markSlipCount * FEE_CONSTANTS.PHOTOCOPY_MARKSLIP;
      totalFees = paperTotal + markSlipTotal;
      totalItems = paperCount + markSlipCount;
    } else {
      totalItems = paperCount + practicalCount;
      totalFees = totalItems * FEE_CONSTANTS.REGULAR_PAPER;
    }

    const pending = totalFees - (formData.studentPayFees || 0);

    setFormData(prev => ({
      ...prev,
      totalSubjects: totalItems,
      totalFees: totalFees,
      pendingFees: pending
    }));
  }, [formData.years, formData.entryType, formData.studentPayFees, sessionYears]);

  useEffect(() => {
    calculateFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.years, formData.entryType, formData.studentPayFees, sessionYears]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Auto-fill logic when Seat No changes
    if (name === 'seatNo' && masterRecords.length > 0) {
        const match = masterRecords.find(r => r.seatNo.toString().toLowerCase() === value.toString().toLowerCase());
        if (match) {
            setFormData(prev => ({
                ...prev,
                seatNo: value,
                studentName: match.studentName,
                collegeCode: match.collegeCode,
                collegeName: match.collegeName
            }));
            return;
        }
    }

    // Special Logic for DD / Trans ID
    if (name === 'ddNo') {
        const valStr = value.toString();
        let derivedBankName = formData.bankName;

        // Condition 1: Online Payment (Ending in /2526)
        if (valStr.endsWith('/2526')) {
            derivedBankName = 'ONLINE PAYMENT';
        } 
        // Condition 2: If user clears it or changes format, and it WAS 'ONLINE PAYMENT', clear bank name
        // so they can select a bank from the list.
        else if (formData.bankName === 'ONLINE PAYMENT') {
            derivedBankName = ''; 
        }

        setFormData(prev => ({
            ...prev,
            ddNo: valStr,
            bankName: derivedBankName
        }));
        return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleMatrixChange = (updatedYears: YearSelection[]) => {
    setFormData(prev => ({ ...prev, years: updatedYears }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {initialData ? 'Edit Application Entry' : 'New Application Entry'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">Fill in all required fields marked with *</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <X size={16} /> Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
          >
            <Save size={16} /> Save Record
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 bg-gray-50/50">
        
        {/* Section 1: TR/PR Application Details */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
             <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Building className="text-blue-600" size={20} />
                TR/PR Application Details
             </h3>
             {masterRecords.length > 0 && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Auto-fill Active ({masterRecords.length} records)
                </span>
             )}
          </div>
          
          {/* Exam Name Input (Global) */}
          <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <label className="block text-sm font-bold text-yellow-800 mb-1">
                  Examination Name (This will appear in Ledger & All Letters)
              </label>
              <input 
                  type="text"
                  value={currentExamName}
                  onChange={(e) => onExamNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-black font-semibold"
                  placeholder="e.g. SUMMER-2024_PHASE-IV"
              />
              <p className="text-xs text-yellow-700 mt-1">
                  Note: Changing this updates it for ALL records in the current session.
              </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {/* Reordered for better flow: Seat No first to trigger autofill */}
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Seat No</label>
               <input 
                  type="text" 
                  name="seatNo" 
                  value={formData.seatNo} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-yellow-50 border-yellow-200 text-black placeholder-gray-500" 
                  placeholder="Enter Seat No to Autofill"
               />
            </div>
            
            <div className="lg:col-span-2">
               <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
               <input type="text" name="studentName" required value={formData.studentName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Surname Firstname Middlename" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
              <select name="entryType" value={formData.entryType} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="tr_pr">TR/PR</option>
                <option value="photocopy">Photocopy</option>
              </select>
            </div>

            <div className="lg:col-span-2">
               <label className="block text-sm font-medium text-gray-700 mb-1">College Name *</label>
               <input type="text" name="collegeName" required value={formData.collegeName} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Enter Full College Name" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">College Code *</label>
               <input type="text" name="collegeCode" required value={formData.collegeCode} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="E.g., 1024" />
            </div>
            
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Inward No</label>
               <input type="text" name="inwardNo" value={formData.inwardNo} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Inward Date</label>
               <input type="date" name="inwardDate" value={formData.inwardDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
        </section>

        {/* Section 2: Academic Matrix */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600" size={20} />
                Subject Matrix
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Active Session Years: {sessionYears.join(', ')}
              </span>
          </div>
          
          <p className="text-sm text-gray-500 mb-4">
            {formData.entryType === 'photocopy' 
              ? 'Select Theory Papers (I, II) and related Markslips (MS).' 
              : 'Select the papers (I, II) and Practicals (PR) the student is appearing for.'}
          </p>
          
          <AcademicMatrix 
            years={formData.years} 
            onChange={handleMatrixChange} 
            entryType={formData.entryType}
            visibleYears={sessionYears} // Use prop from Admin Config
          />
        </section>

        {/* Section 3: Fees & Payment */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="text-green-600" size={20} />
            Fees & Payment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
               <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Total Items</label>
               <div className="text-2xl font-bold text-blue-900">{formData.totalSubjects}</div>
            </div>
             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
               <label className="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Total Calculated Fees</label>
               <div className="text-2xl font-bold text-green-900">₹{formData.totalFees}</div>
            </div>
             <div className={`p-4 rounded-lg border ${formData.pendingFees > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
               <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${formData.pendingFees > 0 ? 'text-red-800' : 'text-gray-600'}`}>Pending Balance</label>
               <div className={`text-2xl font-bold ${formData.pendingFees > 0 ? 'text-red-900' : 'text-gray-900'}`}>₹{formData.pendingFees}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Fees Paid (Student)</label>
               <input type="number" name="studentPayFees" value={formData.studentPayFees} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-semibold text-gray-900" />
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">DD / Trans ID</label>
               <input 
                 type="text" 
                 name="ddNo" 
                 value={formData.ddNo} 
                 onChange={handleChange} 
                 className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
                 placeholder="e.g. 123456 or 12345/2526"
               />
               <p className="text-[10px] text-gray-400 mt-1">Ends in /2526 = Online Payment</p>
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">DD Date</label>
               <input type="date" name="ddDate" value={formData.ddDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
            </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
               <input 
                  type="text" 
                  name="bankName" 
                  list="bank-suggestions"
                  value={formData.bankName} 
                  onChange={handleChange} 
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none ${formData.bankName === 'ONLINE PAYMENT' ? 'bg-gray-100 font-bold text-blue-600' : ''}`}
                  placeholder="Select or Type Bank"
               />
               <datalist id="bank-suggestions">
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank} value={bank} />
                  ))}
               </datalist>
            </div>
          </div>
        </section>

        {/* Section 4: Office Use */}
         <section className="bg-gray-100 p-6 rounded-xl border border-gray-200 shadow-inner">
           <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Calculator className="text-gray-500" size={20} />
            For Office Use Only
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div>
               <label className="block text-sm font-medium text-gray-600 mb-1">Total Fees Received</label>
               <input type="number" name="totalFeesReceived" value={formData.totalFeesReceived} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 outline-none" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-600 mb-1">Discrepancy Note</label>
               <input type="text" name="ifFeeLessExcess" value={formData.ifFeeLessExcess} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 outline-none" placeholder="Excess/Short details" />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-600 mb-1">Checked By</label>
               <input type="text" name="checkedBy" value={formData.checkedBy} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 outline-none" />
            </div>
            <div className="md:col-span-3">
               <label className="block text-sm font-medium text-gray-600 mb-1">Remark</label>
               <textarea name="remark" value={formData.remark} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 outline-none" rows={2}></textarea>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
};

export default StudentForm;
