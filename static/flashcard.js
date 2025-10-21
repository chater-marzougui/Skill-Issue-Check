// Global state
let flashcards = [];
let currentIndex = 0;
let showingAnswer = false;
let currentView = "grid";
let searchResults = [];
let currentSearchIndex = -1;
let allFlashcards = [];

// Load flashcards on page load
async function loadData() {
  try {
    const response = await fetch(`assets/courses/iot_fatma.json`);
    if (!response.ok) {
      throw new Error(`Failed to load course file: ${response.statusText}`);
    }
    const data = await response.json();
    loadFlashcards(data);
  } catch (error) {
    console.error("Failed to load flashcards:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
});

function loadFlashcards(data) {
  if (!Array.isArray(data)) {
    alert("JSON must be an array of flashcards!");
    return;
  }
  if (data.length === 0) {
    alert("No flashcards found in the JSON!");
    return;
  }
  for (let i = 0; i < data.length; i++) {
    if (!data[i].question || !data[i].answer) {
      alert(`Flashcard at index ${i} is missing "question" or "answer" field!`);
      return;
    }
  }

  flashcards = data;
  allFlashcards = data.map((card, index) => ({
    ...card,
    index: index,
  }));
  currentIndex = 0;
  showingAnswer = false;

  displayGridView();
  setupSearch();
}

// Toggle between grid and card view
function toggleView(view) {
  currentView = view;
  document.getElementById("toggle-grid").classList.remove("active");
  document.getElementById("toggle-cards").classList.remove("active");

  if (view === "grid") {
    document.getElementById("toggle-grid").classList.add("active");
    document.getElementById("gridView").style.display = "block";
    document.getElementById("flashcardSection").style.display = "none";
    displayGridView();
  } else {
    document.getElementById("toggle-cards").classList.add("active");
    document.getElementById("gridView").style.display = "none";
    document.getElementById("flashcardSection").style.display = "block";
    document.getElementById("flashcardSection").classList.add("active");
    displayCard();
  }
}

// Display all flashcards in grid view
function displayGridView() {
  const gridContainer = document.getElementById("flashcard-grid");
  gridContainer.innerHTML = "";

  for (const [index, card] of flashcards.entries()) {
    const cardElement = document.createElement("div");
    cardElement.className = "grid-card";
    cardElement.id = `flashcard-${index}`;
    cardElement.innerHTML = `
            <div class="grid-card-question">
              <strong>Q:</strong> ${escapeHtml(card.question)}
            </div>
            <div class="grid-card-answer">
              <strong>A:</strong> ${escapeHtml(card.answer)}
            </div>
          `;
    gridContainer.appendChild(cardElement);
  }
}

// Display card in card view
function displayCard() {
  const card = flashcards[currentIndex];
  const cardElement = document.getElementById("flashcard");
  const labelElement = document.getElementById("cardLabel");
  const contentElement = document.getElementById("cardContent");

  if (showingAnswer) {
    labelElement.textContent = "Answer";
    contentElement.textContent = card.answer;
    cardElement.classList.add("showing-answer");
  } else {
    labelElement.textContent = "Question";
    contentElement.textContent = card.question;
    cardElement.classList.remove("showing-answer");
  }

  document.getElementById("counter").textContent = `${currentIndex + 1} / ${
    flashcards.length
  }`;
}

// Toggle card flip
function toggleCard() {
  showingAnswer = !showingAnswer;
  displayCard();
}

// Navigate to next card
function nextCard() {
  if (currentIndex < flashcards.length - 1) {
    currentIndex++;
    showingAnswer = false;
    displayCard();
  }
}

// Navigate to previous card
function prevCard() {
  if (currentIndex > 0) {
    currentIndex--;
    showingAnswer = false;
    displayCard();
  }
}

// Keyboard navigation for card view
document.addEventListener("keydown", function (e) {
  if (flashcards.length === 0 || currentView !== "cards") return;

  if (e.key === "ArrowRight") {
    nextCard();
  } else if (e.key === "ArrowLeft") {
    prevCard();
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggleCard();
  }
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replaceAll(/[&<>"']/g, (m) => map[m]);
}

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
  const searchInput = document.getElementById("search-input");
  const closeBtn = document.getElementById("close-search");

  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (query.length === 0) {
      clearSearch();
      return;
    }

    performSearch(query);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && searchResults.length > 0) {
      e.preventDefault();
      navigateSearch(1);
    } else if (e.key === "ArrowUp" && searchResults.length > 0) {
      e.preventDefault();
      navigateSearch(-1);
    } else if (e.key === "Enter" && searchResults.length > 0) {
      e.preventDefault();
      scrollToCurrentResult();
    }
  });

  closeBtn.addEventListener("click", () => {
    if (searchInput.value === "") {
      closeBtn.textContent = "❌";
      searchInput.style.display = "block";
      searchInput.focus();
    } else {
      searchInput.value = "";
      searchInput.style.display = "none";
      closeBtn.textContent = "🔍";
      clearSearch();
    }
  });
}

function performSearch(query) {
  clearSearch();
  searchResults = [];

  for (const card of allFlashcards) {
    const questionText = card.question.toLowerCase();
    const answerText = card.answer.toLowerCase();
    const fullText = questionText + " " + answerText;

    // Check if text includes query (fuzzy matching)
    const score = calculateFuzzyScore(fullText, query);

    if (score > 0) {
      searchResults.push({
        index: card.index,
        card: card,
        relevance: score,
      });
    }
  }

  // Sort by relevance (higher is better)
  searchResults.sort((a, b) => b.relevance - a.relevance);

  updateSearchUI();
  filterAndDisplayResults();

  if (searchResults.length > 0) {
    currentSearchIndex = 0;
    highlightCurrentResult();
  }
}

function filterAndDisplayResults() {
  // Hide all cards first
  for (const card of document.querySelectorAll(".grid-card")) {
    card.style.display = "none";
  }

  // Show only matching cards
  for (const result of searchResults) {
    const element = document.getElementById(`flashcard-${result.index}`);
    if (element) {
      element.style.display = "block";
    }
  }
}

function calculateFuzzyScore(text, query) {
  let score = 0;
  const queryWords = query.split(" ").filter((word) => word.length > 0);

  for (const word of queryWords) {
    const regex = new RegExp(word, "gi");
    const matches = text.match(regex);
    if (matches) {
      score += matches.length;
      // Bonus for exact word boundary matches
      const exactMatches = text.match(new RegExp(`\\b${word}\\b`, "gi"));
      if (exactMatches) {
        score += exactMatches.length * 2;
      }
    }
  }

  return score;
}

function navigateSearch(direction) {
  if (searchResults.length === 0) return;

  currentSearchIndex += direction;

  if (currentSearchIndex >= searchResults.length) {
    currentSearchIndex = 0;
  } else if (currentSearchIndex < 0) {
    currentSearchIndex = searchResults.length - 1;
  }

  highlightCurrentResult();
  scrollToCurrentResult();
  updateSearchUI();
}

function highlightCurrentResult() {
  // Remove previous highlights
  for (const el of document.querySelectorAll(".search-match")) {
    el.classList.remove("search-match");
  }

  if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
    const result = searchResults[currentSearchIndex];
    const element = document.getElementById(`flashcard-${result.index}`);
    if (element) {
      element.classList.add("search-match");
    }
  }
}

function scrollToCurrentResult() {
  if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
    const result = searchResults[currentSearchIndex];
    const element = document.getElementById(`flashcard-${result.index}`);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }
}

function updateSearchUI() {
  const searchNav = document.getElementById("search-nav");
  const searchCounter = document.getElementById("search-counter");

  if (searchResults.length === 0) {
    searchNav.style.display = "none";
  } else {
    searchNav.style.display = "flex";
    searchCounter.textContent = `${currentSearchIndex + 1}/${
      searchResults.length
    }`;
  }
}

function clearSearch() {
  searchResults = [];
  currentSearchIndex = -1;
  for (const el of document.querySelectorAll(".search-match")) {
    el.classList.remove("search-match");
  }
  // Show all cards again
  for (const card of document.querySelectorAll(".grid-card")) {
    card.style.display = "block";
  }
  updateSearchUI();
}
