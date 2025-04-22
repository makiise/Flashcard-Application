document.getElementById('create-card-btn').addEventListener('click', () => {
    // Triggered when user wants to create a flashcard
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: createFlashcard
      });
    });
  });
  
  document.getElementById('view-cards-btn').addEventListener('click', () => {
    // This will be used to navigate to a page to view the saved flashcards (yet to be created)
    alert('Viewing Flashcards is a work in progress!');
  });
  
  function createFlashcard() {
    let selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
      alert(`Selected Text: ${selectedText}`);
  
      // Now, you will prompt the user to add a back side and difficulty via hand gestures, etc.
  
      // You can save the card data using `chrome.storage.local` (for local storage) or send to a server here
      chrome.storage.local.set({ flashcardFront: selectedText }, () => {
        alert('Flashcard front saved!');
      });
    } else {
      alert('No text selected!');
    }
  }
  