function initCapsulePill() {
    if (document.getElementById('capsule-pill-root')) return;

    // 1. Create a Root Container
    const root = document.createElement('div');
    root.id = 'capsule-pill-root';
    document.body.appendChild(root);

    // 2. Inject CSS Styles directly into the page
    const styles = document.createElement('style');
    styles.innerHTML = `
        #capsule-floating-pill {
            position: fixed;
            bottom: 25px;
            right: 25px;
            background: #da7756;
            color: #ffffff;
            border: none;
            border-radius: 20px;
            padding: 8px 16px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 999999;
            transition: transform 0.2s ease;
        }
        #capsule-floating-pill:hover { transform: scale(1.05); }
        
        #capsule-popup-modal {
            position: fixed;
            bottom: 70px;
            right: 25px;
            width: 320px;
            background: #191919;
            border: 1px solid #333333;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: system-ui, -apple-system, sans-serif;
            display: none;
            flex-direction: column;
            gap: 12px;
        }
        #capsule-popup-modal h4 { margin: 0; color: #e3e3e3; font-size: 14px; display: flex; justify-content: space-between; align-items: center;}
        #capsule-popup-modal .close-btn { cursor: pointer; color: #888; font-size: 12px; }
        #capsule-popup-modal textarea {
            width: 100%; height: 70px; background: #222; border: 1px solid #444; 
            border-radius: 6px; color: #fff; padding: 8px; box-sizing: border-box; resize: none; font-size: 13px;
        }
        #capsule-popup-modal .file-label {
            display: block; background: #2a2a2a; border: 1px dashed #555; text-align: center;
            padding: 10px; border-radius: 6px; cursor: pointer; color: #b3b3b3; font-size: 12px;
        }
        #capsule-popup-modal .inject-btn {
            background: #0b57d0; color: white; border: none; padding: 10px; 
            border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        #capsule-popup-modal .inject-btn:hover { background: #0842a0; }
        #capsule-status-msg { font-size: 11px; color: #da7756; text-align: center; }
    `;
    root.appendChild(styles);

    // 3. Construct HTML Markup for Pill and Modal Layout
    root.innerHTML += `
        <button id="capsule-floating-pill">💊 Capsule</button>
        <div id="capsule-popup-modal">
            <h4><span>Context Compressor</span><span class="close-btn" id="capsule-close">✕</span></h4>
            <label class="file-label" id="file-drop-zone">
                <span id="file-status-text">📁 Choose Document / Code File</span>
                <input type="file" id="capsule-file-input" accept=".txt,.cpp,.py,.js,.json,.md,.csv,.pdf,image/*" style="display:none;">
            </label>
            <textarea id="capsule-prompt-input" placeholder="What should Claude do with this file? (e.g. Optimize runtime complexity)"></textarea>
            <button class="inject-btn" id="capsule-inject-btn">🚀 Inject Compressed Capsule</button>
            <div id="capsule-status-msg"></div>
        </div>
    `;

    // 4. Bind DOM Interactive Events
    const pill = document.getElementById('capsule-floating-pill');
    const modal = document.getElementById('capsule-popup-modal');
    const closeBtn = document.getElementById('capsule-close');
    const fileInput = document.getElementById('capsule-file-input');
    const fileStatusText = document.getElementById('file-status-text');
    const promptInput = document.getElementById('capsule-prompt-input');
    const injectBtn = document.getElementById('capsule-inject-btn');
    const statusMsg = document.getElementById('capsule-status-msg');

    let processedFilePart = null;

    // Toggle Modal View Visibility
    pill.addEventListener('click', () => {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    });
    closeBtn.addEventListener('click', () => modal.style.display = 'none');

    // Monitor File Uploads locally
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileStatusText.innerText = `📄 ${file.name}`;
        statusMsg.innerText = "Reading data stream...";

        const isText = file.type.startsWith('text/') || file.type === 'application/json' || file.name.match(/\.(cpp|py|js|md|csv)$/i);
        const reader = new FileReader();

        reader.onload = (event) => {
            if (isText) {
                processedFilePart = { text: `File Contents:\n${event.target.result}` };
            } else {
                const base64String = event.target.result.split(',')[1];
                processedFilePart = { inlineData: { data: base64String, mimeType: file.type || "application/pdf" } };
            }
            statusMsg.innerText = "File parsed successfully.";
        };

        if (isText) { reader.readAsText(file); } else { reader.readAsDataURL(file); }
    });

    // Process Token Optimization and Inject Payload
    injectBtn.addEventListener('click', () => {
        const customPrompt = promptInput.value.trim();
        if (!processedFilePart || !customPrompt) {
            statusMsg.innerText = "Error: Missing file array or instructions.";
            return;
        }

        injectBtn.disabled = true;
        injectBtn.innerText = "⏳ Compressing via Gemini Pro...";

        chrome.runtime.sendMessage(
            { action: "compress", filePart: processedFilePart, userPrompt: customPrompt },
            (response) => {
                injectBtn.disabled = false;
                injectBtn.innerText = "🚀 Inject Compressed Capsule";

                if (response && response.text) {
                    // Success path: clear inputs, hide layout window, execute typing injection
                    const claudeInput = document.querySelector('.ProseMirror');
                    if (claudeInput) {
                        claudeInput.focus();
                        document.execCommand('insertText', false, response.text);
                        
                        // Reset form fields
                        promptInput.value = "";
                        fileInput.value = "";
                        fileStatusText.innerText = "📁 Choose Document / Code File";
                        processedFilePart = null;
                        statusMsg.innerText = "";
                        modal.style.display = 'none'; // Close popup window automatically
                    } else {
                        statusMsg.innerText = "Failed to locate text input line.";
                    }
                } else {
                    statusMsg.innerText = `API Error: ${response?.error || 'Unknown breakdown'}`;
                }
            }
        );
    });
}

// Track DOM mutations to verify elements persist through site route updates
const observer = new MutationObserver(() => initCapsulePill());
observer.observe(document.body, { childList: true, subtree: true });
initCapsulePill();