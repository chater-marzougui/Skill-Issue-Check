// Global state
let flashcards = [];
let currentIndex = 0;
let showingAnswer = false;
let currentView = "grid";
let searchResults = [];
let currentSearchIndex = -1;
let allFlashcards = [];
let courseList = [];
let selectedCourse = null;

// Load flashcards on page load
async function loadData() {
  try {
    // Load course list
    const response = await fetch(`assets/flashcards/flashcards_list.json`);
    if (!response.ok) {
      throw new Error(`Failed to load course list: ${response.statusText}`);
    }
    const data = await response.json();
    courseList = data;
    
    // Find course with highest id
    const highestIdCourse = courseList.reduce((max, course) => 
      (course.id > (max?.id ?? -Infinity)) ? course : max, null);
    
    if (highestIdCourse) {
      selectedCourse = highestIdCourse;
      populateCourseSelector();
      loadCourse(highestIdCourse);
    }
  } catch (error) {
    console.error("Failed to load course list:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
});

function populateCourseSelector() {
  const select = document.getElementById("course-select");
  const btn = document.getElementById("course-btn");
  
  select.innerHTML = "";
  
  for (const course of courseList) {
    const option = document.createElement("option");
    const courseKey = Object.keys(course).find(k => k !== "id");
    option.value = course[courseKey];
    option.textContent = courseKey;
    if (course === selectedCourse) {
      option.selected = true;
    }
    select.appendChild(option);
  }
  
  // Update button text
  const courseKey = Object.keys(selectedCourse).find(k => k !== "id");
  btn.textContent = `📚 ${courseKey}`;
  
  // Add change event listener
  select.addEventListener("change", (e) => {
    const selectedFile = e.target.value;
    if (selectedFile) {
      const course = courseList.find(c => Object.values(c).includes(selectedFile));
      if (course) {
        selectedCourse = course;
        populateCourseSelector();
        loadCourse(course);
      }
    }
    select.style.display = "none";
  });
}

function setupCourseButton() {
  const btn = document.getElementById("course-btn");
  const select = document.getElementById("course-select");
  
  btn.addEventListener("click", () => {
    if (select.style.display === "none") {
      select.style.display = "block";
      select.focus();
    } else {
      select.style.display = "none";
    }
  });
  
  // Close select when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".course-selector-wrapper")) {
      select.style.display = "none";
    }
  });
}

function loadCourse(course) {
  const courseKey = Object.keys(course).find(k => k !== "id");
  const filename = course[courseKey];
  
  fetch(`assets/flashcards/${filename}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Could not load course: ${filename}`);
      }
      return response.json();
    })
    .then(data => {
      loadFlashcards(data);
    })
    .catch(error => {
      console.error("Error loading course:", error);
    });
}

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
  setupCourseButton();
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
    
    // If search is active, navigate to first search result
    if (searchResults.length > 0) {
      currentIndex = searchResults[0].index;
    }
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

  // Update counter based on search results
  let counterText;
  if (searchResults.length > 0) {
    const currentResultIndex = searchResults.findIndex(r => r.index === currentIndex);
    counterText = `${currentResultIndex + 1} / ${searchResults.length}`;
  } else {
    counterText = `${currentIndex + 1} / ${flashcards.length}`;
  }
  document.getElementById("counter").textContent = counterText;
}

// Toggle card flip
function toggleCard() {
  showingAnswer = !showingAnswer;
  displayCard();
}

// Navigate to next card
function nextCard() {
  let nextIndex;
  
  if (searchResults.length > 0) {
    // Navigate through search results
    const currentResultIndex = searchResults.findIndex(r => r.index === currentIndex);
    if (currentResultIndex < searchResults.length - 1) {
      nextIndex = searchResults[currentResultIndex + 1].index;
    } else {
      return;
    }
  } else {
    // Navigate through all cards
    if (currentIndex < flashcards.length - 1) {
      nextIndex = currentIndex + 1;
    } else {
      return;
    }
  }
  
  currentIndex = nextIndex;
  showingAnswer = false;
  displayCard();
}

// Navigate to previous card
function prevCard() {
  let prevIndex;
  
  if (searchResults.length > 0) {
    // Navigate through search results
    const currentResultIndex = searchResults.findIndex(r => r.index === currentIndex);
    if (currentResultIndex > 0) {
      prevIndex = searchResults[currentResultIndex - 1].index;
    } else {
      return;
    }
  } else {
    // Navigate through all cards
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else {
      return;
    }
  }
  
  currentIndex = prevIndex;
  showingAnswer = false;
  displayCard();
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
