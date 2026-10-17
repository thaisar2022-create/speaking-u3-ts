import React, { useState, useRef, useEffect } from 'react';
import { UserDocument, DocumentCategory } from '../types/document';
import { 
  getStoredDocuments, 
  saveDocuments, 
  formatFileSize, 
  getDocumentStats,
  getStoredPIN,
  setStoredPIN,
  removeStoredPIN
} from '../utils/documentStorage';

interface DocumentDashboardProps {
  onBackToHome?: () => void;
}

const CATEGORIES: DocumentCategory[] = [
  'Lesson Notes',
  'Homework',
  'Audio Recordings',
  'Certificates & IDs',
  'Financial & Receipts',
  'Other'
];

export const DocumentDashboard: React.FC<DocumentDashboardProps> = () => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [previewDoc, setPreviewDoc] = useState<UserDocument | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Security / PIN protection state
  const [storedPin, setStoredPinState] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPinSetupModal, setShowPinSetupModal] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('Lesson Notes');
  const [uploadTags, setUploadTags] = useState<string>('Unit 3');
  const [uploadNotes, setUploadNotes] = useState<string>('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents and PIN status on mount
  useEffect(() => {
    const docs = getStoredDocuments();
    setDocuments(docs);
    const pin = getStoredPIN();
    setStoredPinState(pin);
    if (pin) {
      setIsLocked(true);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storedPin) {
      setIsLocked(false);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('လုံခြုံရေး PIN နံပါတ် မှားယွင်းနေပါသည်။ ထပ်မံကြိုးစားပါ။');
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      alert('PIN နံပါတ်သည် အနည်းဆုံး ၄ လုံး ရှိရပါမည်။');
      return;
    }
    setStoredPIN(newPin);
    setStoredPinState(newPin);
    setShowPinSetupModal(false);
    setNewPin('');
    showFeedback('🔒 Dashboard အတွက် လုံခြုံရေး PIN ကို သတ်မှတ်ပြီးပါပြီ။');
  };

  const handleRemovePin = () => {
    if (window.confirm('လုံခြုံရေး PIN နံပါတ်ကို ဖျက်ပယ်လိုပါသလား။')) {
      removeStoredPIN();
      setStoredPinState(null);
      setIsLocked(false);
      showFeedback('🔓 လုံခြုံရေး PIN ကို ပယ်ဖျက်လိုက်ပါပြီ။');
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('ဖိုင်အရွယ်အစားသည် 20 MB ထက် မကျော်လွန်ရပါ။');
      return;
    }
    setPendingFile(file);
    setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    setIsUploading(true);
  };

  const handleSaveUpload = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newDoc: UserDocument = {
        id: 'doc_' + Date.now(),
        title: uploadTitle.trim() || pendingFile.name,
        category: uploadCategory,
        fileName: pendingFile.name,
        fileSize: pendingFile.size,
        fileType: pendingFile.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
        tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
        notes: uploadNotes.trim(),
        dataUrl: dataUrl
      };

      const updated = [newDoc, ...documents];
      setDocuments(updated);
      saveDocuments(updated);
      setIsUploading(false);
      setPendingFile(null);
      setUploadTitle('');
      setUploadNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      showFeedback('✅ ဖိုင်ကို Dashboard တွင် လုံခြုံစွာ သိမ်းဆည်းလိုက်ပါပြီ။');
    };
    reader.readAsDataURL(pendingFile);
  };

  const handleSaveNote = () => {
    if (!uploadTitle.trim() || !noteContent.trim()) {
      alert('မှတ်စုခေါင်းစဉ်နှင့် အကြောင်းအရာကို ဖြည့်စွက်ပေးပါ။');
      return;
    }

    const blob = new Blob([noteContent], { type: 'text/plain;charset=utf-8' });
    const newDoc: UserDocument = {
      id: 'doc_' + Date.now(),
      title: uploadTitle.trim(),
      category: uploadCategory,
      fileName: `${uploadTitle.trim().replace(/\s+/g, '_')}.txt`,
      fileSize: blob.size,
      fileType: 'text/plain',
      uploadedAt: new Date().toISOString(),
      tags: uploadTags.split(',').map(t => t.trim()).filter(Boolean),
      notes: uploadNotes.trim(),
      dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent(noteContent)
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    saveDocuments(updated);
    setShowNoteModal(false);
    setUploadTitle('');
    setNoteContent('');
    setUploadNotes('');
    showFeedback('📝 ကိုယ်ပိုင်သင်ခန်းစာ မှတ်စုကို လုံခြုံစွာ သိမ်းဆည်းလိုက်ပါပြီ။');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('ဤစာရွက်စာတမ်းကို အပြီးတိုင် ဖျက်ပစ်လိုပါသလား။')) {
      const updated = documents.filter(d => d.id !== id);
      setDocuments(updated);
      saveDocuments(updated);
      if (previewDoc?.id === id) setPreviewDoc(null);
      showFeedback('🗑️ စာရွက်စာတမ်းကို ဖျက်လိုက်ပါပြီ။');
    }
  };

  const handleDownload = (doc: UserDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = doc.dataUrl;
    link.download = doc.fileName || `${doc.title}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesQuery = !searchQuery || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.notes && doc.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const stats = getDocumentStats(documents);

  // If dashboard is PIN-locked
  if (isLocked) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '30px 20px', marginTop: '20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '14px' }}>🔒</div>
        <h2>လုံခြုံရေး PIN နံပါတ် ရိုက်ထည့်ပါ</h2>
        <p className="muted" style={{ margin: '8px 0 20px' }}>
          သင့်ကိုယ်ပိုင် စာရွက်စာတမ်းများနှင့် မှတ်စုများကို ကာကွယ်ရန် လုံခြုံရေးစနစ် ဖွင့်ထားပါသည်။
        </p>

        <form onSubmit={handleUnlock} style={{ maxWidth: '280px', margin: 'auto' }}>
          <input
            type="password"
            maxLength={6}
            placeholder="PIN ရိုက်ထည့်ပါ (ဥပမာ 1234)"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', marginBottom: '12px' }}
            autoFocus
          />
          {pinError && <div style={{ color: '#b52c2c', fontSize: '13px', marginBottom: '12px' }}>{pinError}</div>}
          <button type="submit" className="btn wide">
            🔓 ဖွင့်ပါ (Unlock)
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Section Head */}
      <div className="section-head">
        <h2>📁 စာရွက်စာတမ်းများ · Documents</h2>
        <span className="counter">{documents.length} files</span>
      </div>

      {/* Security notice */}
      <div className="notice" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>🔒 လုံခြုံသော ကိုယ်ပိုင် Dashboard</strong>
          <div style={{ fontSize: '12px', marginTop: '2px' }}>
            ဖိုင်များကို သင့်စက်တွင်း (Local Storage) တွင် လုံခြုံစွာ သီးသန့်သိမ်းဆည်းထားပါသည်။
          </div>
        </div>
        <div>
          {storedPin ? (
            <button 
              className="btn secondary" 
              style={{ minHeight: '34px', padding: '6px 10px', fontSize: '12px' }}
              onClick={handleRemovePin}
            >
              🔒 PIN ဖျက်ရန်
            </button>
          ) : (
            <button 
              className="btn secondary" 
              style={{ minHeight: '34px', padding: '6px 10px', fontSize: '12px' }}
              onClick={() => setShowPinSetupModal(true)}
            >
              🔐 PIN သတ်မှတ်ရန်
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="notice success" style={{ marginTop: '12px' }}>
          {feedbackMsg}
        </div>
      )}

      {/* Dashboard Stats */}
      <div className="rows" style={{ marginTop: '14px', marginBottom: '14px' }}>
        <div className="tile" style={{ minHeight: '80px', padding: '12px 14px' }}>
          <span className="emoji">📊</span>
          <strong>စုစုပေါင်း ဖိုင်များ</strong>
          <small>{stats.totalCount} ခု ({formatFileSize(stats.totalSize)})</small>
        </div>
        <div className="tile" style={{ minHeight: '80px', padding: '12px 14px' }}>
          <span className="emoji">{storedPin ? '🛡️' : '🔓'}</span>
          <strong>လုံခြုံရေး အခြေအနေ</strong>
          <small>{storedPin ? 'PIN ဖြင့် ကာကွယ်ထားပါသည်' : 'စက်တွင်း သီးသန့်လုံခြုံရေး'}</small>
        </div>
      </div>

      {/* Action Buttons: Upload & Write Note */}
      <div className="controls" style={{ marginTop: '0', marginBottom: '14px' }}>
        <button 
          className="btn" 
          style={{ flex: '1' }} 
          onClick={() => fileInputRef.current?.click()}
        >
          📤 ဖိုင်တင်မည် (Upload)
        </button>
        <button 
          className="btn secondary" 
          style={{ flex: '1' }} 
          onClick={() => setShowNoteModal(true)}
        >
          📝 မှတ်စုအသစ် ရေးမည်
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }}
        accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.txt,.doc,.docx"
      />

      {/* Drag & drop upload area */}
      <div 
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>☁️</div>
        <strong style={{ color: '#511368' }}>ဖိုင်များကို ဤနေရာသို့ ဆွဲထည့်ပါ (သို့မဟုတ် နှိပ်ပါ)</strong>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          PDF, အသံဖိုင် (Audio), ပုံ (Image), Word, သင်ခန်းစာ မှတ်စုများကို လုံခြုံစွာ တင်နိုင်ပါသည် (Max 20MB)
        </p>
      </div>

      {/* Search Input */}
      <div style={{ margin: '14px 0 8px' }}>
        <input 
          type="search" 
          placeholder="🔍 ဖိုင်အမည်၊ မှတ်စု သို့မဟုတ် Tag ဖြင့် ရှာဖွေပါ..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category filter tabs */}
      <div className="filter-scroll">
        <button 
          className={`filter-btn ${selectedCategory === 'All' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('All')}
        >
          အားလုံး ({documents.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = stats.categoryCounts[cat] || 0;
          return (
            <button 
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'Lesson Notes' ? '📖 သင်ခန်းစာ' : 
               cat === 'Homework' ? '✏️ အိမ်စာ' : 
               cat === 'Audio Recordings' ? '🎙️ အသံဖိုင်' : 
               cat === 'Certificates & IDs' ? '🎓 လက်မှတ်/ကတ်' : 
               cat === 'Financial & Receipts' ? '💰 ငွေကြေး/ဘောက်ချာ' : '📁 အခြား'} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents List */}
      <div style={{ marginTop: '12px' }}>
        {filteredDocs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📂</div>
            <strong style={{ color: '#511368' }}>စာရွက်စာတမ်း မရှိသေးပါ</strong>
            <p className="muted small" style={{ margin: '6px 0 16px' }}>
              {searchQuery ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ဖိုင်မရှိပါ။' : 'အထက်ပါ "ဖိုင်တင်မည်" သို့မဟုတ် "မှတ်စုအသစ်" ကို နှိပ်ပြီး စတင်သိမ်းဆည်းပါ။'}
            </p>
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isAudio = doc.fileType.startsWith('audio/') || doc.fileName.endsWith('.mp3') || doc.fileName.endsWith('.wav');
            const isImage = doc.fileType.startsWith('image/');
            const isPdf = doc.fileType.includes('pdf') || doc.fileName.endsWith('.pdf');
            const icon = isAudio ? '🎧' : isImage ? '🖼️' : isPdf ? '📄' : '📝';

            return (
              <div 
                key={doc.id} 
                className="card" 
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onClick={() => setPreviewDoc(doc)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '26px', lineHeight: 1 }}>{icon}</span>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#4d1060' }}>
                        {doc.title}
                      </h3>
                      <div className="muted small" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{doc.fileName}</span>
                        <span>·</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>·</span>
                        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <span className="tag" style={{ margin: 0, whiteSpace: 'nowrap', fontSize: '11px', padding: '4px 8px' }}>
                    {doc.category}
                  </span>
                </div>

                {doc.notes && (
                  <p className="muted small" style={{ margin: '10px 0 6px', background: '#fdf9ff', padding: '8px 10px', borderRadius: '8px' }}>
                    💡 {doc.notes}
                  </p>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {doc.tags.map((t, i) => (
                      <span key={i} style={{ fontSize: '11px', color: '#563066', background: '#f1e7f6', padding: '2px 8px', borderRadius: '6px' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline audio player if audio file */}
                {isAudio && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <audio controls src={doc.dataUrl} style={{ height: '36px', marginTop: '10px' }} />
                  </div>
                )}

                {/* Card controls */}
                <div className="controls" style={{ marginTop: '12px' }}>
                  <button 
                    className="btn secondary" 
                    style={{ minHeight: '36px', padding: '6px 12px', fontSize: '12px' }}
                    onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                  >
                    👁️ ဖတ်ရှု / ကြည့်မည်
                  </button>
                  <button 
                    className="btn ghost" 
                    style={{ minHeight: '36px', padding: '6px 12px', fontSize: '12px' }}
                    onClick={(e) => handleDownload(doc, e)}
                  >
                    ⬇️ သိမ်းဆည်းရန်
                  </button>
                  <button 
                    className="btn danger" 
                    style={{ minHeight: '36px', padding: '6px 10px', fontSize: '12px', marginLeft: 'auto' }}
                    onClick={(e) => handleDelete(doc.id, e)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Confirmation Modal */}
      {isUploading && pendingFile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '14px' }}>📤 စာရွက်စာတမ်း အချက်အလက်များ</h2>
            <div className="notice" style={{ marginBottom: '14px' }}>
              ဖိုင်အမည်: <strong>{pendingFile.name}</strong> ({formatFileSize(pendingFile.size)})
            </div>

            <div className="stack">
              <label>
                <span className="small">ခေါင်းစဉ် (Title)</span>
                <input 
                  type="text" 
                  value={uploadTitle} 
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="ဥပမာ - အခန်း ၃ လေ့ကျင့်ခန်း အဖြေ"
                />
              </label>

              <label>
                <span className="small">အမျိုးအစား (Category)</span>
                <select 
                  value={uploadCategory} 
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label>
                <span className="small">Tags (ကော်မာခံ၍ ခွဲပါ)</span>
                <input 
                  type="text" 
                  value={uploadTags} 
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Unit 3, Vocabulary, Homework"
                />
              </label>

              <label>
                <span className="small">ကိုယ်ပိုင် မှတ်ချက် (Notes)</span>
                <textarea 
                  rows={3} 
                  value={uploadNotes} 
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="ဤစာရွက်စာတမ်းနှင့် ပတ်သက်သော အဓိကအချက်များ..."
                />
              </label>
            </div>

            <div className="controls" style={{ marginTop: '18px' }}>
              <button className="btn secondary" style={{ flex: '1' }} onClick={() => setIsUploading(false)}>
                မလုပ်တော့ပါ (Cancel)
              </button>
              <button className="btn" style={{ flex: '1' }} onClick={handleSaveUpload}>
                💾 သိမ်းဆည်းမည် (Save)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Write Note Modal */}
      {showNoteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '14px' }}>📝 သင်ခန်းစာ မှတ်စုအသစ် ရေးရန်</h2>

            <div className="stack">
              <label>
                <span className="small">မှတ်စုခေါင်းစဉ်</span>
                <input 
                  type="text" 
                  value={uploadTitle} 
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="ဥပမာ - Unit 3 အရေးကြီး စကားစုများ"
                />
              </label>

              <label>
                <span className="small">အမျိုးအစား</span>
                <select 
                  value={uploadCategory} 
                  onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label>
                <span className="small">မှတ်စု အကြောင်းအရာ</span>
                <textarea 
                  rows={8} 
                  value={noteContent} 
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="မှတ်သားလိုသော ထိုင်းစာလုံးများ၊ အဓိပ္ပာယ်များနှင့် အရေးကြီး အချက်အလက်များ..."
                />
              </label>

              <label>
                <span className="small">Tags</span>
                <input 
                  type="text" 
                  value={uploadTags} 
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="Unit 3, Important, Speaking"
                />
              </label>
            </div>

            <div className="controls" style={{ marginTop: '18px' }}>
              <button className="btn secondary" style={{ flex: '1' }} onClick={() => setShowNoteModal(false)}>
                မလုပ်တော့ပါ
              </button>
              <button className="btn" style={{ flex: '1' }} onClick={handleSaveNote}>
                💾 မှတ်စု သိမ်းမည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <span className="tag">{previewDoc.category}</span>
                <h2 style={{ fontSize: '18px', marginTop: '4px' }}>{previewDoc.title}</h2>
                <div className="muted small">
                  {previewDoc.fileName} · {formatFileSize(previewDoc.fileSize)}
                </div>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', fontSize: '22px', color: '#687b74', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            {/* Document Content Rendering */}
            <div style={{ margin: '14px 0', maxHeight: '55vh', overflowY: 'auto', background: '#faf9fb', padding: '12px', borderRadius: '12px', border: '1px solid #ebdfee' }}>
              {previewDoc.fileType.startsWith('image/') ? (
                <img 
                  src={previewDoc.dataUrl} 
                  alt={previewDoc.title} 
                  style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px' }} 
                />
              ) : previewDoc.fileType.startsWith('audio/') ? (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎧</div>
                  <audio controls src={previewDoc.dataUrl} style={{ width: '100%' }} />
                </div>
              ) : previewDoc.fileType.includes('pdf') ? (
                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📄</div>
                  <p className="muted small">PDF ဖိုင်ကို browser preview သို့မဟုတ် ဒေါင်းလုဒ်ဖြင့် ဖတ်ရှုနိုင်ပါသည်။</p>
                  <a 
                    href={previewDoc.dataUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn secondary"
                    style={{ marginTop: '8px' }}
                  >
                    🔗 တိုက်ရိုက် ဖွင့်ဖတ်မည်
                  </a>
                </div>
              ) : (
                /* Text / Note content */
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.7', margin: 0, color: '#2f2433' }}>
                  {previewDoc.dataUrl.startsWith('data:text/') 
                    ? decodeURIComponent(previewDoc.dataUrl.split(',')[1] || '')
                    : 'စာရွက်စာတမ်း ဖတ်ရှုခြင်း...'}
                </pre>
              )}
            </div>

            {previewDoc.notes && (
              <div className="notice" style={{ marginTop: '10px' }}>
                <strong>မှတ်ချက်:</strong> {previewDoc.notes}
              </div>
            )}

            <div className="controls" style={{ marginTop: '16px' }}>
              <button 
                className="btn secondary" 
                style={{ flex: '1' }} 
                onClick={(e) => handleDownload(previewDoc, e)}
              >
                ⬇️ ဖိုင်ဒေါင်းလုဒ်ရယူရန်
              </button>
              <button 
                className="btn" 
                style={{ flex: '1' }} 
                onClick={() => setPreviewDoc(null)}
              >
                ပိတ်မည် (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set PIN Modal */}
      {showPinSetupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '10px' }}>🔐 Dashboard လုံခြုံရေး PIN သတ်မှတ်ရန်</h2>
            <p className="muted small" style={{ marginBottom: '16px' }}>
              သင့်စာရွက်စာတမ်းများကို အခြားသူများ မမြင်စေရန် ၄ လုံး သို့မဟုတ် ၆ လုံးပါ PIN နံပါတ် သတ်မှတ်ပါ။
            </p>

            <form onSubmit={handleSavePin}>
              <input 
                type="password" 
                maxLength={6} 
                placeholder="ဂဏန်း ၄ လုံး ရိုက်ထည့်ပါ (ဥပမာ 1234)" 
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px', marginBottom: '14px' }}
                autoFocus
              />

              <div className="controls">
                <button type="button" className="btn secondary" style={{ flex: '1' }} onClick={() => setShowPinSetupModal(false)}>
                  မလုပ်တော့ပါ
                </button>
                <button type="submit" className="btn" style={{ flex: '1' }}>
                  🔒 PIN သတ်မှတ်မည်
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
