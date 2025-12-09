
import React from 'react';
import { YearSelection, SubjectSelection } from '../types';
import { getShortSubjectName } from '../constants';

interface AcademicMatrixProps {
  years: YearSelection[];
  onChange: (updatedYears: YearSelection[]) => void;
  entryType: 'tr_pr' | 'photocopy';
  visibleYears: string[]; // New prop for filtering
}

const AcademicMatrix: React.FC<AcademicMatrixProps> = ({ years, onChange, entryType, visibleYears }) => {

  const handleCheckboxChange = (
    yearIndex: number,
    subjectIndex: number,
    field: keyof SubjectSelection['papers']
  ) => {
    const newYears = [...years];
    const targetSubject = newYears[yearIndex].subjects[subjectIndex];
    
    // Toggle the specific field
    targetSubject.papers = {
      ...targetSubject.papers,
      [field]: !targetSubject.papers[field]
    };

    onChange(newYears);
  };

  const handleBulkSelect = (yearIndex: number, subjectIndex: number, mode: 'TR_ONLY' | 'ALL_REGULAR' | 'ALL_PHOTOCOPY') => {
    const newYears = [...years];
    const targetSubject = newYears[yearIndex].subjects[subjectIndex];
    
    let fields: (keyof SubjectSelection['papers'])[] = [];

    if (mode === 'ALL_PHOTOCOPY') {
        fields = ['I', 'II', 'markSlipI', 'markSlipII'];
    } else if (mode === 'TR_ONLY') {
        fields = ['I', 'II'];
    } else if (mode === 'ALL_REGULAR') {
        fields = ['I', 'II', 'PR'];
    }

    // If ANY of the target fields are unchecked, we select all of them.
    // If ALL are already checked, we deselect all of them.
    const shouldSelect = fields.some(field => !targetSubject.papers[field]);

    const newPapers = { ...targetSubject.papers };
    fields.forEach(field => {
      // @ts-ignore - dynamic assignment safe here due to logic
      newPapers[field] = shouldSelect;
    });
    
    targetSubject.papers = newPapers;
    onChange(newYears);
  };

  const renderCheckbox = (
    yearIndex: number, 
    subjectIndex: number, 
    field: keyof SubjectSelection['papers'], 
    label: string,
    isMarkSlip: boolean = false
  ) => {
    const subject = years[yearIndex].subjects[subjectIndex];
    const isChecked = subject.papers[field];

    return (
      <label 
        className={`
          flex-1 flex flex-col items-center justify-center p-1 rounded cursor-pointer select-none border min-w-[30px]
          ${isChecked 
            ? (isMarkSlip ? 'bg-purple-600 border-purple-600 text-white' : 'bg-blue-600 border-blue-600 text-white')
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}
        `}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={!!isChecked}
          onChange={() => handleCheckboxChange(yearIndex, subjectIndex, field)}
        />
        <span className="text-[10px] font-bold">{label}</span>
      </label>
    );
  };

  const hasVisibleYears = visibleYears && visibleYears.length > 0;

  if (!hasVisibleYears) {
      return (
          <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-sm">Please select an Academic Year above to view subjects.</p>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      {years.map((year, yearIndex) => {
        // Only render if the year is in the visibleYears list
        if (!visibleYears.includes(year.yearName)) return null;

        return (
            <div key={year.yearName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700 text-sm">{year.yearName}</h3>
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                {entryType === 'photocopy' ? 'Select Paper & Markslip' : 'Select Papers'}
                </span>
            </div>
            
            <div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {year.subjects.map((subject, subjectIndex) => {
                const hasSelection = entryType === 'photocopy' 
                    ? (subject.papers.I || subject.papers.II || subject.papers.markSlipI || subject.papers.markSlipII)
                    : (subject.papers.I || subject.papers.II || subject.papers.PR);

                return (
                    <div 
                    key={subject.subjectName} 
                    className={`
                        relative p-3 rounded-md border transition-all duration-200
                        ${hasSelection 
                        ? 'border-blue-300 bg-blue-50/50' 
                        : 'border-gray-100 bg-white hover:border-gray-300'}
                    `}
                    >
                    <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="font-medium text-gray-800 text-sm truncate flex-1" title={subject.subjectName}>
                        {getShortSubjectName(subject.subjectName)}
                        </span>
                        
                        <div className="flex gap-1">
                            {entryType === 'tr_pr' && (
                                <button
                                    type="button"
                                    onClick={() => handleBulkSelect(yearIndex, subjectIndex, 'TR_ONLY')}
                                    className="text-[9px] font-bold px-1.5 py-0.5 bg-white hover:bg-gray-100 text-gray-600 rounded border border-gray-200 shadow-sm transition-colors"
                                    title="Select Theory Papers (I & II)"
                                >
                                    TR
                                </button>
                            )}
                            <button
                            type="button"
                            onClick={() => handleBulkSelect(yearIndex, subjectIndex, entryType === 'photocopy' ? 'ALL_PHOTOCOPY' : 'ALL_REGULAR')}
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-white hover:bg-gray-100 text-gray-600 rounded border border-gray-200 shadow-sm transition-colors"
                            title={entryType === 'photocopy' ? "Select All (I, MS, II, MS)" : "Select All (I, II, PR)"}
                            >
                            ALL
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {entryType === 'photocopy' ? (
                        <>
                            {/* Photocopy Layout: I, MS(I), II, MS(II) */}
                            {renderCheckbox(yearIndex, subjectIndex, 'I', 'I')}
                            {renderCheckbox(yearIndex, subjectIndex, 'markSlipI', 'MS', true)}
                            {renderCheckbox(yearIndex, subjectIndex, 'II', 'II')}
                            {renderCheckbox(yearIndex, subjectIndex, 'markSlipII', 'MS', true)}
                        </>
                        ) : (
                        <>
                            {/* Regular Layout: I, II, PR */}
                            {renderCheckbox(yearIndex, subjectIndex, 'I', 'I')}
                            {renderCheckbox(yearIndex, subjectIndex, 'II', 'II')}
                            {renderCheckbox(yearIndex, subjectIndex, 'PR', 'PR')}
                        </>
                        )}
                    </div>
                    </div>
                );
                })}
            </div>
            </div>
        );
      })}
    </div>
  );
};

export default AcademicMatrix;