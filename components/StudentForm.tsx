
import React, { useState, useEffect, useCallback } from 'react';
import { StudentEntry, YearSelection, MasterRecord, PaymentRecord } from '../types';
import { FEE_CONSTANTS, createEmptyStudent, SUBJECT_CONFIG } from '../constants';
import AcademicMatrix from './AcademicMatrix';
import { Save, X, Calculator, Building, User, CreditCard, FileText, CheckSquare, Square, Plus, Trash2, ArrowRight } from 'lucide-react';

interface StudentFormProps {
  initialData?: StudentEntry;
  onSave: (data: StudentEntry, shouldClose: boolean) => void;
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
  "Saraswat Bank",
  "ONLINE PAYMENT"
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
      
      // Ensure appliedYears is initialized
      if (!data.appliedYears) {
          data.appliedYears = SUBJECT_CONFIG.map(c => c.year);
      }

      // Backward Compatibility: If payments array is empty but legacy fields have data, migrate them
      if ((!data.payments || data.payments.length === 0) && data.studentPayFees > 0) {
          data.payments = [{
              amount: data.studentPayFees,
              ddNo: data.ddNo || '',
              ddDate: data.ddDate || '',
              bankName: data.bankName || ''
          }];
      } else if (!data.payments) {
          data.payments = [];
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

    // Calculate total paid from Payments Array
    const totalPaid = formData.payments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const pending = totalFees - totalPaid;

    setFormData(prev => ({
      ...prev,
      totalSubjects: totalItems,
      totalFees: totalFees,
      studentPayFees: totalPaid, // Update legacy field for consistency
      pendingFees: pending
    }));
  }, [formData.years, formData.entryType, formData.payments, sessionYears]);

  useEffect(() => {
    calculateFees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.years, formData.entryType, formData.payments, sessionYears]);

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

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleMatrixChange = (updatedYears: YearSelection[]) => {
    setFormData(prev => ({ ...prev, years: updatedYears }));
  };

  // --- Payment Array Handlers ---

  const handleAddPayment = () => {
    setFormData(prev => ({
        ...prev,
        payments: [
            ...prev.payments,
            { amount: 0, ddNo: '', ddDate: new Date().toISOString().split('T')[0], bankName: '' }
        ]
    }));
  };

  const handleRemovePayment = (index: number) => {
    setFormData(prev => ({
        ...prev,
        payments: prev.payments.filter((_, i) => i !== index)
    }));
  };

  const handlePaymentChange = (index: number, field: keyof PaymentRecord, value: string | number) => {
      setFormData(prev => {
          const newPayments = [...prev.payments];
          // Special Logic for DD / Trans ID auto-bank name
          if (field === 'ddNo') {
               const valStr = String(value);
               // Check for pattern like /2526, /2627 (Slash followed by 4 digits at the end)
               if (/\/\d{4}$/.test(valStr)) {
                   newPayments[index].bankName = 'ONLINE PAYMENT';
               }
          }
          
          newPayments[index] = {
              ...newPayments[index],
              [field]: value
          };
          return { ...prev, payments: newPayments };
      });
  };

  const handleSubmit = (e: React.FormEvent, shouldClose: boolean) => {
    e.preventDefault();
    // Update Legacy fields based on the first payment (or concatenated) for simple display in legacy views if needed
    const primePayment = formData.payments[0] || { amount: 0, ddNo: '', ddDate: '', bankName: '' };
    
    const finalData = {
        ...formData,
        studentPayFees: formData.totalFees - formData.pendingFees, // Ensure math consistency
        ddNo: formData.payments.map(p => p.ddNo).join(', '),
        bankName: formData.payments.map(p => p.bankName).join(', '),
        ddDate: primePayment.ddDate
    };
    
    onSave(finalData, shouldClose);
  };

  return (
    <form className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
      
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

        {/* Section 3: Fees & Payment (Multiple Receipts) */}
        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="text-green-600" size={20} />
            Fees & Payment Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
             <div className="bg-green-50 p-4 rounded-lg border border-green-100">
               <label className="block text-xs font-semibold text-green-800 uppercase tracking-wider mb-1">Total Calculated Fees</label>
               <div className="text-2xl font-bold text-green-900">₹{formData.totalFees}</div>
            </div>
            <div className={`p-4 rounded-lg border ${formData.pendingFees > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
               <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${formData.pendingFees > 0 ? 'text-red-800' : 'text-gray-600'}`}>Pending Balance</label>
               <div className={`text-2xl font-bold ${formData.pendingFees > 0 ? 'text-red-900' : 'text-gray-900'}`}>₹{formData.pendingFees}</div>
            </div>
             <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
               <label className="block text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Amount Paid</label>
               <div className="text-2xl font-bold text-blue-900">₹{formData.studentPayFees}</div>
            </div>
          </div>

          <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <h4 className="text-sm font-bold text-gray-700">Payment Receipts / DDs</h4>
                 <button type="button" onClick={handleAddPayment} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200 flex items-center gap-1">
                     <Plus size={12} /> Add Receipt
                 </button>
             </div>
             
             {formData.payments.map((payment, index) => (
                 <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-200">
                     <div className="md:col-span-3">
                        <label className="block text-[10px] text-gray-500 font-bold mb-1">DD / Trans ID</label>
                        <input 
                            type="text" 
                            value={payment.ddNo}
                            onChange={(e) => handlePaymentChange(index, 'ddNo', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. 12345/2526"
                        />
                     </div>
                     <div className="md:col-span-3">
                         <label className="block text-[10px] text-gray-500 font-bold mb-1">Bank Name</label>
                         <input 
                            type="text" 
                            list={`bank-list-${index}`}
                            value={payment.bankName}
                            onChange={(e) => handlePaymentChange(index, 'bankName', e.target.value)}
                            className={`w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none ${payment.bankName === 'ONLINE PAYMENT' ? 'bg-blue-50 font-bold text-blue-600' : ''}`}
                            placeholder="Select Bank"
                        />
                        <datalist id={`bank-list-${index}`}>
                            {BANK_OPTIONS.map(b => <option key={b} value={b} />)}
                        </datalist>
                     </div>
                     <div className="md:col-span-3">
                         <label className="block text-[10px] text-gray-500 font-bold mb-1">Date</label>
                         <input 
                            type="date" 
                            value={payment.ddDate}
                            onChange={(e) => handlePaymentChange(index, 'ddDate', e.target.value)}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-[10px] text-gray-500 font-bold mb-1">Amount</label>
                         <input 
                            type="number" 
                            value={payment.amount}
                            onChange={(e) => handlePaymentChange(index, 'amount', Number(e.target.value))}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        />
                     </div>
                     <div className="md:col-span-1 flex justify-center pt-4">
                         {formData.payments.length > 1 && (
                            <button type="button" onClick={() => handleRemovePayment(index)} className="text-red-500 hover:text-red-700 p-1">
                                <Trash2 size={16} />
                            </button>
                         )}
                     </div>
                 </div>
             ))}
             {formData.payments.length === 0 && (
                 <div className="text-center p-4 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                     No payments added. Please add at least one receipt.
                 </div>
             )}
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

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white p-4 border-t border-gray-200 shadow-inner flex flex-col md:flex-row justify-end gap-3 z-20">
             <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-6 py-3 rounded-lg bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                <Save size={18} /> Save & Close
            </button>
            <button
                type="button"
                onClick={(e) => handleSubmit(e, false)}
                className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
            >
                <Plus size={18} /> Save & Add Another
            </button>
        </div>
      </div>
    </form>
  );
};

export default StudentForm;
