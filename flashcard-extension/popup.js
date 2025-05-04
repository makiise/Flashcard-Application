document.addEventListener('DOMContentLoaded', () => {
    // --- Get references to ALL relevant elements ---
    const frontTextArea = document.getElementById('front');
    const backTextArea = document.getElementById('card-back'); // Corrected ID
    const hintInput = document.getElementById('card-hint');    // Added
    const tagsInput = document.getElementById('card-tags');    // Added
    const saveButton = document.getElementById('save-card');  // Corrected ID
    const cancelButton = document.getElementById('cancel');    // Added
    // Suggestion: Add a div in your HTML to show status messages
    // e.g., <div id="status-message" style="margin-top: 15px;"></div>
    const statusMessage = document.getElementById('status-message'); // Added (Optional but recommended)


    // --- Load front text from storage on page load ---
    chrome.storage.local.get(['flashcardFrontText'], (result) => {
        if (chrome.runtime.lastError) {
            console.error("Error retrieving text from storage:", chrome.runtime.lastError.message);
            if (statusMessage) statusMessage.textContent = 'Error loading selected text.';
            if (statusMessage) statusMessage.style.color = 'red';
            return;
        }

        if (result.flashcardFrontText) {
            console.log("Retrieved text:", result.flashcardFrontText);
            frontTextArea.value = result.flashcardFrontText;

            // Clean up storage
            chrome.storage.local.remove('flashcardFrontText', () => {
                if (chrome.runtime.lastError) {
                    console.error("Error removing text from storage:", chrome.runtime.lastError.message);
                } else {
                    console.log("Cleared flashcardFrontText from storage.");
                }
            });
        } else {
             console.log("No flashcardFrontText found in storage.");
        }
    });

    // --- Add event listener to the Save button ---
    saveButton.addEventListener('click', async (event) => { // Make the handler async for await
        event.preventDefault(); // Good practice if the button were inside a form

        // 1. Gather the data from ALL input fields
        const frontText = frontTextArea.value.trim();
        const backText = backTextArea.value.trim();
        const hintText = hintInput.value.trim(); // Get hint
        const tagsRaw = tagsInput.value.trim(); // Get tags

        // Basic validation (check required fields)
        if (!frontText || !backText) {
            if (statusMessage) {
                 statusMessage.textContent = 'Please fill in both Front and Back fields.';
                 statusMessage.style.color = 'red';
            } else {
                alert("Please fill in both the Front and Back fields."); // Fallback alert
            }
            return;
        }

        // Prepare the data payload for the backend
        const flashcardData = {
            front: frontText,
            back: backText,
            hint: hintText || null, // Send null if hint is empty (adjust based on backend needs)
            // Process tags: split by comma, trim whitespace, remove empty tags
            tags: tagsRaw ? tagsRaw.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : []
        };

        // Display loading state
        saveButton.disabled = true;
        cancelButton.disabled = true; // Also disable cancel during save
        if (statusMessage) {
            statusMessage.textContent = 'Saving...';
            statusMessage.style.color = 'black';
        }

        // 2. Define your backend API endpoint URL
        const apiUrl = 'http://localhost:3001/api/cards'; // <-- *** REPLACE WITH YOUR ACTUAL BACKEND URL ***

        try {
            // 3. Make the POST request using the Fetch API
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authorization headers if your backend requires login
                    // 'Authorization': 'Bearer YOUR_AUTH_TOKEN'
                },
                body: JSON.stringify(flashcardData) // Convert the JS object to JSON
            });

            // 4. Handle the response from the backend
            if (response.ok) { // Check if status code is 200-299
                const result = await response.json(); // Assuming backend sends JSON response
                console.log('Success:', result);
                if (statusMessage) {
                    statusMessage.textContent = 'Flashcard saved successfully!';
                    statusMessage.style.color = 'green';
                } else {
                     alert('Flashcard saved successfully!');
                }
                // Optional: Clear the form after successful save
                // frontTextArea.value = '';
                // backTextArea.value = '';
                // hintInput.value = '';
                // tagsInput.value = '';
                // Optional: Close the popup/tab after a short delay
                // setTimeout(() => window.close(), 1500);

            } else {
                // Handle errors (e.g., validation errors from backend, server errors)
                const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse error JSON
                console.error('Error saving flashcard:', response.status, errorData);
                 if (statusMessage) {
                     statusMessage.textContent = `Error: ${errorData.message || 'Failed to save flashcard.'}`;
                     statusMessage.style.color = 'red';
                 } else {
                     alert(`Error: ${errorData.message || 'Failed to save flashcard.'}`);
                 }
            }
        } catch (error) {
            // Handle network errors (e.g., backend server is down, CORS issues)
            console.error('Network Error:', error);
            if (statusMessage) {
                statusMessage.textContent = 'Network error. Unable to reach the server.';
                statusMessage.style.color = 'red';
            } else {
                alert('Network error. Unable to reach the server.');
            }
        } finally {
            // Re-enable buttons regardless of success or error
            saveButton.disabled = false;
            cancelButton.disabled = false;
        }
    });

    // --- Add event listener to the Cancel button ---
    cancelButton.addEventListener('click', () => {
        // Simply close the popup/tab
        window.close();
    });
});