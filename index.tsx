import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const App = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const [botToken, setBotToken] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [postStatus, setPostStatus] = useState<{ success: boolean; message: string; } | null>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const handleGenerate = async () => {
    if (!prompt) {
      setError('الرجاء إدخال فكرة للمنشور.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    setPostStatus(null);

    try {
      // Step 1: Validate if the prompt is about Islam
      const validationResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `هل الموضوع التالي متعلق بالإسلام بشكل مباشر؟ "${prompt}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_islamic: {
                type: Type.BOOLEAN,
                description: 'True if the topic is directly related to Islam, false otherwise.'
              }
            }
          }
        }
      });

      const validationResult = JSON.parse(validationResponse.text);

      if (!validationResult.is_islamic) {
        setError('الموضوع الذي أدخلته لا يتعلق بالإسلام. الرجاء إدخال موضوع ديني.');
        setIsLoading(false);
        return;
      }

      // Step 2: Generate content if validation passes
      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `اكتب منشوراً قصيراً وجذاباً باللغة العربية حول: "${prompt}"`,
        config: {
            systemInstruction: 'أنت مساعد متخصص في كتابة محتوى ديني إسلامي. اكتب منشوراً جذاباً وموجزاً عن الموضوع المطلوب.',
        },
      });

      const text = textResponse.text;

      if (!text) {
        throw new Error('فشل إنشاء المحتوى. الرجاء المحاولة مرة أخرى.');
      }

      setGeneratedContent(text);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع. الرجاء التحقق من الكونسول.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostToTelegram = async () => {
    if (!botToken || !generatedContent) {
      setPostStatus({ success: false, message: 'معرّف البوت والمحتوى مطلوبان.' });
      return;
    }
    setIsPosting(true);
    setPostStatus(null);

    const TELEGRAM_CHANNEL = '@yazadq'; // Make sure the bot is an admin in this channel
    const payload = {
      chat_id: TELEGRAM_CHANNEL,
      text: generatedContent,
    };

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.ok) {
        setPostStatus({ success: true, message: `تم النشر بنجاح في ${TELEGRAM_CHANNEL}!` });
      } else {
        throw new Error(result.description || 'فشل النشر في تيليجرام.');
      }
    } catch (err) {
      console.error(err);
      setPostStatus({ success: false, message: err instanceof Error ? err.message : 'فشل النشر.' });
    } finally {
      setIsPosting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            منشورات دينية لتيليجرام
          </h1>
          <p className="text-gray-400 mt-2">
            أنشئ محتوى ديني إسلامي بالذكاء الاصطناعي وانشره مباشرة في قناتك.
          </p>
        </header>

        <main className="space-y-8">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <label htmlFor="prompt" className="block text-lg font-medium text-gray-300 mb-2">
              ما هي فكرة منشورك الديني؟
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: فضل الصلاة على النبي"
              className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-3 px-4 rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity duration-300 flex items-center justify-center"
            >
              {isLoading ? 'جاري الإنشاء...' : '🕋 إنشاء المحتوى'}
            </button>
          </div>

          {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-center">{error}</div>}

          {isLoading && (
            <div className="flex flex-col items-center justify-center bg-gray-800 p-6 rounded-lg shadow-lg" aria-busy="true">
              <div className="spinner"></div>
              <p className="mt-4 text-gray-400 animate-pulse">يقوم الذكاء الاصطناعي بالإبداع...</p>
            </div>
          )}

          {generatedContent && (
            <div className="space-y-8 bg-gray-800 p-6 rounded-lg shadow-lg animate-fade-in">
              <section id="preview">
                <h2 className="text-2xl font-bold mb-4 text-center">معاينة المنشور</h2>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{generatedContent}</p>
                </div>
              </section>

              <section id="telegram-poster">
                <h2 className="text-2xl font-bold mb-4 text-center">النشر على تيليجرام</h2>
                 <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg mb-4 text-sm">
                  <p><strong>⚠️ تحذير أمني:</strong> لا تشارك معرف البوت الخاص بك أبداً. يتم استخدامه هنا فقط لإجراء الطلب من متصفحك.</p>
                </div>
                <div className="space-y-4">
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="أدخل معرّف بوت تيليجرام (Bot Token)"
                    className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                  />
                  <button
                    onClick={handlePostToTelegram}
                    disabled={isPosting}
                    className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 flex items-center justify-center"
                  >
                    {isPosting ? 'جاري النشر...' : 'نشر الآن في تيليجرام'}
                  </button>
                </div>
                {postStatus && (
                  <div className={`mt-4 text-center p-3 rounded-lg ${postStatus.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                    {postStatus.message}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

// Add simple fade-in animation style
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;
document.head.append(style);
