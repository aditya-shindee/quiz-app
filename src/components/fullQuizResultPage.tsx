// src/components/fullQuizResultPage.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
// Import Link from next/link for client-side navigation
import Link from 'next/link';
// Import the Home icon
import { RotateCcw, Clock, CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronRight, Download, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"; 

// Import your TestPatternInfo component and data
import { TestPatternInfo, sscCglTier1Pattern, sscCglTier1Sections } from '@/components/TestPatternInfo'; // Adjust path as needed

// --- Types ---
// Define or import SectionInfo type
export interface SectionInfo {
    key: string;
    title: string;
    questions: number;
    start: number; // Inclusive start index (0-based)
    end: number;   // Exclusive end index
}

export interface Question {
    id: number;
    question_type: string;
    question_level: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string; // 'a', 'b', 'c', or 'd' (ensure consistency)
    explanation?: string | null;
    // question_type is not strictly needed here if sectionBoundaries are passed
}

export type UserAnswers = Record<number, string | null>; // Key is question index (0-based), value is option key ('a', 'b', 'c', 'd') or null

export interface QuizResultPageProps {
    questions: Question[];
    userAnswers: UserAnswers;
    timeTaken: number; // in seconds
    quizTitle: string;
    marksPerQuestion?: number;
    negativeMarks?: number;
    sectionBoundaries: SectionInfo[]; // REQUIRED: For section-wise analysis
    // examInstanceId?: string; // Optional: ID from the saved results table
}

// --- Helper Functions ---
function formatTimeTaken(totalSeconds: number): string {
    if (totalSeconds < 0) totalSeconds = 0;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.round(totalSeconds % 60); // Round seconds
    return `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} sec`;
}

// --- Sub-component for Question Review ---
interface QuestionReviewProps {
    question: Question;
    userAnswer: string | null; // The key ('a', 'b', 'c', 'd') or null
}

const QuestionReview: React.FC<QuestionReviewProps> = ({ question, userAnswer }) => {
    const optionsMap: Record<string, string> = {
        a: question.option_a,
        b: question.option_b,
        c: question.option_c,
        d: question.option_d,
    };

    // Ensure consistency: convert correct_answer to lowercase if needed
    const correctAnswerKey = question.correct_answer?.toLowerCase();

    return (
        <div className="bg-gray-50 p-4 print:bg-white">
            <p className="text-base font-medium text-gray-800 mb-4 whitespace-pre-line">
                {question.question_text}
            </p>
            <div className="space-y-2 mb-4">
                {Object.entries(optionsMap).map(([key, value]) => {
                    const isCorrectChoice = correctAnswerKey === key;
                    const isUserChoice = userAnswer === key;
                    const isIncorrectUserChoice = isUserChoice && !isCorrectChoice;

                    return (
                        <div
                            key={key}
                            className={cn(
                                "flex items-start p-3 border rounded-md text-sm transition-colors duration-150",
                                isCorrectChoice ? "bg-green-100 border-green-300" : "border-gray-200",
                                isIncorrectUserChoice ? "bg-red-100 border-red-300" : "",
                                !isCorrectChoice && !isIncorrectUserChoice ? "bg-white" : ""
                            )}
                        >
                            <span className={cn(
                                "font-semibold mr-2 w-5 text-center flex-shrink-0",
                                isCorrectChoice ? "text-green-700" : "",
                                isIncorrectUserChoice ? "text-red-700" : "text-gray-700"
                            )}>
                                {key.toUpperCase()}. {/* Display option letter uppercase */}
                            </span>
                            <span className={cn(
                                "flex-grow",
                                isCorrectChoice ? "text-green-800 font-medium" : "text-gray-800",
                                isIncorrectUserChoice ? "text-red-800" : ""
                            )}>
                                {value}
                            </span>
                            <span className="ml-auto pl-2 flex-shrink-0 text-xs font-medium self-center space-x-2">
                                {isUserChoice && (
                                    <span className={cn(
                                        "inline-block px-1.5 py-0.5 rounded",
                                        isCorrectChoice ? "bg-green-100 text-green-700" : "bg-red-100 text-red-800"
                                    )}>
                                        Your Answer
                                    </span>
                                )}
                                {isCorrectChoice && !isUserChoice && (
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-green-200 text-green-800">
                                        Correct Answer
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
            {question.explanation && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Explanation:</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{question.explanation}</p>
                </div>
            )}
            {!question.explanation && userAnswer !== null && userAnswer !== correctAnswerKey && (
                 <p className="text-sm text-gray-500 italic mt-3">No explanation available for this question.</p>
            )}
        </div>
    );
};

// --- Main Result Page Component ---
export const QuizResultPage: React.FC<QuizResultPageProps> = ({
    questions,
    userAnswers,
    timeTaken,
    quizTitle,
    marksPerQuestion = 2, // Default marks
    negativeMarks = 0.5, // Default negative marks
    sectionBoundaries,
    // examInstanceId,
}) => {
    const [expandedQuestionIndex, setExpandedQuestionIndex] = useState<number | null>(null);

    // --- Overall Analysis Calculation (Memoized) ---
    const analysis = useMemo(() => {
        let correctCount = 0;
        let incorrectCount = 0;
        let unattemptedCount = 0;
        let score = 0;

        questions.forEach((q, index) => {
            const userAnswer = userAnswers[index] ?? null;
            const correctAnswerKey = q.correct_answer?.toLowerCase(); // Ensure case consistency

            if (userAnswer === null) {
                unattemptedCount++;
            } else if (userAnswer === correctAnswerKey) {
                correctCount++;
                score += marksPerQuestion;
            } else {
                incorrectCount++;
                score -= negativeMarks;
            }
        });
        const totalQuestions = questions.length;
        const attemptedCount = correctCount + incorrectCount;
        const maxScore = totalQuestions * marksPerQuestion;
        // Ensure score doesn't go below zero if negative marking is heavy
        // score = Math.max(0, score); // Uncomment if needed
        const accuracy = attemptedCount === 0 ? 0 : (correctCount / attemptedCount) * 100;
        const attemptRate = totalQuestions === 0 ? 0 : (attemptedCount / totalQuestions) * 100;

        return {
            correctCount, incorrectCount, unattemptedCount, attemptedCount,
            score, maxScore, accuracy, attemptRate, totalQuestions,
        };
    }, [questions, userAnswers, marksPerQuestion, negativeMarks]);

    // --- Section-wise Analysis Calculation (Memoized) ---
    const sectionAnalysis = useMemo(() => {
        if (!sectionBoundaries || sectionBoundaries.length === 0) {
            // console.warn("Section boundaries not provided for section analysis.");
            return []; // Return empty array if no boundaries provided
        }

        return sectionBoundaries.map(section => {
            let correctCount = 0;
            let incorrectCount = 0;
            let unattemptedCount = 0;
            let sectionScore = 0;
            // Use the count from boundary info, but verify against actual question range
            const sectionTotalQuestions = Math.min(section.questions, section.end - section.start);

            for (let i = section.start; i < section.end && i < questions.length; i++) {
                const q = questions[i];
                const userAnswer = userAnswers[i] ?? null;
                const correctAnswerKey = q.correct_answer?.toLowerCase();

                if (userAnswer === null) {
                    unattemptedCount++;
                } else if (userAnswer === correctAnswerKey) {
                    correctCount++;
                    sectionScore += marksPerQuestion;
                } else {
                    incorrectCount++;
                    sectionScore -= negativeMarks;
                }
            }

            const attemptedCount = correctCount + incorrectCount;
            const sectionMaxScore = sectionTotalQuestions * marksPerQuestion;
            const accuracy = attemptedCount === 0 ? 0 : (correctCount / attemptedCount) * 100;
             // sectionScore = Math.max(0, sectionScore); // Optional per-section floor

            return {
                title: section.title,
                key: section.key,
                correctCount, incorrectCount, unattemptedCount, attemptedCount,
                score: sectionScore,
                maxScore: sectionMaxScore,
                accuracy,
                totalQuestions: sectionTotalQuestions,
            };
        });
    }, [questions, userAnswers, marksPerQuestion, negativeMarks, sectionBoundaries]);

    // --- Effects ---
    // Optional: Prevent leaving page if results aren't saved
    // useEffect(() => {
    //     const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    //         // Only show prompt if examInstanceId is not present (implying not saved yet)
    //         // Or based on some other logic indicating results aren't persisted
    //         // if (!examInstanceId) {
    //            const confirmationMessage = 'Quiz results might be lost if you leave or reload. Consider downloading first.';
    //            event.preventDefault();
    //            event.returnValue = confirmationMessage;
    //            return confirmationMessage;
    //         // }
    //     };
    //     window.addEventListener('beforeunload', handleBeforeUnload);
    //     return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // }, [/* examInstanceId */]); // Add dependency if using examInstanceId

    // --- Event Handlers ---
    const toggleQuestionReview = (index: number) => {
        setExpandedQuestionIndex(prevIndex => (prevIndex === index ? null : index));
    };

    const handleDownload = () => {
        document.body.classList.add('print-mode');
        window.print();
        setTimeout(() => {
             document.body.classList.remove('print-mode');
        }, 100);
    };

    // --- Helper Functions ---
    const getQuestionStatus = (index: number) => {
        const userAnswer = userAnswers[index] ?? null;
        const question = questions[index];
        const correctAnswerKey = question.correct_answer?.toLowerCase();

        if (userAnswer === null) return { text: 'Unattempted', Icon: HelpCircle, color: 'text-gray-500' };
        if (userAnswer === correctAnswerKey) return { text: 'Correct', Icon: CheckCircle, color: 'text-green-600' };
        return { text: 'Incorrect', Icon: XCircle, color: 'text-red-600' };
    };

    // --- Render ---
    return (
        <div className="min-h-screen bg-gray-100 print:bg-white">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-md print:hidden">
              <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                  <div className="flex items-center space-x-8">
                      <a
                        href="/"
                        className="p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-800 transition-colors"
                        title="Retry the quiz"
                        aria-label="Retry the quiz"
                        >
                        <RotateCcw className="w-7 h-7" />
                      </a>

                      <div>
                          <h1 className="text-2xl font-bold">Exam Results</h1>
                          <p className="text-base opacity-90">{quizTitle}</p>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                            <button
                                aria-label="Show test pattern information"
                                title="Quiz pattern information"
                                className="p-2 -ml-2 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
                            >
                                <Info size={24} />
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl p-0">
                            <DialogHeader className="p-6 pb-4 border-b">
                                <DialogTitle className="text-xl font-semibold text-[#001e3d]">
                                    Quiz Pattern Information
                                </DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[80vh] overflow-y-auto">
                                <TestPatternInfo
                                    pattern={sscCglTier1Pattern}
                                    sections={sscCglTier1Sections}
                                />
                            </div>
                        </DialogContent>
                      </Dialog>
                  </div>

                  <button
                      onClick={handleDownload}
                      className="bg-white text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-800 focus:ring-white rounded-md px-4 py-2 text-sm font-medium flex items-center transition-colors"
                      title="Download results as PDF (Print)"
                  >
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                  </button>
              </div>
          </header>

            {/* Main Content */}
            <main className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                     {/* Total Score */}
                    <div className="bg-white p-5 rounded-lg shadow border border-gray-200 flex flex-col justify-center items-center text-center print:shadow-none print:border">
                        <h2 className="text-sm font-medium text-gray-500 mb-1">Total Score</h2>
                        <p className="text-3xl font-bold text-blue-600">{analysis.score.toFixed(1)} / {analysis.maxScore.toFixed(1)}</p>
                    </div>
                    {/* Correct Answers */}
                    <div className="bg-green-50 p-5 rounded-lg shadow border border-green-200 flex flex-col justify-center items-center text-center print:shadow-none print:border print:bg-white">
                        <h2 className="text-sm font-medium text-green-700 mb-1">Correct Answers</h2>
                        <p className="text-3xl font-bold text-green-600">{analysis.correctCount}</p>
                        <p className="text-xs text-green-600 mt-1">{(analysis.correctCount * marksPerQuestion).toFixed(1)} marks gained</p>
                    </div>
                    {/* Incorrect Answers */}
                    <div className="bg-red-50 p-5 rounded-lg shadow border border-red-200 flex flex-col justify-center items-center text-center print:shadow-none print:border print:bg-white">
                        <h2 className="text-sm font-medium text-red-700 mb-1">Incorrect Answers</h2>
                        <p className="text-3xl font-bold text-red-600">{analysis.incorrectCount}</p>
                         <p className="text-xs text-red-600 mt-1">{(analysis.incorrectCount * negativeMarks).toFixed(1)} marks lost</p>
                    </div>
                    {/* Unattempted */}
                    <div className="bg-gray-50 p-5 rounded-lg shadow border border-gray-200 flex flex-col justify-center items-center text-center print:shadow-none print:border print:bg-white">
                        <h2 className="text-sm font-medium text-gray-600 mb-1">Unattempted</h2>
                        <p className="text-3xl font-bold text-gray-700">{analysis.unattemptedCount}</p>
                         <p className="text-xs text-gray-500 mt-1">questions</p>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200 mb-8 print:shadow-none print:border">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Accuracy */}
                        <div className="text-center md:text-left">
                            <h3 className="text-base font-medium text-gray-600">Accuracy</h3>
                            <p className="text-2xl font-bold text-indigo-600 mb-1">{analysis.accuracy.toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">Correct answers / Attempted questions</p>
                        </div>
                        {/* Attempt Rate */}
                         <div className="text-center md:text-left">
                            <h3 className="text-base font-medium text-gray-600">Attempt Rate</h3>
                            <p className="text-2xl font-bold text-purple-600 mb-1">{analysis.attemptRate.toFixed(1)}%</p>
                            <p className="text-xs text-gray-500">Attempted / Total questions</p>
                         </div>
                         {/* Time Taken */}
                         <div className="text-center md:text-left">
                            <h3 className="text-base font-medium text-gray-600">Time Taken</h3>
                            <p className="text-2xl font-bold text-teal-600 mb-1 flex items-center justify-center md:justify-start">
                                <Clock className="w-6 h-6 mr-2 opacity-80" />
                                {formatTimeTaken(timeTaken)}
                            </p>
                             <p className="text-xs text-gray-500">Total time spent</p>
                        </div>
                    </div>
                </div>

                {/* --- Section-wise Performance Analysis --- */}
                {sectionAnalysis.length > 0 && (
                    <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200 mb-8 print:shadow-none print:border">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Section-wise Performance</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {sectionAnalysis.map((sec) => (
                                <div key={sec.key} className="border border-gray-200 rounded-lg p-4 flex flex-col print:border-gray-300 section-wise-performance-card">
                                    <h3 className="text-base font-semibold text-gray-700 mb-2">{sec.title}</h3>
                                    <div className="text-sm space-y-1.5 flex-grow">
                                        <p><strong>Score:</strong> {sec.score.toFixed(1)} / {sec.maxScore.toFixed(1)}</p>
                                        <p><strong>Accuracy:</strong> {sec.accuracy.toFixed(1)}%</p>
                                        <p className="text-green-600">Correct: {sec.correctCount}</p>
                                        <p className="text-red-600">Incorrect: {sec.incorrectCount}</p>
                                        <p className="text-gray-500">Unattempted: {sec.unattemptedCount}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">({sec.totalQuestions} Questions)</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Question-wise Analysis */}
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden print:shadow-none print:border print:overflow-visible">
                     <h2 className="text-lg font-semibold text-gray-800 p-4 border-b border-gray-200">
                        Question-wise Analysis
                    </h2>
                    <div className="overflow-x-auto print:overflow-visible">
                        <table id="quiz-result-table" className="min-w-full w-full divide-y divide-gray-200 table-fixed print:table-auto">
                            <colgroup>
                                <col className="w-16 print:w-auto" /> {/* Q.No */}
                                <col className="w-auto" /> {/* Question */}
                                <col className="w-32 print:w-auto" /> {/* Status */}
                                <col className="w-24 print:w-auto print:hidden" /> {/* Review Action */}
                            </colgroup>
                            <thead className="bg-gray-50 print:bg-white">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Q.No</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">Review</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {questions.map((question, index) => {
                                    const { text: statusText, Icon: StatusIcon, color: statusColor } = getQuestionStatus(index);
                                    const isExpanded = expandedQuestionIndex === index;

                                    return (
                                        <React.Fragment key={question.id || index}> {/* Use ID if available, else index */}
                                            <tr className={cn("hover:bg-gray-50", isExpanded ? "bg-blue-50" : "", "print:bg-white")}>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 align-top">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm text-gray-700 overflow-hidden align-top">
                                                    <p className="truncate print:whitespace-normal">{question.question_text}</p>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm align-top">
                                                    <span className={cn("flex items-center", statusColor)}>
                                                        <StatusIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />{statusText}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium align-top print:hidden">
                                                    <button
                                                        onClick={() => toggleQuestionReview(index)}
                                                        className="text-blue-600 hover:text-blue-800 flex items-center"
                                                        aria-expanded={isExpanded}
                                                        aria-controls={`review-panel-${index}`}
                                                        title={isExpanded ? "Hide question details" : "Review question details"} // Tooltip for review button
                                                    >
                                                        {isExpanded ? 'Hide' : 'Review'}
                                                        {isExpanded ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr
                                                id={`review-panel-${index}`}
                                                role="region"
                                                className={cn(!isExpanded && "hidden", "print-expanded-row")}
                                            >
                                                <td colSpan={4} className={cn("p-0 border-l-4", isExpanded ? "border-blue-200" : "border-transparent", "print:border-l-0 print:p-0")}>
                                                    <QuestionReview
                                                        question={question}
                                                        userAnswer={userAnswers[index] ?? null}
                                                    />
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                        {questions.length === 0 && (
                            <p className="text-center text-gray-500 py-6">No questions found for analysis.</p>
                        )}
                    </div>
                </div>
            </main>

             {/* Print Styles */}
             <style jsx global>{`
                @media print {
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border { border-width: 1px !important; border-color: #e5e7eb !important; }
                    .print\\:bg-white { background-color: white !important; }
                    .print\\:overflow-visible { overflow: visible !important; }
                    .print\\:table-auto { table-layout: auto !important; }
                    .print\\:w-auto { width: auto !important; }
                    .print\\:border-l-0 { border-left-width: 0 !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:whitespace-normal { white-space: normal !important; }
                    header, .print\\:hidden { display: none !important; }
                    main { padding-top: 1rem !important; padding-bottom: 1rem !important; }
                    .bg-green-50, .bg-red-50, .bg-gray-50, .bg-blue-50 { background-color: white !important; }
                    #quiz-result-table { page-break-inside: auto; }
                    #quiz-result-table tr { page-break-inside: avoid; page-break-after: auto; }
                    #quiz-result-table thead { display: table-header-group; }
                    #quiz-result-table tbody { display: table-row-group; }
                    .print-expanded-row { display: table-row !important; }
                    .print-expanded-row > td { padding: 0 !important; border-left-width: 0 !important; }
                    .print-expanded-row > td > div { /* QuestionReview div */
                        padding: 0.75rem 1rem !important;
                        border-top: 1px solid #e5e7eb !important;
                        background-color: white !important;
                    }
                    .print-expanded-row .bg-green-100 { background-color: #d1fae5 !important; }
                    .print-expanded-row .bg-red-100 { background-color: #fee2e2 !important; }
                    .print-expanded-row .bg-green-200 { background-color: #bbf7d0 !important; }
                     /* Style section cards for print */
                    .section-wise-performance-card {
                         border: 1px solid #ccc !important;
                         padding: 0.5rem !important;
                         background-color: white !important;
                         page-break-inside: avoid;
                    }
                    /* Hide tooltips on print */
                     [title]:after {
                        display: none !important;
                     }
                }
                @media screen {
                  .print-expanded-row:not(.hidden) {}
                  .hidden.print-expanded-row { display: none; }
                }
            `}</style>
        </div>
    );
};

export default QuizResultPage; // Optional default export