document.addEventListener('DOMContentLoaded', () => {
  const frontTextArea = document.getElementById('front');
  const backTextArea = document.getElementById('back');
  const saveButton = document.getElementById('save-btn');

  chrome.storage.local.get(['flashcardFrontText'], (result) => {
      if (chrome.runtime.lastError) {
          console.error("Error retrieving text:", chrome.runtime.lastError.message);
          return;
      }

      if (result.flashcardFrontText) {
          frontTextArea.value = result.flashcardFrontText;

          chrome.storage.local.remove('flashcardFrontText', () => {
         if (chrome.runtime.lastError) {
                  console.error("Error removing text from storage:", chrome.runtime.lastError.message);
               }
          });
      }
  });

  saveButton.addEventListener('click', () => {
      const frontText = frontTextArea.value.trim();
      const backText = backTextArea.value.trim();

      if (frontText && backText) {
          console.log("Saving Flashcard:");
          console.log("Front:", frontText);
          console.log("Back:", backText);
          alert("Flashcard saved (Placeholder - check console)!");
          // window.close();
      } else {
          alert("Please fill in both the Front and Back fields.");
      }
  });
});