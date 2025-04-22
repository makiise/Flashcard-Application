
let flashcardBtn;

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();

  // Remove old button if it exists
  if (flashcardBtn) flashcardBtn.remove();

  if (text.length > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    flashcardBtn = document.createElement("button");
    flashcardBtn.textContent = "Add to Flashcards";
    flashcardBtn.id = "flashcard-btn";

    // Position button above selection
    flashcardBtn.style.top = `${window.scrollY + rect.top - 30}px`;
    flashcardBtn.style.left = `${window.scrollX + rect.left}px`;

    document.body.appendChild(flashcardBtn);

    flashcardBtn.addEventListener("click", () => {
      // Open a new tab or navigate to the flashcard creation page
      chrome.tabs.create({ url: `popup.html?front=${encodeURIComponent(text)}` });

      // Optionally, you can also open a modal in the current tab instead of a new tab:
      // Show the popup form (You would implement a modal in the same page)

      flashcardBtn.remove();
    });
  }
});
