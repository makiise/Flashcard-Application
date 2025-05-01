let flashcardButton = null;

function removeButton() {
    if (flashcardButton && flashcardButton.parentNode) {
        flashcardButton.parentNode.removeChild(flashcardButton);
        flashcardButton = null;
    }
}

document.addEventListener('mouseup', (event) => {
    setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();

        removeButton();

        if (selectedText.length > 0) {
            flashcardButton = document.createElement('button');
            flashcardButton.id = 'add-to-flashcards-btn';
            flashcardButton.textContent = 'Add to Flashcards';

            const range = window.getSelection().getRangeAt(0);
            const rect = range.getBoundingClientRect();

            flashcardButton.style.position = 'absolute';
            flashcardButton.style.left = `${rect.right + window.scrollX + 5}px`;
            flashcardButton.style.top = `${rect.bottom + window.scrollY + 5}px`;
            flashcardButton.style.zIndex = '9999';

            flashcardButton.onclick = () => {
                const textToSend = window.getSelection().toString().trim();
                if (textToSend) {
                    chrome.runtime.sendMessage({
                            action: "openFlashcardPage",
                            text: textToSend
                        },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Error sending message:", chrome.runtime.lastError.message);
                            } else {
                                // Optionally log response for debugging
                                // console.log("Background script responded:", response);
                            }
                        }
                    );
                }
                removeButton();
            };

            document.body.appendChild(flashcardButton);
        }
    }, 0);
});

document.addEventListener('mousedown', (event) => {
    if (flashcardButton && event.target !== flashcardButton) {
        setTimeout(removeButton, 100);
    }
});