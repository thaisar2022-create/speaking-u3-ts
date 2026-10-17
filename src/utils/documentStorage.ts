import { UserDocument, DocumentCategory, DocumentStats } from '../types/document';

const STORAGE_KEY = 'thaisar_personal_documents_v1';
const PIN_KEY = 'thaisar_dashboard_pin_v1';

// Initial preloaded sample study documents for Unit 3
const INITIAL_DOCUMENTS: UserDocument[] = [
  {
    id: 'doc-unit3-notes',
    title: 'အခန်း (၃) ကိန်းဂဏန်းနှင့် ငွေကြေးသုံးစွဲပုံ သင်ခန်းစာမှတ်စု',
    category: 'Lesson Notes',
    fileName: 'Unit3_Thai_Numbers_Notes.txt',
    fileSize: 4520,
    fileType: 'text/plain',
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['Unit 3', 'Numbers', 'Grammar'],
    notes: '၁ မှ ၁,၀၀၀,၀၀၀ အထိ ဂဏန်းရေတွက်နည်းနှင့် ဈေးဝယ်ရာတွင် မေးရမည့် စကားစုများ အကျဉ်းချုပ်။',
    dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent(
      `THAISAR · THAI-MYANMAR SPEAKING SCHOOL\nအခန်း (၃) ကိန်းဂဏန်းများ လေ့လာမှုမှတ်စု (Unit 3 Reference Guide)\n\n` +
      `၁။ အခြေခံ ကိန်းဂဏန်းများ (၀ မှ ၁၀)\n` +
      `၀ = ศูนย์ (/sǔun/ - စွန်)\n` +
      `၁ = หนึ่ง (/nɨ̀ŋ/ - နင့်)\n` +
      `၂ = สอง (/sɔ̌ɔŋ/ - စော)\n` +
      `၃ = สาม (/sɑ̌ɑm/ - စာ)\n` +
      `၄ = สี่ (/sìi/ - စီ)\n` +
      `၅ = ห้า (/hɑ̂ɑ/ - ဟာ့)\n` +
      `၆ = หก (/hòk/ - ဟို)\n` +
      `၇ = เจ็ด (/jèt/ - ကျေ)\n` +
      `၈ = แปด (/px̀xt/ - ပဲ)\n` +
      `၉ = เก้า (/kɑ̂w/ - ကော)\n` +
      `၁၀ = สิบ (/sìp/ - စစ်)\n\n` +
      `၂။ အထူးဂဏန်းများ\n` +
      `၁၁ = สิบเอ็ด (စစ်အေတ်) - တစ်ဆယ့်တစ်တွင် တစ် ကို เอ็ด ဟု သုံးသည်။\n` +
      `၂၀ = ยี่สิบ (ယီစစ်) - နှစ်ဆယ် ကို ยี่စิบ ဟု သုံးသည်။\n` +
      `၁၀၀ = หนึ่งร้อย (နင့်ရော်)\n` +
      `၁,၀၀၀ = หนึ่งพัน (နင့်ဖန်)\n` +
      `၁၀,၀၀၀ = หนึ่งหมื่น (နင့်မွတ်)\n` +
      `၁၀၀,၀၀၀ = หนึ่งแสน (နင့်ဆဲ)\n` +
      `၁,၀၀၀,၀၀၀ = หนึ่งล้าน (နင့်လန်)\n\n` +
      `၃။ ဈေးမေးနည်းနှင့် ငွေကြေးဆိုင်ရာ အသုံးအနှုန်းများ\n` +
      `- เท่าไร (/thɑ̂w-rɑy/) = ဘယ်လောက်လဲ\n` +
      `- ค่าเช่าห้องเดือนละเท่าไร = အခန်းငှားခ တစ်လ ဘယ်လောက်လဲ\n` +
      `- ขอยืมเงินได้ไหม = ငွေချေးလို့ရမလား\n` +
      `- โอนเงินได้ไหม = ငွေလွှဲလို့ရမလား\n` +
      `- เงินสด = ငွေသား\n\n` +
      `မှတ်ချက်: ဤစာရွက်စာတမ်းကို မိမိ၏ ကိုယ်ပိုင် Dashboard တွင် လုံခြုံစွာ သိမ်းဆည်းထားပါသည်။`
    )
  },
  {
    id: 'doc-homework-sheet',
    title: 'Unit 3 Speaking & Listening အိမ်စာလေ့ကျင့်လွှာ',
    category: 'Homework',
    fileName: 'Unit3_Homework_Assignment.txt',
    fileSize: 2180,
    fileType: 'text/plain',
    uploadedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['Homework', 'Exercise', 'Unit 3'],
    notes: 'ကျောင်းဆရာစစ်ဆေးရန်အတွက် အသံထွက်လေ့ကျင့်ခန်းနှင့် စကားလုံးအစီအစဉ်မှန်စီခြင်း အိမ်စာ။',
    dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent(
      `THAISAR အိမ်စာလေ့ကျင့်ခန်း (HOMEWORK SHEET)\n\n` +
      `အောက်ပါမေးခွန်းများကို ထိုင်းလို အဖြေရေးသားပြီး အသံဖိုင်သွင်း၍ ပူးတွဲတင်ပြပါ:\n` +
      `၁။ ขอยืมเงินได้ไหม (အငြင်းအဖြေ ရေးပါ)\n` +
      `   အဖြေ: ขอโทษค่ะ ฉันไม่มีเงิน\n\n` +
      `၂။ ค่าเช่าห้องเดือนละเท่าไร (ဘတ် ၃၉၀၀ ဟု ဖြေပါ)\n` +
      `   အဖြေ: เดือนละ ๓,๙๐๐ บาท\n\n` +
      `၃။ ကိုယ်တိုင်ပြောဆိုလေ့ကျင့်ရန်:\n` +
      `   - စကားလုံးများကို Flashcards တွင် အလွတ်လှန်ကျက်ပါ\n` +
      `   - Rearrange Sentences တွင် ၁၀ ခုလုံး မှန်အောင် စီပါ`
    )
  }
];

export function getStoredDocuments(): UserDocument[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DOCUMENTS));
      return INITIAL_DOCUMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load documents:', e);
    return INITIAL_DOCUMENTS;
  }
}

export function saveDocuments(docs: UserDocument[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents:', e);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getDocumentStats(docs: UserDocument[]): DocumentStats {
  const totalCount = docs.length;
  const totalSize = docs.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const categoryCounts: Record<string, number> = {};
  
  docs.forEach(d => {
    categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
  });

  return { totalCount, totalSize, categoryCounts };
}

// PIN security management
export function getStoredPIN(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function setStoredPIN(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function removeStoredPIN(): void {
  localStorage.removeItem(PIN_KEY);
}
