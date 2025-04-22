// Reference to HTML elements
const startPracticeButton = document.getElementById("start-practice-btn") as HTMLButtonElement;
const practiceSection = document.getElementById("practice-section") as HTMLElement;
const cardFrontText = document.getElementById("card-front-text") as HTMLElement;
const cardBackText = document.getElementById("card-back-text") as HTMLElement;
const cardHintDisplay = document.getElementById("card-hint-display") as HTMLElement;
const showAnswerButton = document.getElementById("show-answer-btn") as HTMLButtonElement;
const hintButton = document.getElementById("hint-btn") as HTMLButtonElement;
const practiceMessage = document.getElementById("practice-message") as HTMLElement;

// State variables
let practiceCards: Array<{ front: string, back: string, hint: string }> = [];
let currentCardIndex = 0;

// Function to display the current card
function displayCurrentCard() {
  const currentCard = practiceCards[currentCardIndex];

  cardFrontText.textContent = currentCard.front;
  cardBackText.style.display = "none";
  cardHintDisplay.style.display = "none";
  practiceMessage.textContent = "";

  // Reset button visibility
  showAnswerButton.style.display = "block";
  hintButton.style.display = "block";
}

// Start practice button listener
startPracticeButton.addEventListener("click", async () => {
  practiceSection.style.display = "block"; // Show practice section
  practiceMessage.textContent = "Loading..."; // Show loading message

  try {
    // Fetch practice cards from backend
    const response = await fetch("/api/practice");
    if (response.ok) {
      const cards = await response.json();
      practiceCards = cards; // Store fetched cards
      if (practiceCards.length > 0) {
        currentCardIndex = 0; // Reset to the first card
        displayCurrentCard(); // Display the first card
        practiceMessage.textContent = "";
      } else {
        practiceMessage.textContent = "No cards due for practice.";
      }
    } else {
      practiceMessage.textContent = "Failed to load cards.";
    }
  } catch (error) {
    practiceMessage.textContent = "Error loading cards.";
  }
});
