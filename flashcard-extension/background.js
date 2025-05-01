chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openFlashcardPage" && message.text) {
        chrome.storage.local.set({
            'flashcardFrontText': message.text
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error saving text to storage:", chrome.runtime.lastError.message);
                sendResponse({ status: "Error saving text" });
                return;
            }

            const flashcardPageUrl = chrome.runtime.getURL("popup.html");

            chrome.tabs.create({ url: flashcardPageUrl }, (newTab) => {
                if (chrome.runtime.lastError) {
                    console.error("Error creating new tab:", chrome.runtime.lastError.message);
                    sendResponse({ status: "Error opening tab" });
                } else {
                    sendResponse({ status: "Success", tabId: newTab.id });
                }
            });
        });

        return true;
    } else {
        sendResponse({ status: "Unknown action or missing text" });
    }
});