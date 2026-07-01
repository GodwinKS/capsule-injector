document.addEventListener('DOMContentLoaded', () => {
    const keyField = document.getElementById('keyField');
    const saveBtn = document.getElementById('saveBtn');

    chrome.storage.local.get(['geminiApiKey'], (res) => {
        if (res.geminiApiKey) keyField.value = res.geminiApiKey;
    });

    saveBtn.addEventListener('click', () => {
        const val = keyField.value.trim();
        if (val) {
            chrome.storage.local.set({ geminiApiKey: val }, () => {
                alert("Key saved successfully.");
            });
        }
    });
});