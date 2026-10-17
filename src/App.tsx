/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  words,
  sentences,
  unit3GrammarPatterns,
  schoolPhonetics,
  qaLessons,
  rearrangeLessons,
  quizQuestions,
  blanks,
  fillVocabulary,
  RearrangeItem
} from './data/lessonsData';
import { DocumentDashboard } from './components/DocumentDashboard';

export default function App() {
  const [page, setPage] = useState<'home' | 'learn' | 'practice' | 'flash' | 'docs' | 'settings'>('home');
  const [learnTab, setLearnTab] = useState<'Words' | 'Sentences' | 'Q & A' | 'Grammar'>('Words');
  const [learnIndex, setLearnIndex] = useState<number>(0);
  const [qaIndex, setQaIndex] = useState<number>(0);
  const [flashIndex, setFlashIndex] = useState<number>(0);
  const [flashBack, setFlashBack] = useState<boolean>(false);
  
  // Practice state
  const [practice, setPractice] = useState<'quiz' | 'blank' | 'rearrange'>('quiz');
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizResponses, setQuizResponses] = useState<{ index: number; choice: number; correct: boolean }[]>([]);
  
  // Listen & Fill state
  const [fillChoice, setFillChoice] = useState<number | null>(null);
  const [fillChecked, setFillChecked] = useState<boolean>(false);
  
  // Rearrange state
  const [reorderIndex, setReorderIndex] = useState<number>(0);
  const [reorderPicked, setReorderPicked] = useState<number[]>([]);
  const [reorderChecked, setReorderChecked] = useState<boolean>(false);
  
  // Audio Speech & Speed state
  const [speed, setSpeed] = useState<number>(() => {
    return parseFloat(localStorage.getItem('thaiSpeed') || '0.85');
  });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [statusText, setStatusText] = useState<string>('');
  
  // Progress tracking
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('thaiDoneUnit3V4') || '[]');
    } catch {
      return [];
    }
  });

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [recordedAudios, setRecordedAudios] = useState<Record<string, string>>({});
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // PWA BeforeInstallPrompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Initialize Speech Synthesis and PWA
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices();
        setVoices(v);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // PWA install handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const totalActivities = words.length + sentences.length + qaLessons.length + rearrangeLessons.length + quizQuestions.length + blanks.length;
  const progressPct = Math.min(100, Math.round((done.length / Math.max(1, totalActivities)) * 100));

  const mark = (key: string) => {
    if (!done.includes(key)) {
      const updated = [...done, key];
      setDone(updated);
      localStorage.setItem('thaiDoneUnit3V4', JSON.stringify(updated));
    }
  };

  const navigate = (p: typeof page) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  // Text-To-Speech SpeechSynthesis
  const speak = (text: string, customSpeed?: number) => {
    if (!('speechSynthesis' in window)) {
      alert('ဤဖုန်းတွင် စာသားမှ အသံဖတ်သည့်စနစ် မရရှိပါ။');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = customSpeed || speed;

    const allVoices = window.speechSynthesis.getVoices();
    const thVoice = allVoices.find(v => v.lang.toLowerCase() === 'th-th') || 
                    allVoices.find(v => v.lang.toLowerCase().startsWith('th'));
    if (thVoice) {
      utterance.voice = thVoice;
    } else {
      setStatusText('Thai voice not found on device. Using fallback audio.');
    }
    window.speechSynthesis.speak(utterance);
  };

  // MediaRecorder Voice Recording
  const toggleRecord = async (id: string) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setActiveRecordId(null);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert('Recording requires microphone permission and a compatible browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedAudios(prev => ({ ...prev, [id]: url }));
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setActiveRecordId(id);
    } catch (e: any) {
      alert('Microphone permission unavailable: ' + e.message);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  // Rearrange bank helper
  const getRearrangeBank = (lessonIdx: number): number[] => {
    const n = rearrangeLessons[lessonIdx].parts.length;
    return Array.from({ length: n }, (_, i) => n - 1 - i);
  };

  const pickRearranged = (idx: number) => {
    const lesson = rearrangeLessons[reorderIndex];
    if (reorderPicked.includes(idx) || reorderPicked.length >= lesson.parts.length) return;
    setReorderPicked([...reorderPicked, idx]);
    setReorderChecked(false);
  };

  const removeRearranged = (idx: number) => {
    setReorderPicked(reorderPicked.filter(id => id !== idx));
    setReorderChecked(false);
  };

  const checkRearranged = () => {
    const lesson = rearrangeLessons[reorderIndex];
    if (reorderPicked.length !== lesson.parts.length) return;
    setReorderChecked(true);
    if (reorderPicked.every((id, j) => id === j)) {
      mark('rearrange-' + reorderIndex);
    }
  };

  const resetRearranged = () => {
    setReorderPicked([]);
    setReorderChecked(false);
  };

  const nextRearranged = () => {
    setReorderIndex((reorderIndex + 1) % rearrangeLessons.length);
    resetRearranged();
  };

  // Card actions helper (Sound buttons + voice recording)
  const renderCardActions = (entry: [string, string, string, string], recId: string = 'main', withRecord: boolean = true) => {
    const isThisRec = isRecording && activeRecordId === recId;
    const recordedUrl = recordedAudios[recId];

    return (
      <>
        <div className="controls">
          <button className="btn" onClick={() => speak(entry[0])}>
            🔊 နားထောင်ပါ
          </button>
          <button className="btn secondary" onClick={() => speak(entry[0], 0.7)}>
            🐢 Slow
          </button>
          {withRecord && (
            <button 
              className={`btn ghost ${isThisRec ? 'recording' : ''}`}
              onClick={() => toggleRecord(recId)}
            >
              {isThisRec ? '⏹️ အသံသွင်းရပ်မည်' : '🎙️ အသံသွင်းပါ'}
            </button>
          )}
        </div>
        {withRecord && recordedUrl && (
          <div style={{ marginTop: '12px' }}>
            <p className="muted small">သင့်အသံကို ပြန်နားထောင်ပါ</p>
            <audio controls src={recordedUrl} style={{ width: '100%', marginTop: '4px' }} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="app">
      {/* Hero Header */}
      <header className="hero">
        <div className="top">
          <div className="brandwrap">
            <img 
              className="school-logo" 
              src="https://lh3.googleusercontent.com/pw/AP1GczPdI1G1R7rNQMlLmGKxxGKzzfFfP9JMLDzkYaOaUv57fBHq1iLV-TK_gvpPCUzjXijjQWzjCZT8ZhIPCyttdygHy5-z84D20Nw-uqtznA67Gr73oGo=w2400" 
              alt="ThaiSar school logo" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/school-logo.svg';
              }}
            />
            <div>
              <div className="brand-title">THAISAR</div>
              <div className="logo-label">Thai · Myanmar Speaking School</div>
            </div>
          </div>
          <div className="pill">🇹🇭 + 🇲🇲</div>
        </div>
        <h1>အခန်း (၃) · ကိန်းဂဏန်းများ</h1>
        <p>Unit 3 · Listening & Speaking · Beginner</p>
        <div className="progress">
          <span style={{ width: `${progressPct}%` }}></span>
        </div>
        <div id="progressLabel" className="small" style={{ marginTop: '7px', color: '#e2f9f0' }}>
          သင်ယူမှု တိုးတက်မှု · {progressPct}% ({done.length} activities)
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content">
        {/* HOME PAGE */}
        {page === 'home' && (
          <div>
            <div className="section-head">
              <h2>စတင်လေ့လာပါ 🌼</h2>
              <span className="muted">အခန်း ၃</span>
            </div>
            <div className="notice">
              အသံကို နားထောင်ပါ → လိုက်ပြောပါ → စာကြောင်းကို လေ့ကျင့်ပါ။ ထိုင်းအက္ခရာ အရင်ကျက်ရန် မလိုပါ။
            </div>

            <div className="rows" style={{ marginTop: '14px' }}>
              <button className="tile" onClick={() => { navigate('learn'); setLearnTab('Words'); }}>
                <span className="emoji">📖</span>
                <strong>စကားလုံးများ</strong>
                <small>Vocabulary · {words.length} items</small>
              </button>

              <button className="tile" onClick={() => { navigate('learn'); setLearnTab('Sentences'); }}>
                <span className="emoji">🎧</span>
                <strong>ဝါကျများ</strong>
                <small>Listen & repeat · {sentences.length}</small>
              </button>

              <button className="tile" onClick={() => { navigate('learn'); setLearnTab('Grammar'); }}>
                <span className="emoji">🧩</span>
                <strong>သဒ္ဒါ</strong>
                <small>Tap to see {unit3GrammarPatterns.length} patterns</small>
              </button>

              <button className="tile" onClick={() => { navigate('learn'); setLearnTab('Q & A'); }}>
                <span className="emoji">💬</span>
                <strong>အမေး / အဖြေ</strong>
                <small>{qaLessons.length} listen & repeat pairs</small>
              </button>

              <button className="tile" onClick={() => { navigate('practice'); setPractice('quiz'); }}>
                <span className="emoji">📝</span>
                <strong>Unit 3 Quiz</strong>
                <small>{quizQuestions.length} comprehension questions</small>
              </button>

              <button className="tile" onClick={() => navigate('docs')} style={{ borderLeft: '3px solid #58136d' }}>
                <span className="emoji">📁</span>
                <strong>စာရွက်စာတမ်းများ</strong>
                <small>Personal Documents · Upload & Secure</small>
              </button>
            </div>

            <h3 style={{ marginTop: '24px' }}>ဒီနေ့ လေ့လာမယ့် ဝါကျ</h3>
            <div className="card">
              <span className="tag">Listen & repeat</span>
              <div className="thai" lang="th">{sentences[0][0]}</div>
              <div className="phonetic">{sentences[0][1]}</div>
              <div className="mm" lang="my">{sentences[0][2]}</div>
              {renderCardActions(sentences[0], 'home-sentence', false)}
            </div>

            <button className="btn wide" onClick={() => navigate('learn')}>
              သင်ခန်းစာ စတင်ရန် →
            </button>
          </div>
        )}

        {/* LEARN PAGE */}
        {page === 'learn' && (
          <div>
            <div className="section-head">
              <h2>
                {learnTab === 'Q & A' ? 'မေးခွန်းနှင့် အဖြေ · Q & A' :
                 learnTab === 'Grammar' ? 'သဒ္ဒါ · Grammar' : 'နားထောင်ပြီး လိုက်ပြောပါ'}
              </h2>
              <span className="counter">
                {learnTab === 'Words' ? `${learnIndex + 1} / ${words.length}` :
                 learnTab === 'Sentences' ? `${learnIndex + 1} / ${sentences.length}` :
                 learnTab === 'Q & A' ? `${qaIndex + 1} / ${qaLessons.length}` :
                 `${unit3GrammarPatterns.length} patterns`}
              </span>
            </div>

            {/* Sub-tabs */}
            <div className="controls">
              {(['Words', 'Sentences', 'Q & A', 'Grammar'] as const).map(n => (
                <button
                  key={n}
                  className={`btn ${learnTab === n ? '' : 'secondary'}`}
                  onClick={() => { setLearnTab(n); setLearnIndex(0); }}
                >
                  {n === 'Words' ? 'Words' : n === 'Sentences' ? 'Sentences' : n === 'Q & A' ? 'Q & A' : 'Grammar'}
                </button>
              ))}
            </div>

            {/* Q & A Tab */}
            {learnTab === 'Q & A' && (
              <div>
                <p className="section-intro">
                  မေးခွန်းနှင့် အဖြေကို တစ်ကြောင်းချင်း နားထောင်၍ လိုက်ပြောပါ။ ဖြေရန် မလိုပါ။
                </p>
                <div className="card">
                  {/* Question */}
                  <div className="qa-item">
                    <span className="tag">Q · မေးခွန်း</span>
                    <div className="thai" lang="th">{qaLessons[qaIndex][0]}</div>
                    <div className="phonetic">{schoolPhonetics[qaLessons[qaIndex][0]] || ''}</div>
                    <div className="mm" lang="my">{qaLessons[qaIndex][2]}</div>
                    {renderCardActions([qaLessons[qaIndex][0], '', qaLessons[qaIndex][2], ''], `qa_q_${qaIndex}`, true)}
                  </div>

                  <div className="qa-divider">↓ Answer · အဖြေ</div>

                  {/* Answer */}
                  <div className="qa-item">
                    <span className="tag">A · အဖြေ</span>
                    <div className="thai" lang="th">{qaLessons[qaIndex][1]}</div>
                    <div className="phonetic">{schoolPhonetics[qaLessons[qaIndex][1]] || ''}</div>
                    <div className="mm" lang="my">{qaLessons[qaIndex][3]}</div>
                    {renderCardActions([qaLessons[qaIndex][1], '', qaLessons[qaIndex][3], ''], `qa_a_${qaIndex}`, true)}
                  </div>
                </div>

                <div className="controls">
                  <button 
                    className="btn secondary" 
                    onClick={() => {
                      mark(`learn-qa-${qaIndex}`);
                      setQaIndex((qaIndex - 1 + qaLessons.length) % qaLessons.length);
                    }}
                  >
                    ← အရင်တစ်ခု
                  </button>
                  <button 
                    className="btn" 
                    onClick={() => {
                      mark(`learn-qa-${qaIndex}`);
                      setQaIndex((qaIndex + 1) % qaLessons.length);
                    }}
                  >
                    နောက်တစ်ခု →
                  </button>
                </div>
              </div>
            )}

            {/* Grammar Tab */}
            {learnTab === 'Grammar' && (
              <div>
                <p className="section-intro">
                  အခန်း (၃) စာအုပ်မှ ဝါကျများတွင် ပါဝင်သော သဒ္ဒါပုံစံများကို စုစည်းထားပါသည်။ ခေါင်းစဉ်ကို နှိပ်ပြီး ထိုင်းစာ၊ အသံထွက်နှင့် မြန်မာအဓိပ္ပာယ်ကို လေ့လာပါ။
                </p>
                {unit3GrammarPatterns.map((g, j) => {
                  const examples = g.examples
                    .map(t => sentences.find(s => s[0] === t) || words.find(w => w[0] === t))
                    .filter(Boolean) as [string, string, string, string][];

                  return (
                    <details key={j} className="grammar-accordion" open={j === 0}>
                      <summary>{j + 1}. {g.title}</summary>
                      <div className="grammar-body">
                        <h3 style={{ marginTop: '15px' }}>{g.formula}</h3>
                        <p className="muted">{g.explain}</p>
                        {examples.map((x, idx) => (
                          <div key={idx} style={{ padding: '15px 0', borderTop: '1px solid #efe7f1' }}>
                            <div className="thai" style={{ fontSize: '23px' }}>{x[0]}</div>
                            <div className="phonetic">{x[1]}</div>
                            <div className="mm">{x[2]}</div>
                            {renderCardActions(x, `grammar_${j}_${idx}`, false)}
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}

            {/* Words or Sentences Tab */}
            {(learnTab === 'Words' || learnTab === 'Sentences') && (() => {
              const list = learnTab === 'Words' ? words : sentences;
              const currentItem = list[learnIndex] || list[0];

              return (
                <div>
                  <div className="card">
                    <span className="tag">{currentItem[3]}</span>
                    <div className="thai" lang="th">{currentItem[0]}</div>
                    <div className="phonetic">{currentItem[1]}</div>
                    <div className="mm" lang="my">{currentItem[2]}</div>
                    {renderCardActions(currentItem, `learn_${learnTab}_${learnIndex}`, true)}
                  </div>

                  <div className="controls">
                    <button 
                      className="btn secondary" 
                      onClick={() => {
                        mark(`learn-${learnTab}-${learnIndex}`);
                        setLearnIndex((learnIndex - 1 + list.length) % list.length);
                      }}
                    >
                      ← ရှေ့သို့
                    </button>
                    <button 
                      className="btn" 
                      onClick={() => {
                        mark(`learn-${learnTab}-${learnIndex}`);
                        setLearnIndex((learnIndex + 1) % list.length);
                      }}
                    >
                      သိပြီ · Next →
                    </button>
                  </div>
                </div>
              );
            })()}

            {statusText && <p className="footnote">{statusText}</p>}
          </div>
        )}

        {/* PRACTICE PAGE */}
        {page === 'practice' && (
          <div>
            <div className="section-head">
              <h2>Practice · လေ့ကျင့်ခန်း</h2>
            </div>

            <div className="rows practice-tiles">
              <button className="tile" onClick={() => { setPractice('quiz'); setQuestionIndex(0); }}>
                <strong>📝 Unit 3 Quiz</strong>
                <small>သင်ယူထားသည်ကို စမ်းစစ်ပါ</small>
              </button>
              <button className="tile" onClick={() => { setPractice('blank'); setQuestionIndex(0); setFillChoice(null); setFillChecked(false); }}>
                <strong>🎧 Listen & Fill</strong>
                <small>နားထောင်ပြီး ဖြည့်ပါ</small>
              </button>
              <button className="tile" onClick={() => { setPractice('rearrange'); setReorderIndex(0); resetRearranged(); }}>
                <strong>🧩 Rearrange Sentence</strong>
                <small>စကားလုံးများကို အစီအစဉ်မှန် စီပါ</small>
              </button>
            </div>

            <div id="exercise" style={{ marginTop: '16px' }}>
              {/* QUIZ MODE */}
              {practice === 'quiz' && (() => {
                if (questionIndex >= quizQuestions.length) {
                  const pct = Math.round((quizScore / quizQuestions.length) * 100);
                  return (
                    <div className="card quiz-finish">
                      <div className="bigscore">{pct}%</div>
                      <h2>Unit 3 Quiz ပြီးပါပြီ!</h2>
                      <p className="mm">{quizScore} / {quizQuestions.length} မှန်ပါတယ်။</p>
                      <p className="muted">မှားခဲ့သော မေးခွန်းများကို ပြန်ကြည့်ပြီး နောက်တစ်ကြိမ် စမ်းကြည့်နိုင်ပါတယ်။</p>
                      {quizResponses.filter(x => !x.correct).map(x => (
                        <div key={x.index} className="quiz-review">
                          <strong>{quizQuestions[x.index].q}</strong>
                          <p className="muted">{quizQuestions[x.index].why}</p>
                        </div>
                      ))}
                      <button 
                        className="btn wide" 
                        onClick={() => {
                          setQuestionIndex(0);
                          setQuizScore(0);
                          setQuizResponses([]);
                        }}
                      >
                        🔄 Quiz ပြန်ဖြေရန်
                      </button>
                    </div>
                  );
                }

                const q = quizQuestions[questionIndex];
                const picked = quizResponses.find(x => x.index === questionIndex);

                return (
                  <div className="card">
                    <span className="tag">Unit 3 Quiz · {questionIndex + 1} / {quizQuestions.length}</span>
                    <div className="quiz-progress">
                      <span style={{ width: `${(100 * questionIndex) / quizQuestions.length}%` }}></span>
                    </div>
                    <h3 className="quiz-question">{q.q}</h3>
                    {q.audio && (
                      <div className="controls" style={{ marginBottom: '12px' }}>
                        <button className="btn" onClick={() => speak(q.audio!)}>🔊 အသံနားထောင်ပါ</button>
                        <button className="btn secondary" onClick={() => speak(q.audio!, 0.7)}>🐢 Slow</button>
                      </div>
                    )}

                    <div className="stack" style={{ marginTop: '17px' }}>
                      {q.choices.map((opt, j) => {
                        const isCorrect = j === q.correct;
                        const isSelected = picked?.choice === j;
                        let optClass = '';
                        if (picked) {
                          if (isCorrect) optClass = 'correct';
                          else if (isSelected) optClass = 'incorrect';
                        }

                        return (
                          <button
                            key={j}
                            className={`quiz-option ${optClass}`}
                            disabled={!!picked}
                            onClick={() => {
                              if (picked) return;
                              const correct = j === q.correct;
                              setQuizResponses([...quizResponses, { index: questionIndex, choice: j, correct }]);
                              if (correct) setQuizScore(quizScore + 1);
                            }}
                          >
                            {String.fromCharCode(65 + j)}. {opt}
                          </button>
                        );
                      })}
                    </div>

                    {picked ? (
                      <div>
                        <div className="quiz-feedback">
                          <strong>{picked.correct ? '✅ မှန်ပါတယ်!' : '❌ လေ့လာပြီး ထပ်စမ်းကြည့်ပါ။'}</strong>
                          <p>{q.why}</p>
                        </div>
                        <button 
                          className="btn wide" 
                          onClick={() => {
                            if (questionIndex === quizQuestions.length - 1) {
                              mark('unit3-quiz-completed');
                            }
                            setQuestionIndex(questionIndex + 1);
                          }}
                        >
                          {questionIndex === quizQuestions.length - 1 ? 'ရလဒ် ကြည့်ရန် →' : 'နောက်မေးခွန်း →'}
                        </button>
                      </div>
                    ) : (
                      <p className="muted" style={{ marginTop: '14px' }}>အဖြေတစ်ခုကို ရွေးပါ။</p>
                    )}
                  </div>
                );
              })()}

              {/* LISTEN & FILL MODE */}
              {practice === 'blank' && (() => {
                const i = questionIndex % blanks.length;
                const q = blanks[i];
                const correct = q.choices.indexOf(q.answer);

                return (
                  <div className="card fill-card">
                    <span className="tag">🎧 Listen & Fill · {i + 1} / {blanks.length}</span>
                    <p className="section-intro">
                      အသံကို နားထောင်ပြီး အဖြေမှန်ကို ရွေးပါ။ <strong>ထိုင်းစာဖတ်တတ်ရန် မလိုပါ။</strong> ကတ်တစ်ခုစီတွင် ထိုင်းစာ၊ စာအုပ်သုံး phonetic၊ မြန်မာအသံထွက်နှင့် မြန်မာအဓိပ္ပာယ် ပါရှိသည်။
                    </p>

                    <div className="fill-prompt">
                      <span className="fill-prompt-label">မြန်မာအဓိပ္ပာယ်</span>
                      <div className="mm" lang="my">{q.meaning}</div>
                      <div className="fill-blank-line" lang="th">{q.blank}</div>
                    </div>

                    <div className="controls">
                      <button className="btn" onClick={() => speak(q.full)}>
                        🔊 နားထောင်ပါ
                      </button>
                      <button className="btn secondary" onClick={() => speak(q.full, 0.7)}>
                        🐢 ဖြည်းဖြည်း
                      </button>
                    </div>

                    <h3 className="fill-heading">အဖြေတစ်ခုကို ရွေးပါ။</h3>
                    <div className="fill-options">
                      {q.choices.map((word, j) => {
                        const entry = fillVocabulary[word] || ['/th/', word, 'အဓိပ္ပာယ်'];
                        let stateClass = '';
                        if (fillChecked) {
                          if (j === correct) stateClass = ' is-correct';
                          else if (j === fillChoice) stateClass = ' is-wrong';
                        } else if (fillChoice === j) {
                          stateClass = ' is-selected';
                        }

                        return (
                          <button
                            key={j}
                            type="button"
                            className={`fill-choice${stateClass}`}
                            disabled={fillChecked}
                            onClick={() => {
                              if (!fillChecked) setFillChoice(j);
                            }}
                          >
                            <span className="fill-number">{String.fromCharCode(65 + j)}</span>
                            <span className="fill-lines">
                              <span className="fill-thai" lang="th">{word}</span>
                              <span className="fill-phonetic">{entry[0]}</span>
                              <span className="fill-pronunciation" lang="my">{entry[1]}</span>
                              <span className="fill-meaning" lang="my">{entry[2]}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {!fillChecked ? (
                      <button 
                        className="btn wide" 
                        disabled={fillChoice === null}
                        onClick={() => {
                          if (fillChoice === null) return;
                          setFillChecked(true);
                          if (q.choices[fillChoice] === q.answer) {
                            mark(`blank-${i}`);
                          }
                        }}
                      >
                        အဖြေစစ်ဆေးပါ
                      </button>
                    ) : (
                      <div>
                        <div className={`fill-feedback ${fillChoice === correct ? 'good' : 'retry'}`}>
                          <strong>{fillChoice === correct ? '✅ မှန်ပါတယ်!' : '📖 အဖြေမှန်ကို လေ့လာပါ။'}</strong>
                          <p>
                            {fillChoice === correct 
                              ? 'အသံကို မှန်ကန်စွာ ရွေးချယ်နိုင်ပါတယ်။' 
                              : 'မှားသောအဖြေကို ပြထားပြီး အဖြေမှန်ကို အစိမ်းရောင်ဖြင့် ပြထားပါတယ်။'}
                          </p>
                          <div className="fill-fully">
                            <div className="thai" lang="th">{q.full}</div>
                            <div className="phonetic">{schoolPhonetics[q.full] || ''}</div>
                            <div className="mm" lang="my">{q.meaning}</div>
                          </div>
                        </div>

                        <div className="controls">
                          <button 
                            className="btn secondary" 
                            onClick={() => { setFillChoice(null); setFillChecked(false); }}
                          >
                            ↺ ပြန်လေ့ကျင့်ရန်
                          </button>
                          <button 
                            className="btn" 
                            onClick={() => {
                              setQuestionIndex(questionIndex + 1);
                              setFillChoice(null);
                              setFillChecked(false);
                            }}
                          >
                            {i === blanks.length - 1 ? 'အစက ပြန်လေ့ကျင့်ရန်' : 'နောက်မေးခွန်း →'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* REARRANGE SENTENCE MODE */}
              {practice === 'rearrange' && (() => {
                const lesson: RearrangeItem = rearrangeLessons[reorderIndex];
                const available = getRearrangeBank(reorderIndex).filter(id => !reorderPicked.includes(id));
                const complete = reorderPicked.length === lesson.parts.length;
                const correct = reorderChecked && complete && reorderPicked.every((id, j) => id === j);

                return (
                  <div className="card">
                    <span className="tag">Rearrange Sentence · {reorderIndex + 1} / {rearrangeLessons.length}</span>
                    <p className="section-intro">
                      မြန်မာအဓိပ္ပာယ်ကို ဖတ်ပြီး ထိုင်းစကားလုံးများကို အစီအစဉ်မှန် စီပါ။ ကတ်တစ်ခုစီတွင် ထိုင်းစာ၊ စာအုပ်သုံး phonetic နှင့် မြန်မာအသံထွက် ပါရှိသည်။
                    </p>

                    <div className="reorder-prompt">
                      <strong>မြန်မာအဓိပ္ပာယ်</strong>
                      <div className="mm">{lesson.meaning}</div>
                    </div>

                    <div className="controls">
                      <button className="btn secondary" onClick={() => speak(lesson.parts.map(p => p[0]).join(''))}>
                        🔊 နားထောင်ပါ
                      </button>
                      <button className="btn ghost" onClick={() => speak(lesson.parts.map(p => p[0]).join(''), 0.7)}>
                        🐢 အနှေးအသံ
                      </button>
                    </div>

                    {/* Area 1: Picked answer tokens */}
                    <div className="reorder-area">
                      <h4>၁။ စီထားသော စကားလုံးများ (နှိပ်၍ ပြန်ဖြုတ်နိုင်ပါသည်)</h4>
                      <div className="reorder-tiles">
                        {reorderPicked.length > 0 ? (
                          reorderPicked.map(id => (
                            <button
                              key={id}
                              type="button"
                              className="reorder-token selected"
                              onClick={() => removeRearranged(id)}
                            >
                              <span className="reorder-thai" lang="th">{lesson.parts[id][0]}</span>
                              <span className="reorder-phon">{lesson.parts[id][1]}</span>
                              <span className="reorder-my" lang="my">{lesson.parts[id][2]}</span>
                            </button>
                          ))
                        ) : (
                          <div className="reorder-empty">အောက်က ကတ်များကို အစဉ်လိုက် နှိပ်ပါ။</div>
                        )}
                      </div>
                    </div>

                    {/* Area 2: Available bank tokens */}
                    <div className="reorder-bank">
                      <h4>၂။ စကားလုံးကတ်များ</h4>
                      <div className="reorder-tiles">
                        {available.length > 0 ? (
                          available.map(id => (
                            <button
                              key={id}
                              type="button"
                              className="reorder-token"
                              onClick={() => pickRearranged(id)}
                            >
                              <span className="reorder-thai" lang="th">{lesson.parts[id][0]}</span>
                              <span className="reorder-phon">{lesson.parts[id][1]}</span>
                              <span className="reorder-my" lang="my">{lesson.parts[id][2]}</span>
                            </button>
                          ))
                        ) : (
                          <span className="muted">စကားလုံးအားလုံး စီပြီးပါပြီ။</span>
                        )}
                      </div>
                    </div>

                    {/* Feedback */}
                    {reorderChecked && (
                      correct ? (
                        <div>
                          <div className="reorder-status good">
                            <strong>✅ မှန်ပါတယ်!</strong> စာကြောင်းကို မှန်ကန်စွာ စီထားပါတယ်။
                          </div>
                          <div className="reorder-complete">
                            <div className="thai" lang="th">{lesson.parts.map(p => p[0]).join('')}</div>
                            <div className="phonetic">
                              {`/${lesson.parts.map(p => p[1].replaceAll('/', '')).join('-')}/`}
                            </div>
                            <div className="mm">{lesson.meaning}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="reorder-status try">
                          အစီအစဉ် မမှန်သေးပါ။ စကားလုံးကို နှိပ်ပြီး ပြန်ရွှေ့နိုင်ပါတယ်။
                        </div>
                      )
                    )}

                    <div className="reorder-controls">
                      <button className="btn secondary" onClick={resetRearranged}>
                        ↺ ပြန်စီရန်
                      </button>
                      {correct ? (
                        <button className="btn" onClick={nextRearranged}>
                          {reorderIndex === rearrangeLessons.length - 1 ? 'နောက်တစ်ကြိမ် လေ့ကျင့်ရန်' : 'နောက်ဝါကျ →'}
                        </button>
                      ) : (
                        <button className="btn" disabled={!complete} onClick={checkRearranged}>
                          ✓ အဖြေစစ်ရန်
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* FLASHCARDS PAGE */}
        {page === 'flash' && (() => {
          const w = words[flashIndex];
          return (
            <div>
              <div className="section-head">
                <h2>Flashcards · မှတ်ဉာဏ်လေ့ကျင့်</h2>
                <span className="counter">{flashIndex + 1} / {words.length}</span>
              </div>

              <div
                className="card"
                style={{
                  textAlign: 'center',
                  minHeight: '310px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setFlashBack(!flashBack);
                  mark(`card-${flashIndex}`);
                }}
              >
                <span className="tag">{flashBack ? 'Meaning' : 'Thai word'}</span>
                {flashBack ? (
                  <div className="mm" style={{ fontSize: '26px' }}>{w[2]}</div>
                ) : (
                  <>
                    <div className="thai">{w[0]}</div>
                    <div className="phonetic">{w[1]}</div>
                  </>
                )}
                <p className="muted" style={{ marginTop: '18px' }}>ကတ်ကိုနှိပ်ပြီး လှန်ကြည့်ပါ</p>
              </div>

              <div className="controls">
                <button className="btn secondary" onClick={() => speak(w[0])}>
                  🔊 နားထောင်ပါ
                </button>
                <button 
                  className="btn ghost" 
                  onClick={() => {
                    setFlashIndex((flashIndex - 1 + words.length) % words.length);
                    setFlashBack(false);
                  }}
                >
                  ← ရှေ့သို့
                </button>
                <button 
                  className="btn" 
                  onClick={() => {
                    setFlashIndex((flashIndex + 1) % words.length);
                    setFlashBack(false);
                  }}
                >
                  နောက်တစ်ခု →
                </button>
              </div>
            </div>
          );
        })()}

        {/* PERSONAL DOCUMENTS DASHBOARD PAGE */}
        {page === 'docs' && (
          <DocumentDashboard onBackToHome={() => navigate('home')} />
        )}

        {/* SETTINGS PAGE */}
        {page === 'settings' && (
          <div>
            <h2>⚙️ အသံနှင့် app settings</h2>

            <div className="card">
              <h3>Thai voice · အသံ</h3>
              <p className="muted">Thai voice selection depends on the browser and operating system.</p>
              <div className="notice" style={{ marginTop: '8px', marginBottom: '14px' }}>
                {voices.filter(x => x.lang.toLowerCase().startsWith('th')).map(x => `${x.name} (${x.lang})`).join(', ') || 
                 'Thai voice detected or browser default synthesis ready.'}
              </div>

              <label htmlFor="rate" style={{ display: 'block', marginBottom: '6px' }}>
                Audio speed · <strong>{speed}×</strong>
              </label>
              <input
                id="rate"
                type="range"
                min="0.5"
                max="1.1"
                step="0.05"
                value={speed}
                style={{ width: '100%', accentColor: '#58136d' }}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setSpeed(val);
                  localStorage.setItem('thaiSpeed', String(val));
                }}
              />

              <div className="controls" style={{ marginTop: '14px' }}>
                <button className="btn" onClick={() => speak('สวัสดีครับ')}>
                  🔊 Test Thai voice
                </button>
              </div>
            </div>

            <div className="card">
              <h3>Install on phone (PWA)</h3>
              <p className="muted">
                Open the site in Chrome on Android or Safari on iPhone, then use "Add to Home Screen" / "Install App" to use it like a native mobile app.
              </p>
              {deferredPrompt && !isInstalled && (
                <div style={{ marginTop: '12px' }}>
                  <button className="btn wide" onClick={handleInstallClick}>
                    📲 Install App on this device
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <h3>Student progress</h3>
              <p className="muted">Saved on this device, not synchronized with a school account.</p>
              <button
                className="btn secondary"
                style={{ marginTop: '10px' }}
                onClick={() => {
                  if (window.confirm('Reset your progress?')) {
                    setDone([]);
                    localStorage.removeItem('thaiDoneUnit3V4');
                  }
                }}
              >
                Reset progress
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar */}
      <nav className="nav" id="nav">
        <button 
          className={page === 'home' ? 'active' : ''} 
          onClick={() => navigate('home')}
        >
          <span className="ico">⌂</span>
          ပင်မ
        </button>

        <button 
          className={page === 'learn' ? 'active' : ''} 
          onClick={() => navigate('learn')}
        >
          <span className="ico">◉</span>
          လေ့လာ
        </button>

        <button 
          className={page === 'practice' ? 'active' : ''} 
          onClick={() => navigate('practice')}
        >
          <span className="ico">✦</span>
          လေ့ကျင့်
        </button>

        <button 
          className={page === 'flash' ? 'active' : ''} 
          onClick={() => navigate('flash')}
        >
          <span className="ico">▣</span>
          ကတ်များ
        </button>

        <button 
          className={page === 'docs' ? 'active' : ''} 
          onClick={() => navigate('docs')}
        >
          <span className="ico">📁</span>
          စာရွက်
        </button>

        <button 
          className={page === 'settings' ? 'active' : ''} 
          onClick={() => navigate('settings')}
        >
          <span className="ico">⚙</span>
          ချိန်ညှိ
        </button>
      </nav>
    </div>
  );
}
