chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "compress") {
        chrome.storage.local.get(['geminiApiKey'], async (result) => {
            const apiKey = result.geminiApiKey;
            if (!apiKey) {
                sendResponse({ error: "Missing API Key settings configuration." });
                return;
            }

            // Upgraded to the highly stable, high-bandwidth Flash model
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            
            const systemPromptPart = { 
                text: `You are a strict lossless context compressor supporting a production software environment. 
                       Your task is to tightly pack the attached document into a dense text block to save tokens, 
                       but you MUST NOT summarize, drop, or omit any actual information, logic, variables, or facts. 
                       
                       Use aggressive technical shorthand, remove all unnecessary whitespace, strip boilerplate, and group related data efficiently to minimize token count. 
                       You must preserve 100% of the underlying information and structural integrity of the original file.
                       
                       At the very bottom of your response output, write a section divider titled: "MODIFIED ACTION RUNNER ENGINE" 
                       and cleanly format the following user instructions word-for-word:
                       "${request.userPrompt}"` 
            };

            const payload = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [systemPromptPart, request.filePart] }] })
            };

            // Upgraded 5-Tier Self-Healing Retry Engine
            async function fetchWithRetry(maxRetries = 5) {
                for (let i = 0; i < maxRetries; i++) {
                    const res = await fetch(url, payload);
                    const data = await res.json();
                    
                    // Catch the 503 High Demand Error specifically
                    if (data.error && data.error.code === 503) {
                        // Exponential backoff: Wait 2s, 4s, 8s, 16s, 32s (plus random network jitter)
                        const waitTime = Math.pow(2, i + 1) * 1000 + (Math.random() * 500); 
                        console.log(`Server busy. Retrying attempt ${i + 1} of ${maxRetries} in ${Math.round(waitTime/1000)}s...`);
                        
                        await new Promise(r => setTimeout(r, waitTime));
                        continue; // Loop back and try the fetch again
                    }
                    
                    // If it's a hard error (like a bad API key or quota exceeded), fail immediately
                    if (data.error) throw new Error(data.error.message);
                    
                    // Success!
                    return data;
                }
                throw new Error("Google's servers are experiencing extreme load. Try again in 5 minutes.");
            }

            try {
                // Execute the retry engine instead of a standard fetch
                const data = await fetchWithRetry();
                const capsuleText = data.candidates[0].content.parts[0].text;
                sendResponse({ text: capsuleText });
            } catch (err) {
                sendResponse({ error: err.message });
            }
        });
        
        return true; // Keep the message channel open for the async retry loop
    }
});