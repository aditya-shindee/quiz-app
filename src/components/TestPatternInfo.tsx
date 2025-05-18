// src/components/TestPatternInfo.tsx
import React from 'react';

interface TestPatternData {
  totalQuestions: number;
  totalMarks: number;
  marksPerQuestion: number;
  timeMinutes: number;
  negativeMarking: number; 
}

interface SectionData {
  name: string;
  questions: number;
  marks: number;
}

interface TestPatternInfoProps {
  pattern: TestPatternData;
  sections: SectionData[];
}

export function TestPatternInfo({ pattern, sections }: TestPatternInfoProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-white"> {/* Removed mb-12 md:mb-16 */}
      <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Test Pattern Details */}
        <div>
          <h3 className="text-xl font-semibold text-[#001e3d] mb-5 border-b pb-2">
            Quiz Pattern
          </h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Total Questions:</span>
              <span className="font-semibold text-[#002E5D]">{pattern.totalQuestions}</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Total Marks:</span>
              <span className="font-semibold text-[#002E5D]">{pattern.totalMarks} ({pattern.marksPerQuestion} marks per question)</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Time:</span>
              <span className="font-semibold text-[#002E5D]">{pattern.timeMinutes} minutes</span>
            </li>
            <li className="flex justify-between items-center">
              <span className="font-medium text-gray-600">Negative Marking:</span>
              <span className="font-semibold text-red-600">-{pattern.negativeMarking.toFixed(2)} marks for wrong answers</span>
            </li>
          </ul>
        </div>

        {/* Right Side: Section-wise Distribution */}
        <div>
          <h3 className="text-xl font-semibold text-[#001e3d] mb-5 border-b pb-2">
            Section-wise Distribution
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-4 py-3">Sections</th>
                  <th scope="col" className="px-4 py-3 text-center">Questions</th>
                  <th scope="col" className="px-4 py-3 text-center">Marks</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section, index) => (
                  <tr key={index} className="border-b border-gray-200/60 hover:bg-gray-50/70">
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{section.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{section.questions}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{section.marks}</td>
                  </tr>
                ))}
                 <tr className="bg-gray-100 font-semibold text-gray-800">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-center">{pattern.totalQuestions}</td>
                    <td className="px-4 py-3 text-center">{pattern.totalMarks}</td>
                  </tr>
              </tbody>
            </table>
             <p className="text-xs text-gray-500 mt-3 text-center italic">
                 A cumulative time of {pattern.timeMinutes} minutes for all sections
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}


export const Tier1Pattern: TestPatternData = {
  totalQuestions: 100,
  totalMarks: 200,
  marksPerQuestion: 2,
  timeMinutes: 60,
  negativeMarking: 0.50,
};

export const Tier1Sections: SectionData[] = [
  { name: 'General Intelligence and Reasoning', questions: 25, marks: 50 },
  { name: 'General Awareness', questions: 25, marks: 50 },
  { name: 'Quantitative Aptitude', questions: 25, marks: 50 },
  { name: 'English Comprehension', questions: 25, marks: 50 },
];
