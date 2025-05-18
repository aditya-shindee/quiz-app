// src/app/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    formatTime,
} from '@/lib/quizUtils';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { QuizResultPage } from '@/components/fullQuizResultPage';
import type { QuizResultPageProps, Question, SectionInfo, UserAnswers } from '@/components/fullQuizResultPage';
import { Clock, ArrowLeft, RotateCcw, Bookmark, ArrowRight, Square, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

import dummyQuestions from '@/data/quizDummyData';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; 

import { TestPatternInfo, Tier1Pattern, Tier1Sections } from '@/components/TestPatternInfo'; // Adjust path as needed

interface QuizTitleHeaderProps {
  fullQuizTitle: string;
}

const SECTIONS: ReadonlyArray<Omit<SectionInfo, 'start' | 'end'>> = [
  { key: 'general_intelligence_reasoning', title: 'General Intelligence & Reasoning', questions: 25 },
  { key: 'general_awareness', title: 'General Awareness', questions: 25 },
  { key: 'quantitative_aptitude', title: 'Quantitative Aptitude', questions: 25 },
  { key: 'english_comprehension', title: 'English Comprehension', questions: 25 },
];

// TOTAL_QUESTIONS will be derived from loaded questions.
const MAX_TIME_MINUTES = 60;
const DEFAULT_MARKS_PER_QUESTION = 2;
const DEFAULT_NEGATIVE_MARKS = 0.5;
const QUIZ_TITLE = "Aptitude Quiz";

type QuestionStatus = 'notVisited' | 'notAnswered' | 'answered' | 'markedForReview' | 'answeredAndMarked';
type QuizState = 'loading' | 'taking' | 'submitting' | 'submitted' | 'error';

export default function FullQuizPage() {

  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [questionStatus, setQuestionStatus] = useState<Record<number, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState<number>(MAX_TIME_MINUTES * 60);
  const [error, setError] = useState<string | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);
  const [finalResults, setFinalResults] = useState<QuizResultPageProps | null>(null);
  const [expandedSectionIndex, setExpandedSectionIndex] = useState<number>(0);

  const currentQuestion: Question | undefined = questions[currentQuestionIndex];
  const currentAnswer: string | null = answers[currentQuestionIndex] ?? null;

  const sectionBoundaries = useMemo((): SectionInfo[] => {
      let currentIndex = 0;
      return SECTIONS.map(section => {
          const start = currentIndex;
          const end = start + section.questions;
          currentIndex = end;
          return { ...section, start, end };
      });
  }, []);

  const currentSectionInfo = useMemo(() => {
      return sectionBoundaries.find(sec => currentQuestionIndex >= sec.start && currentQuestionIndex < sec.end);
  }, [currentQuestionIndex, sectionBoundaries]);

  const fullQuizTitle = QUIZ_TITLE;

  const analysis = useMemo(() => {
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;
      let score = 0;
      const marksPerQuestion = DEFAULT_MARKS_PER_QUESTION;
      const negativeMarks = DEFAULT_NEGATIVE_MARKS;

      questions.forEach((q, index) => {
          const userAnswer = answers[index] ?? null;
          const correctAnswerKey = q.correct_answer ? String(q.correct_answer).toLowerCase() : null;
          if (userAnswer === null) {
             unattemptedCount++;
          } else if (correctAnswerKey !== null && userAnswer === correctAnswerKey) {
             correctCount++; score += marksPerQuestion;
          } else {
             incorrectCount++; score -= negativeMarks;
          }
      });
      return { correctCount, incorrectCount, unattemptedCount, score };
  }, [questions, answers]);

  const sectionAnalysis = useMemo(() => {
      if (!sectionBoundaries || sectionBoundaries.length === 0 || questions.length === 0) return [];
      const marksPerQuestion = DEFAULT_MARKS_PER_QUESTION;
      const negativeMarks = DEFAULT_NEGATIVE_MARKS;

      return sectionBoundaries.map(section => {
          let correctCount = 0, incorrectCount = 0, unattemptedCount = 0, sectionScore = 0;
          const actualEnd = Math.min(section.end, questions.length);
          const sectionTotalQuestions = Math.max(0, actualEnd - section.start);

          for (let i = section.start; i < actualEnd; i++) {
              const q = questions[i];
              const userAnswer = answers[i] ?? null;
              const correctAnswerKey = q.correct_answer ? String(q.correct_answer).toLowerCase() : null;

              if (userAnswer === null) {
                  unattemptedCount++;
              } else if (correctAnswerKey !== null && userAnswer === correctAnswerKey) {
                  correctCount++; sectionScore += marksPerQuestion;
              } else {
                  incorrectCount++; sectionScore -= negativeMarks;
              }
          }
          const attemptedCount = correctCount + incorrectCount;
          const sectionMaxScore = sectionTotalQuestions * marksPerQuestion;
          const accuracy = attemptedCount === 0 ? 0 : (correctCount / attemptedCount) * 100;

          return {
              title: section.title, key: section.key, correctCount, incorrectCount,
              unattemptedCount, attemptedCount, score: sectionScore,
              maxScore: sectionMaxScore, accuracy, totalQuestions: sectionTotalQuestions,
          };
      });
  }, [questions, answers, sectionBoundaries]);

  useEffect(() => {
    const loadStaticQuestions = () => {
      setQuizState('loading');
      setError(null);
      setQuestions([]); setAnswers({}); setQuestionStatus({});
      setCurrentQuestionIndex(0);
      setTimeLeft(MAX_TIME_MINUTES * 60); setExpandedSectionIndex(0);
      setFinalResults(null);

      try {
        const data = dummyQuestions; 

        if (data.length === 0) {
            console.warn(`No questions found in data. Quiz will be empty.`);
            setQuestions([]);
            setQuizState('taking');
            return;
        }

        const sectionOrderMap = SECTIONS.reduce((acc, section, index) => {
            acc[section.key] = index;
            return acc;
        }, {} as Record<string, number>);

        const sortedQuestions = [...data].sort((a, b) => {
             const typeA = a.question_type as string | undefined;
             const typeB = b.question_type as string | undefined;
             const orderA = typeA ? sectionOrderMap[typeA] ?? Infinity : Infinity;
             const orderB = typeB ? sectionOrderMap[typeB] ?? Infinity : Infinity;
             if (orderA === orderB) return (a.id ?? 0) - (b.id ?? 0); // Sort by ID if present
             return orderA - orderB;
        });

        const typedQuestions = sortedQuestions as Question[];
        setQuestions(typedQuestions);

        const initialStatus: Record<number, QuestionStatus> = {};
        typedQuestions.forEach((_, i) => { initialStatus[i] = i === 0 ? 'notAnswered' : 'notVisited'; });
        setQuestionStatus(initialStatus);
        setQuizState('taking');

      } catch (err: any) {
        console.error("Error loading/processing questions:", err);
        setError(err.message || "Failed to load quiz questions.");
        setQuizState('error');
      }
    };
    loadStaticQuestions();
  }, []); // Run once on mount

  const handleAutoSubmit = useCallback(() => {
        if (quizState !== 'taking') return;
        handleSubmitQuiz(true);
   }, [quizState /* handleSubmitQuiz added below */ ]);

   useEffect(() => {
        if (quizState !== 'taking' || timeLeft <= 0 || questions.length === 0) return;
        const timerId = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) { clearInterval(timerId); handleAutoSubmit(); return 0; }
                return prevTime - 1;
            });
        }, 1000);
        return () => clearInterval(timerId);
   }, [quizState, timeLeft, handleAutoSubmit, questions.length]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (quizState === 'taking' && questions.length > 0) {
                event.preventDefault(); event.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [quizState, questions.length]);

    const updateStatus = useCallback((index: number, newStatus: QuestionStatus) => {
      setQuestionStatus(prevStatus => ({ ...prevStatus, [index]: newStatus }));
    }, []);

    const handleOptionChange = (option: string) => {
        if (quizState !== 'taking' || !currentQuestion) return;
        const lowerCaseOption = option.toLowerCase();
        setAnswers(prev => ({ ...prev, [currentQuestionIndex]: lowerCaseOption }));
        const currentStatus = questionStatus[currentQuestionIndex];
        updateStatus(currentQuestionIndex, (currentStatus === 'markedForReview' || currentStatus === 'answeredAndMarked') ? 'answeredAndMarked' : 'answered');
    };

    const navigateToQuestion = useCallback((index: number) => {
        if (quizState !== 'taking' && quizState !== 'submitting') return;
        if (index >= 0 && index < questions.length) {
            setCurrentQuestionIndex(index);
            const enteringStatus = questionStatus[index];
            if (enteringStatus === 'notVisited') updateStatus(index, 'notAnswered');

            const newSectionIndex = sectionBoundaries.findIndex(sec => index >= sec.start && index < sec.end);
            if (newSectionIndex !== -1 && newSectionIndex !== expandedSectionIndex) {
                 setExpandedSectionIndex(newSectionIndex);
            }
        }
    }, [questions.length, questionStatus, updateStatus, quizState, sectionBoundaries, expandedSectionIndex]);

    const updateCurrentStatusBeforeNav = useCallback((currentIndex: number) => {
        if (quizState !== 'taking' || currentIndex < 0 || currentIndex >= questions.length) return;
         const currentStatus = questionStatus[currentIndex];
         if ((currentStatus === 'notVisited' || currentStatus === 'notAnswered') && !answers[currentIndex]) {
             updateStatus(currentIndex, 'notAnswered');
         }
    }, [questionStatus, answers, updateStatus, quizState, questions.length]);

    const handleNext = () => {
        if (quizState !== 'taking') return;
        updateCurrentStatusBeforeNav(currentQuestionIndex);
        if (currentQuestionIndex < questions.length - 1) navigateToQuestion(currentQuestionIndex + 1);
    };

    const handlePrevious = () => {
        if (quizState !== 'taking') return;
        updateCurrentStatusBeforeNav(currentQuestionIndex);
        if (currentQuestionIndex > 0) navigateToQuestion(currentQuestionIndex - 1);
    };

     const handleClearResponse = () => {
        if (quizState !== 'taking' || !currentQuestion) return;
        setAnswers(prev => { const newAnswers = { ...prev }; delete newAnswers[currentQuestionIndex]; return newAnswers; });
        const currentStatus = questionStatus[currentQuestionIndex];
        updateStatus(currentQuestionIndex, currentStatus === 'answeredAndMarked' ? 'markedForReview' : 'notAnswered');
    };

    const handleMarkForReview = () => {
        if (quizState !== 'taking' || !currentQuestion) return;
        const currentStatus = questionStatus[currentQuestionIndex];
        updateStatus(currentQuestionIndex, (currentStatus === 'answered' || currentStatus === 'answeredAndMarked') ? 'answeredAndMarked' : 'markedForReview');
    };

    const handlePaletteClick = (index: number) => {
        if (quizState !== 'taking') return;
        updateCurrentStatusBeforeNav(currentQuestionIndex);
        navigateToQuestion(index);
    };

    const promptSubmit = () => {
        if (quizState !== 'taking' || questions.length === 0) return;
        setShowSubmitConfirm(true);
    };

   const handleGoBack = useCallback(() => {
       if (quizState === 'submitting') return;
       if (quizState === 'taking' && questions.length > 0) {
           const confirmExit = window.confirm("Are you sure you want to exit? Your progress will be lost.");
           if (confirmExit) {
               alert("Exiting quiz. In a real app, you'd navigate away.");
           }
       } else {
           // window.history.back();
           alert("Navigating back. In a real app, you'd navigate away.");
       }
   }, [quizState, questions.length]);


  const handleSubmitQuiz = useCallback(async (autoSubmit = false) => {
      if (quizState !== 'taking') {
          console.warn("Attempted to submit when not in 'taking' state:", quizState);
          return;
      }
      if (questions.length === 0) {
           console.warn("Attempted to submit with no questions loaded.");
           setError("Cannot submit an empty quiz.");
           setQuizState('error');
           return;
       }

      setQuizState('submitting');
      setShowSubmitConfirm(false);
      setError(null);

      console.log("Submitting quiz...");
      updateCurrentStatusBeforeNav(currentQuestionIndex);

      // Simulate submission delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("submission complete. Preparing results page...");
      const timeTakenInSeconds = Math.max(0, (MAX_TIME_MINUTES * 60) - timeLeft);

      const resultsData: QuizResultPageProps = {
          questions: questions,
          userAnswers: answers,
          timeTaken: timeTakenInSeconds,
          quizTitle: fullQuizTitle,
          marksPerQuestion: DEFAULT_MARKS_PER_QUESTION,
          negativeMarks: DEFAULT_NEGATIVE_MARKS,
          sectionBoundaries: sectionBoundaries,
      };

      setFinalResults(resultsData);
      setQuizState('submitted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log(`quiz submitted successfully. Displaying results.`);

  }, [
      quizState, questions, answers, timeLeft, fullQuizTitle, sectionBoundaries,
      updateCurrentStatusBeforeNav, currentQuestionIndex
  ]);

    useEffect(() => {
    }, [handleAutoSubmit, handleSubmitQuiz]);

   const options: { key: string; value: string }[] = currentQuestion ? [
       { key: 'a', value: currentQuestion.option_a }, { key: 'b', value: currentQuestion.option_b },
       { key: 'c', value: currentQuestion.option_c }, { key: 'd', value: currentQuestion.option_d },
    ].filter(opt => opt.value !== null && opt.value !== undefined)
    : [];


  if (quizState === 'loading') return <div className="flex justify-center items-center min-h-screen text-xl font-semibold animate-pulse text-gray-600">Loading Quiz...</div>;

  if (quizState === 'error') return (
    <div className="flex flex-col justify-center items-center min-h-screen p-10 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Quiz Error</h2>
        <p className="text-lg text-red-700 bg-red-100 p-4 rounded border border-red-300 max-w-lg">
            {error || "An unknown error occurred."}
        </p>
        <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
        >
            Try Again
        </button>
         <button
             onClick={handleGoBack}
             className="mt-3 px-6 py-2 bg-gray-200 text-gray-700 font-medium rounded hover:bg-gray-300"
         >
             Go Back
         </button>
    </div>
  );

  if (quizState === 'submitted' && finalResults) return <QuizResultPage {...finalResults} />;

  if (quizState === 'taking' || quizState === 'submitting') {
    const isSubmitting = quizState === 'submitting';

    if (questions.length === 0 && quizState === 'taking') {
         return (
             <div className="flex flex-col justify-center items-center min-h-screen p-10 text-center">
                <h2 className="text-2xl font-bold text-orange-600 mb-4">No Questions Found</h2>
                <p className="text-lg text-gray-700 bg-orange-100 p-4 rounded border border-orange-300 max-w-lg">
                    Could not find any questions for "{fullQuizTitle}".
                </p>
                 <button
                     onClick={handleGoBack}
                     className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                 >
                     Go Back
                 </button>
             </div>
         );
     }

    return (
      <div className={cn("min-h-screen bg-gray-50 flex flex-col", isSubmitting && "opacity-75 pointer-events-none")}>
          {isSubmitting && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                  <p className="text-white text-2xl font-semibold animate-pulse">Submitting your quiz...</p>
              </div>
          )}
          <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-16 py-3 flex justify-between items-center gap-4">
                <div className="flex items-center flex-1 min-w-0 mr-2">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate" title={fullQuizTitle}>
                        {fullQuizTitle}
                    </h1>
                    <Dialog>
                        <DialogTrigger asChild>
                            <button
                                aria-label="Show test pattern information"
                                title="Quiz pattern information"
                                className="p-2 ml-2 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full transition-colors"
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
                                    pattern={Tier1Pattern}
                                    sections={Tier1Sections}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center space-x-3 sm:space-x-6 flex-shrink-0">
                    {questions.length > 0 && (
                        <div className="flex items-center space-x-1 sm:space-x-2 text-lg sm:text-xl font-medium text-green-700">
                            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                    <button
                        onClick={promptSubmit}
                        disabled={isSubmitting || questions.length === 0}
                        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-blue-600 text-white text-sm sm:text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Submit Quiz
                    </button>
                </div>
            </div>
        </header>

          <main className="flex-grow max-w-screen-2xl w-full mx-auto px-4 sm:px-8 lg:px-16 py-6 sm:py-10 flex flex-col md:flex-row gap-6 sm:gap-8">
              <div className="flex-grow md:w-[calc(100%-300px)] lg:w-[calc(100%-340px)] flex flex-col">
                  {currentQuestion ? (
                     <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200 flex flex-col mb-6">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <span className="text-sm sm:text-base font-medium text-blue-700 bg-blue-100 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full">
                                  Question {currentQuestionIndex + 1} of {questions.length}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-0.5 sm:px-3 sm:py-1 rounded text-center">
                                {currentSectionInfo?.title || 'General Question'}
                            </span>
                        </div>
                        <div className="mb-6 sm:mb-8 overflow-y-auto pr-2 sm:pr-3 max-h-[45vh] sm:max-h-[50vh] custom-scrollbar">
                            <div className="text-base sm:text-lg text-gray-900 leading-relaxed whitespace-pre-line font-medium">
                                {currentQuestion.question_text}
                            </div>
                        </div>
                        <div className="space-y-3 sm:space-y-4">
                           {options.map((option) => (
                               <label key={option.key} className={cn( "flex items-start p-3 sm:p-4 border rounded-lg transition-all duration-150", currentAnswer === option.key ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500 ring-offset-1' : 'bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400', isSubmitting ? "cursor-not-allowed" : "cursor-pointer" )}>
                                   <input type="radio" name={`question_${currentQuestionIndex}`} value={option.key} checked={currentAnswer === option.key} onChange={() => handleOptionChange(option.key)} disabled={isSubmitting} className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 border-gray-400 focus:ring-blue-500 mr-3 sm:mr-4 flex-shrink-0 mt-1 sm:mt-0 disabled:opacity-50"/>
                                   <span className="text-sm sm:text-base font-medium text-gray-800 mr-1">{option.key.toUpperCase()}.</span>
                                   <div className="text-sm sm:text-base text-gray-700 flex-1">{option.value}</div>
                               </label>
                           ))}
                        </div>
                    </div>
                   ) : (
                     <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 flex justify-center items-center min-h-[300px] mb-6">
                        <p className="text-gray-500 text-lg">Loading question...</p>
                     </div>
                   )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <button onClick={handlePrevious} disabled={isSubmitting || currentQuestionIndex === 0 || questions.length === 0} className="flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" /> Previous </button>
                      <button onClick={handleClearResponse} disabled={isSubmitting || currentAnswer === null || !currentQuestion} className="flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" /> Clear </button>
                      <button onClick={handleMarkForReview} disabled={isSubmitting || !currentQuestion} className="flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium text-yellow-800 bg-yellow-200 rounded-md hover:bg-yellow-300 disabled:opacity-50 transition-colors"> <Bookmark className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" /> Mark </button>
                      <button onClick={handleNext} disabled={isSubmitting || currentQuestionIndex === questions.length - 1 || questions.length === 0} className="flex items-center justify-center px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"> Save & Next <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5" /> </button>
                  </div>
              </div>

              <aside className="w-full md:w-[300px] lg:w-[340px] flex-shrink-0">
                  <div className="bg-white p-4 sm:p-5 rounded-lg shadow-lg border border-gray-200 sticky top-[85px] sm:top-[95px] max-h-[calc(100vh-120px)] sm:max-h-[calc(100vh-130px)] overflow-y-auto custom-scrollbar">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4 text-center">Question Navigator</h3>
                      {questions.length > 0 ? (
                         <>
                           <div className="space-y-2">
                               {sectionBoundaries.map((section, secIndex) => {
                                   const actualStart = section.start;
                                   const actualEnd = Math.min(section.end, questions.length);
                                   const questionCountInSection = Math.max(0, actualEnd - actualStart);

                                   if (questionCountInSection === 0) return null;

                                   return (
                                       <div key={section.key} className="border border-gray-200 rounded">
                                           <button
                                               id={`section-header-${secIndex}`}
                                               className="w-full flex justify-between items-center text-left p-2 sm:p-2.5 bg-gray-100 hover:bg-gray-200 rounded-t transition-colors text-sm font-semibold sm:text-base disabled:opacity-75 text-black"
                                               onClick={() => !isSubmitting && setExpandedSectionIndex(prev => prev === secIndex ? -1 : secIndex)}
                                               disabled={isSubmitting}
                                               aria-expanded={expandedSectionIndex === secIndex}
                                               aria-controls={`section-panel-${secIndex}`}
                                           >
                                               <span>{section.title}</span>
                                               {expandedSectionIndex === secIndex ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />}
                                           </button>
                                           {expandedSectionIndex === secIndex && (
                                               <div id={`section-panel-${secIndex}`} className="p-2 sm:p-2.5 grid grid-cols-5 gap-1.5 sm:gap-2.5">
                                                   {Array.from({ length: questionCountInSection }, (_, i) => {
                                                       const questionIndex = actualStart + i;
                                                       if (questionIndex >= questions.length) return null;

                                                       const status = questionStatus[questionIndex] ?? 'notVisited';
                                                       let bgColor = 'bg-gray-200 hover:bg-gray-300'; let textColor = 'text-gray-700'; let ring = '';

                                                       if (status === 'answered') { bgColor = 'bg-green-500 hover:bg-green-600'; textColor = 'text-white'; }
                                                        else if (status === 'notAnswered') { bgColor = 'bg-red-500 hover:bg-red-600'; textColor = 'text-white'; }
                                                        else if (status === 'markedForReview') { bgColor = 'bg-yellow-400 hover:bg-yellow-500'; textColor = 'text-gray-900'; }
                                                        else if (status === 'answeredAndMarked') { bgColor = 'bg-green-500 hover:bg-green-600'; textColor = 'text-white'; }

                                                        if (questionIndex === currentQuestionIndex) ring = ' ring-2 ring-offset-1 ring-blue-500';

                                                       return (
                                                            <button
                                                                key={questionIndex}
                                                                onClick={() => !isSubmitting && handlePaletteClick(questionIndex)}
                                                                disabled={isSubmitting}
                                                                className={cn( "relative w-full h-9 sm:h-11 flex items-center justify-center rounded text-sm sm:text-base font-medium transition-all duration-150 focus:outline-none focus:ring-offset-blue-100", bgColor, textColor, ring, "disabled:opacity-60 disabled:cursor-not-allowed" )}
                                                                aria-label={`Question ${questionIndex + 1} status ${status}`}
                                                            >
                                                                {questionIndex + 1}
                                                            </button>
                                                        );
                                                   })}
                                               </div>
                                           )}
                                       </div>
                                   );
                               })}
                           </div>
                           <hr className="my-4 sm:my-5 border-gray-200" />
                           <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-gray-700">
                              <li className="flex items-center"><Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 text-gray-300 fill-gray-300 flex-shrink-0" /> Not Visited</li>
                              <li className="flex items-center"><Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 text-red-500 fill-red-500 flex-shrink-0" /> Not Answered</li>
                              <li className="flex items-center"><Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 text-green-500 fill-green-500 flex-shrink-0" /> Answered</li>
                              <li className="flex items-center relative"><Square className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-2.5 text-yellow-400 fill-yellow-400 flex-shrink-0" /> Marked for Review</li>
                           </ul>
                        </>
                      ) : (
                         <p className="text-center text-gray-500 py-4">No questions to navigate.</p>
                      )}
                  </div>
              </aside>
          </main>

          <ConfirmationDialog
              isOpen={showSubmitConfirm}
              title="Submit Quiz?"
              message={
                  <span className="text-base">
                      You've attempted <strong className="font-semibold">{analysis.correctCount + analysis.incorrectCount}</strong> out of <strong className="font-semibold">{questions.length}</strong> questions.<br />Are you sure you want to submit?
                  </span>
              }
              confirmText="Submit"
              onConfirm={() => handleSubmitQuiz(false)}
              onCancel={() => setShowSubmitConfirm(false)}
          />

          <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
            .whitespace-pre-line {
              white-space: pre-line;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
          `}</style>
      </div>
    );
  }
  return <div className="p-10 text-center text-lg text-gray-700">An unexpected state occurred ({quizState}). Please try refreshing the page.</div>;
}
