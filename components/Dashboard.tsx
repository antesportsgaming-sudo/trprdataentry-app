
import React, { useState, useMemo, useEffect } from 'react';
import { StudentEntry } from '../types';
import { Search, Edit2, Trash2, Plus, FileText, CheckCircle, AlertCircle, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DashboardProps {
  students: StudentEntry[];
  onAdd: () => void;
  onEdit: (student: StudentEntry) => void;
  onDelete: (id: string) => void;
  onViewLedger: () => void;
  currentExamName: string; // For filename
}

const Dashboard: React.FC<DashboardProps> = ({ students, onAdd, onEdit, onDelete, onViewLedger, currentExamName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.collegeCode.includes(searchTerm) ||
      s.seatNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

  // Stats calculation (on full dataset)
  const totalCollected = useMemo(() => students.reduce((acc, curr) => acc + (curr.totalFeesReceived || 0), 0), [students]);
  const pendingCount = useMemo(() => students.filter(s => s.pendingFees > 0).length, [students]);

  const handleExportExcel = () => {
    if (students.length === 0) {
        alert("No data to export.");
        return;
    }

    const exportData = students.map((s, index) => {
         // Flatten subjects
         const subjects = s.years.flatMap(y => 
            y.subjects.filter(sub => Object.values(sub.papers).some(v => v)).map(sub => {
                const p = sub.papers;
                let parts = [];
                if (p.I) parts.push('I');
                if (p.II) parts.push('II');
                if (p.PR) parts.push('PR');
                if (p.markSlipI) parts.push('MS-I');
                if (p.markSlipII) parts.push('MS-II');
                return `${sub.subjectName} (${parts.join(',')})`;
            })
         ).join('; ');

         return {
             'Sr. No': index + 1,
             'College Code': s.collegeCode,
             'College Name': s.collegeName,
             'Seat No': s.seatNo,
             'Student Name': s.studentName,
             'Entry Type': s.entryType === 'tr_pr' ? 'TR/PR' : 'Photocopy',
             'Subjects': subjects,
             'Total Fees': s.totalFees,
             'Paid Fees': s.studentPayFees,
             'Pending Fees': s.pendingFees,
             'DD/Trans ID': s.ddNo,
             'DD Date': s.ddDate,
             'Bank': s.bankName,
             'Inward No': s.inwardNo,
             'Inward Date': s.inwardDate,
             'Remark': s.remark
         };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const fileName = `Report_${currentExamName || 'Data'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <FileText size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Entries</p>
                    <h3 className="text-2xl font-bold text-gray-800">{students.length}</h3>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                    <CheckCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Fees Collected</p>
                    <h3 className="text-2xl font-bold text-gray-800">₹{totalCollected.toLocaleString()}</h3>
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full">
                    <AlertCircle size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Pending Payments</p>
                    <h3 className="text-2xl font-bold text-gray-800">{pendingCount}</h3>
                </div>
            </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Name, College Code, or Seat No..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
            <button 
              onClick={handleExportExcel}
              className="w-full md:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-md text-sm"
              title="Download Excel Report"
            >
              <FileSpreadsheet size={18} /> Export Excel
            </button>
             <button 
              onClick={onViewLedger}
              className="w-full md:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-md"
            >
              <FileSpreadsheet size={18} /> View Ledger
            </button>
            <button 
              onClick={onAdd}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-md"
            >
              <Plus size={18} /> Add New Entry
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">College</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seat No</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Papers</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fees Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No matching records found.' : 'No records found. Click "Add New Entry" to begin.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{student.studentName}</div>
                      <div className="text-xs text-gray-500">{student.entryType === 'photocopy' ? 'Photocopy' : 'TR/PR'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.collegeCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {student.seatNo || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.totalSubjects} Units
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {student.totalSubjects === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Empty Data
                        </span>
                      ) : student.pendingFees > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Pending: ₹{student.pendingFees}
                        </span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid Full
                          </span>
                          {student.pendingFees < 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                              Excess: ₹{Math.abs(student.pendingFees)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEdit(student)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(student.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {filteredStudents.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of <span className="font-medium">{filteredStudents.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
