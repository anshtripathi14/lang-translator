document.addEventListener('DOMContentLoaded', () => {
    const sourceText = document.getElementById('sourceText');
    const translatedText = document.getElementById('translatedText');
    const sourceLanguage = document.getElementById('sourceLanguage');
    const targetLanguage = document.getElementById('targetLanguage');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resetButton = document.getElementById('resetButton');
    const imageUpload = document.getElementById('imageUpload');
    const imagePreview = document.getElementById('imagePreview');
    const imageToTextButton = document.getElementById('imageToTextButton');
    const themeButton = document.getElementById('themeButton');
    const swapButton = document.getElementById('swapButton');
    let translatedResult = "";
    let recognition = null;

    const toggleLoading = (show) => loadingSpinner.style.display = show ? 'block' : 'none';

    resetButton.addEventListener('click', () => {
        sourceText.value = translatedText.value = translatedResult = '';
        imagePreview.innerHTML = '';
        toggleLoading(false);
        if (recognition) recognition.stop();
    });

    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const translateText = async (text, sourceLang, targetLang) => {
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            return data[0].map(item => item[0]).join('');
        } catch (error) {
            console.error("Translation error:", error);
            return "Translation failed.";
        }
    };

    const handleTranslation = async (text) => {
        if (!text) {
            translatedText.value = '';
            return;
        }
        toggleLoading(true);
        try {
            translatedResult = await translateText(text, sourceLanguage.value, targetLanguage.value);
            translatedText.value = translatedResult;
        } catch (error) {
            alert("Translation failed.");
        } finally {
            toggleLoading(false);
        }
    };

    const handleSpeech = (text, lang) => {
        if (!text) return alert("No text available to play.");
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        speechSynthesis.speak(utterance);
    };

    const handleVoiceInput = async (playVoice = false) => {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = sourceLanguage.value === 'auto' ? 'en' : sourceLanguage.value;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => toggleLoading(true);

        recognition.onresult = async (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    sourceText.value = transcript;
                    await handleTranslation(transcript);
                    if (playVoice) handleSpeech(translatedResult, targetLanguage.value);
                } else {
                    interimTranscript += transcript;
                    sourceText.value = interimTranscript;
                    await handleTranslation(interimTranscript);
                }
            }
        };

        recognition.onerror = ({ error }) => {
            console.error("Speech recognition error:", error);
            alert("Error recognizing speech. Please try again.");
            toggleLoading(false);
        };

        recognition.onend = () => toggleLoading(false);

        recognition.start();
    };

    const handleImageToText = async (imageFile) => {
        toggleLoading(true);
        try {
            const { data: { text } } = await Tesseract.recognize(imageFile, 'eng', {
                logger: (info) => console.log(info),
                tessedit_pageseg_mode: 6,
            });
            sourceText.value = text;
            await handleTranslation(text);
        } catch (error) {
            console.error("OCR error:", error);
            alert("Failed to extract text from image. Please try again.");
        } finally {
            toggleLoading(false);
        }
    };

    // Swap button functionality
    swapButton.addEventListener('click', () => {
        const sourceLang = sourceLanguage.value;
        const targetLang = targetLanguage.value;
        
        // Swap language selections
        sourceLanguage.value = targetLang;
        targetLanguage.value = sourceLang;
        
        // Swap text content
        const sourceTextVal = sourceText.value;
        const translatedTextVal = translatedText.value;
        sourceText.value = translatedTextVal;
        translatedText.value = sourceTextVal;
        
        // Trigger new translation if source has content
        if (sourceText.value.trim()) {
            handleTranslation(sourceText.value.trim());
        }
    });

    const debouncedTranslation = debounce(() => handleTranslation(sourceText.value.trim()), 300);

    sourceText.addEventListener('input', debouncedTranslation);
    sourceLanguage.addEventListener('change', () => handleTranslation(sourceText.value.trim()));
    targetLanguage.addEventListener('change', () => handleTranslation(sourceText.value.trim()));

    imageToTextButton.addEventListener('click', () => imageUpload.click());

    imageUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Uploaded Image">`;
                handleImageToText(file);
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('textToVoiceButton').addEventListener('click', () => handleSpeech(translatedText.value.trim(), targetLanguage.value));
    document.getElementById('voiceToTextButton').addEventListener('click', () => handleVoiceInput());
    document.getElementById('voiceToVoiceButton').addEventListener('click', () => handleVoiceInput(true));

    themeButton.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        themeButton.textContent = document.body.classList.contains('light-mode') ? '🌞' : '🌙';
    });
});