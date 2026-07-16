let quizData = {};
let currentSeance = "";
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];

// DOM Elements
const uploadSection = document.getElementById("drop-area");
const seanceSelection = document.getElementById("seance-selection");
const quizContainer = document.getElementById("quiz-container");
const resultContainer = document.getElementById("result-container");
const fileInput = document.getElementById("file-input");
const seanceSelector = document.getElementById("seance-selector");
const seanceTitle = document.getElementById("seance-title");
const currentQuestionSpan = document.getElementById("current-question");
const totalQuestionsSpan = document.getElementById("total-questions");
const progressFill = document.getElementById("progress-fill");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const prevBtn = document.getElementById("prev-btn");
const skipBtn = document.getElementById("skip-btn");
const skipAllBtn = document.getElementById("skip-all-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");
const scoreText = document.getElementById("score-text");
const restartBtn = document.getElementById("restart-btn");
const changeSeanceBtn = document.getElementById("change-seance-btn");
const geminiPromptContainer = document.getElementById(
  "gemini-prompt-container",
);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function shuffleOptions(question) {
  const options = question.options;
  const indices = Array.from({ length: options.length }, (_, i) => i);
  shuffleArray(indices);
  if (Array.isArray(question.answer)) {
    question.answer = question.answer.map((oldIdx) => indices.indexOf(oldIdx));
  } else {
    question.answer = indices.indexOf(question.answer);
  }
  question.options = indices.map((i) => options[i]);
}

// Event Listeners
fileInput.addEventListener("change", handleFileUpload);
prevBtn.addEventListener("click", showPrevQuestion);
skipBtn.addEventListener("click", () => {
  userAnswers[currentQuestionIndex] = -1; // Mark as skipped
  showNextQuestion(true);
});

skipAllBtn.addEventListener("click", () => {
  userAnswers[currentQuestionIndex] = -1; // Mark current as skipped
  while (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    userAnswers[currentQuestionIndex] = -1; // Mark all subsequent as skipped
  }
  submitQuiz();
});
nextBtn.addEventListener("click", showNextQuestion);
submitBtn.addEventListener("click", submitQuiz);
restartBtn.addEventListener("click", restartQuiz);
changeSeanceBtn.addEventListener("click", showSeanceSelection);

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  // Only handle shortcuts when quiz is active
  if (!quizContainer.classList.contains("hide")) {
    if (e.key === "ArrowLeft" && !prevBtn.disabled) {
      showPrevQuestion();
    } else if (e.key === "ArrowRight") {
      if (!nextBtn.classList.contains("hide") && !nextBtn.disabled) {
        showNextQuestion();
      } else if (!submitBtn.classList.contains("hide") && !submitBtn.disabled) {
        submitQuiz();
      }
    } else if (e.key === "Enter") {
      // Enter only shows feedback, doesn't advance
      const currentAnswer = userAnswers[currentQuestionIndex];
      const hasAnswer = Array.isArray(currentAnswer)
        ? currentAnswer.length > 0
        : currentAnswer !== null && currentAnswer !== undefined;

      if (hasAnswer && !document.querySelector(".explanation-feedback")) {
        showFeedbackOnly();
      }
    }
  }
});

// Functions
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      loadQuizData(data);
    } catch (error) {
      alert(
        "Erreur lors de la lecture du fichier JSON. Veuillez vérifier le format.",
      );
      console.error(error);
    }
  };
  reader.readAsText(file);
}

document.getElementById("load-pasted").addEventListener("click", () => {
  const jsonText = document.getElementById("json-paste").value;
  try {
    const data = JSON.parse(jsonText);
    loadQuizData(data);
  } catch (error) {
    alert("Erreur de format JSON. Veuillez vérifier votre texte.");
    console.error(error);
  }
});

function loadQuizData(data) {
  quizData = data;

  // Normalize answers: convert [x] to x for single-choice questions
  for (const seance in quizData) {
    quizData[seance].forEach((question) => {
      if (Array.isArray(question.answer) && question.answer.length === 1) {
        question.answer = question.answer[0];
      }
    });
  }

  const cardsContainer = document.getElementById("seance-cards-container");
  cardsContainer.innerHTML = "";

  const seanceNames = Object.keys(quizData);

  if (seanceNames.length === 1) {
    // If only one seance, start it automatically
    currentSeance = seanceNames[0];
    startQuiz();
  } else {
    for (const seance in quizData) {
      const card = document.createElement("div");
      card.classList.add("seance-card");
      card.dataset.seance = seance;

      const questionCount = quizData[seance].length;

      card.innerHTML = `
            <div class="seance-card-title">${formatSeanceName(seance)}</div>
            <div class="seance-card-info">${questionCount} questions</div>
        `;

      card.addEventListener("click", selectSeance);
      cardsContainer.appendChild(card);
    }

    // Show seance selection
    uploadSection.classList.add("hide");
    geminiPromptContainer.classList.add("hide");
    seanceSelection.classList.remove("hide");
  }
}

function selectSeance(e) {
  // Update current seance
  currentSeance = e.currentTarget.dataset.seance;

  // Start quiz immediately
  startQuiz();
}

function formatSeanceName(seanceName) {
  return seanceName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/(\d+)/, " $1");
}

function updateSelectedSeance() {
  currentSeance = seanceSelector.value;
}

function startQuiz() {
  // Initialize quiz variables
  currentQuestions = quizData[currentSeance].map((q) => ({
    ...q,
    options: [...q.options],
    answer: Array.isArray(q.answer) ? [...q.answer] : q.answer,
  }));
  shuffleArray(currentQuestions);
  currentQuestions.forEach(shuffleOptions);
  currentQuestionIndex = 0;
  score = 0;
  userAnswers = Array(currentQuestions.length).fill(null);

  // Update UI
  seanceTitle.textContent = formatSeanceName(currentSeance);
  totalQuestionsSpan.textContent = currentQuestions.length;

  // Show quiz container
  seanceSelection.classList.add("hide");
  quizContainer.classList.remove("hide");

  // Load first question
  loadQuestion();
}

document.getElementById("copy-prompt").addEventListener("click", () => {
  const promptText = `Analyze the provided document in detail and extract the key concepts, definitions, and critical points necessary for a deep understanding of the course. Then, generate 20 questions; multiple-choice questions (QCM) in same language as the document, following the format below:
Questions should be clear, precise, and relevant to the document's content.
The answer choices (options) should include plausible distractors.
The correct answer should be indicated with its index in the list.
Provide a brief yet informative explanation for each answer to reinforce understanding.
Ensure the questions cover various levels of cognition, including factual recall, comprehension, and application.
Structure the questions to promote critical thinking and not just rote memorization.
Use the following JSON format:
{
    "seance 1": [
        {
            "question": "Question text here; (example answers 0 and 1 are correct, so answer is [0,1])",
            "options": [
                "Option 1",
                "Option 2",
                "Option 3",
                "Option 4"
            ],
            "answer": [0,1],
            "explanation": "Explanation text here"
        },
        {
            "question": "Question 2 text here",
            "options": [
                "Option 1",
                "Option 2",
                "Option 3",
                "Option 4",
            ],
            "answer": [3],
            "explanation": "Explanation text here"
        }
    ]
}
Make sure that:
The answers are zero-indexed.
The questions cover different sections of the document comprehensively.
The explanations reinforce key learnings and not just repeat the correct answer.
The difficulty level varies, including both basic and challenging questions.
And be sure to put the answers indexes at different places (Don't repeat the position of correct answer).
Don't put words like "The document says" or "The text states" in the questions nor in the explanation.
The reply should be in JSON format only, without any additional text or comments.
The reply should be in the same language as the document.
`;

  navigator.clipboard
    .writeText(promptText)
    .then(() => {
      const confirmation = document.getElementById("copy-confirmation");
      confirmation.classList.remove("hide");
      setTimeout(() => {
        confirmation.classList.add("hide");
      }, 2000);
    })
    .catch((err) => {
      console.error("Erreur lors de la copie: ", err);
      alert("Erreur lors de la copie. Veuillez réessayer.");
    });
});

// Drag and drop functionality
const dropArea = document.getElementById("drop-area");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(eventName, highlight, false);
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
  dropArea.classList.add("active");
}

function unhighlight() {
  dropArea.classList.remove("active");
}

dropArea.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const file = dt.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        loadQuizData(data);
      } catch (error) {
        alert(
          "Erreur lors de la lecture du fichier JSON. Veuillez vérifier le format.",
        );
        console.error(error);
      }
    };
    reader.readAsText(file);
  }
}

function loadQuestion() {
  const question = currentQuestions[currentQuestionIndex];

  if (!question.hasOwnProperty("explanation")) {
    question.explanation = "Aucune explication disponible.";
  }

  // Update question display
  questionText.textContent = question.question;
  currentQuestionSpan.textContent = currentQuestionIndex + 1;

  // Update progress bar
  const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
  progressFill.style.width = `${progress}%`;

  // Generate options
  optionsContainer.innerHTML = "";
  question.options.forEach((option, index) => {
    const optionElement = document.createElement("div");
    optionElement.classList.add("option");
    optionElement.textContent = option;
    optionElement.dataset.index = index;
    optionElement.style.pointerEvents = "auto"; // Re-enable clicking

    // Highlight selected options if user has previously answered
    if (userAnswers[currentQuestionIndex]) {
      // Check if answer is array or single number
      if (Array.isArray(userAnswers[currentQuestionIndex])) {
        if (userAnswers[currentQuestionIndex].includes(index)) {
          optionElement.classList.add("selected");
        }
      } else if (userAnswers[currentQuestionIndex] === index) {
        optionElement.classList.add("selected");
      }
    }

    optionElement.addEventListener("click", selectOption);
    optionsContainer.appendChild(optionElement);
  });

  // Update navigation buttons
  prevBtn.disabled = currentQuestionIndex === 0;

  // Enable next button if user has answered (either as array or single number)
  nextBtn.disabled =
    !userAnswers[currentQuestionIndex] ||
    (Array.isArray(userAnswers[currentQuestionIndex]) &&
      userAnswers[currentQuestionIndex].length === 0);

  // Show submit button on last question
  if (currentQuestionIndex === currentQuestions.length - 1) {
    nextBtn.classList.add("hide");
    submitBtn.classList.remove("hide");
    submitBtn.disabled =
      !userAnswers[currentQuestionIndex] ||
      (Array.isArray(userAnswers[currentQuestionIndex]) &&
        userAnswers[currentQuestionIndex].length === 0);
  } else {
    nextBtn.classList.remove("hide");
    submitBtn.classList.add("hide");
  }

  // Add visual indicator if question requires multiple answers
  const isMultiAnswer = Array.isArray(question.answer);
  const multiSelectIndicator = document.getElementById(
    "multi-select-indicator",
  );

  if (isMultiAnswer) {
    multiSelectIndicator.textContent = "(Plusieurs réponses possibles)";
    multiSelectIndicator.classList.remove("hide");
  } else {
    multiSelectIndicator.classList.add("hide");
  }
}

function selectOption(e) {
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const selectedIndex = parseInt(e.target.dataset.index);
  const isMultiAnswer = Array.isArray(currentQuestion.answer);

  if (isMultiAnswer) {
    // For multiple answer questions
    if (!Array.isArray(userAnswers[currentQuestionIndex])) {
      userAnswers[currentQuestionIndex] = [];
    }

    if (e.target.classList.contains("selected")) {
      // If already selected, unselect it
      e.target.classList.remove("selected");
      userAnswers[currentQuestionIndex] = userAnswers[
        currentQuestionIndex
      ].filter((idx) => idx !== selectedIndex);
    } else {
      // If not selected, select it
      e.target.classList.add("selected");
      userAnswers[currentQuestionIndex].push(selectedIndex);
    }
  } else {
    // For single answer questions (original behavior)
    const options = optionsContainer.querySelectorAll(".option");
    options.forEach((option) => option.classList.remove("selected"));
    e.target.classList.add("selected");
    userAnswers[currentQuestionIndex] = selectedIndex;

    // Show immediate feedback for single answer
    showFeedback();
  }

  // Enable next/submit button if something is selected
  const hasAnswer = isMultiAnswer
    ? Array.isArray(userAnswers[currentQuestionIndex]) &&
      userAnswers[currentQuestionIndex].length > 0
    : userAnswers[currentQuestionIndex] !== null;

  nextBtn.disabled = !hasAnswer;
  submitBtn.disabled = !hasAnswer;
}

function showPrevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function showNextQuestion(isSkip = false) {
  // Check if feedback was already shown
  const feedbackShown =
    document.querySelector(".explanation-feedback") !== null;

  if (!isSkip && !feedbackShown) {
    // Show feedback before moving to next question
    showFeedback();
    // Wait a moment before moving to next question
    setTimeout(() => {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
      }
    }, 1500);
  } else if (!isSkip && feedbackShown) {
    // Feedback already shown by Enter key, just move to next
    if (currentQuestionIndex < currentQuestions.length - 1) {
      currentQuestionIndex++;
      loadQuestion();
    }
  } else {
    // Skip case
    if (currentQuestionIndex < currentQuestions.length - 1) {
      currentQuestionIndex++;
      loadQuestion();
    } else {
      submitQuiz();
    }
  }
}

function showFeedback() {
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];
  const isMultiAnswer = Array.isArray(currentQuestion.answer);
  const options = optionsContainer.querySelectorAll(".option");

  // Disable option clicking during feedback
  options.forEach((option) => {
    option.style.pointerEvents = "none";
  });

  if (isMultiAnswer) {
    // For multi-answer questions
    options.forEach((option, index) => {
      if (currentQuestion.answer.includes(index)) {
        option.classList.add("correct");
      }
      if (Array.isArray(userAnswer) && userAnswer.includes(index)) {
        if (!currentQuestion.answer.includes(index)) {
          option.classList.add("incorrect");
        }
      }
    });
  } else {
    // For single answer questions
    options.forEach((option, index) => {
      if (index === currentQuestion.answer) {
        option.classList.add("correct");
      }
      if (userAnswer === index && index !== currentQuestion.answer) {
        option.classList.add("incorrect");
      }
    });
  }

  // Show explanation below the options
  const explanationDiv = document.createElement("div");
  explanationDiv.classList.add("explanation-feedback");
  explanationDiv.innerHTML = `<strong>Explication:</strong> ${
    currentQuestion.explanation || "Aucune explication disponible."
  }`;
  optionsContainer.appendChild(explanationDiv);

  // Disable next button during feedback
  nextBtn.disabled = true;
  submitBtn.disabled = true;
}

function showFeedbackOnly() {
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const userAnswer = userAnswers[currentQuestionIndex];
  const isMultiAnswer = Array.isArray(currentQuestion.answer);
  const options = optionsContainer.querySelectorAll(".option");

  // Don't show feedback if already shown
  if (document.querySelector(".explanation-feedback")) {
    return;
  }

  // Disable option clicking during feedback
  options.forEach((option) => {
    option.style.pointerEvents = "none";
  });

  if (isMultiAnswer) {
    // For multi-answer questions
    options.forEach((option, index) => {
      if (currentQuestion.answer.includes(index)) {
        option.classList.add("correct");
      }
      if (Array.isArray(userAnswer) && userAnswer.includes(index)) {
        if (!currentQuestion.answer.includes(index)) {
          option.classList.add("incorrect");
        }
      }
    });
  } else {
    // For single answer questions
    options.forEach((option, index) => {
      if (index === currentQuestion.answer) {
        option.classList.add("correct");
      }
      if (userAnswer === index && index !== currentQuestion.answer) {
        option.classList.add("incorrect");
      }
    });
  }

  // Show explanation below the options
  const explanationDiv = document.createElement("div");
  explanationDiv.classList.add("explanation-feedback");
  explanationDiv.innerHTML = `<strong>Explication:</strong> ${
    currentQuestion.explanation || "Aucune explication disponible."
  }`;
  optionsContainer.appendChild(explanationDiv);
}

function isCorrectAnswer(answer, correctAnswer) {
  if (Array.isArray(answer) && Array.isArray(correctAnswer)) {
    return (
      answer.length === correctAnswer.length &&
      correctAnswer.every((val) => answer.includes(val))
    );
  } else {
    return answer === correctAnswer;
  }
}

function getUserAnswerDisplay(answer, question) {
  if (Array.isArray(answer)) {
    return answer.map((idx) => question.options[idx]).join("<br>- ");
  } else {
    return answer !== -1 ? question.options[answer] : "Aucune réponse";
  }
}

function getCorrectAnswerDisplay(correctAnswer, question) {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map((idx) => question.options[idx]).join("<br>- ");
  }
  return question.options[correctAnswer];
}

function calculateScore() {
  score = 0;
  const wrongAnswers = [];

  userAnswers.forEach((answer, index) => {
    const question = currentQuestions[index];
    let isCorrect = isCorrectAnswer(answer, question.answer);

    if (isCorrect) {
      score++;
    } else {
      wrongAnswers.push({
        question: question.question,
        userAnswer: "- " + getUserAnswerDisplay(answer, question),
        correctAnswer:
          "- " + getCorrectAnswerDisplay(question.answer, question),
        explanation: question.explanation || "Aucune explication disponible.",
      });
    }
  });

  return wrongAnswers;
}

function submitQuiz() {
  // Show feedback for last question
  showFeedback();

  // Wait before showing results
  setTimeout(() => {
    // Calculate score
    const wrongAnswers = calculateScore();

    // Update score text
    scoreText.textContent = `Vous avez obtenu ${score}/${currentQuestions.length} points`;

    // Display wrong answers with explanations
    const wrongAnswersContainer = document.getElementById(
      "wrong-answers-container",
    );
    wrongAnswersContainer.innerHTML = "";

    if (wrongAnswers.length > 0) {
      const heading = document.createElement("h3");
      heading.textContent = "Questions incorrectes:";
      wrongAnswersContainer.appendChild(heading);

      wrongAnswers.forEach((item, index) => {
        const container = document.createElement("div");
        container.classList.add("wrong-answer-item");

        container.innerHTML = `
                <p class="question-text"><strong>Question ${
                  index + 1
                }:</strong> ${item.question}</p>
                <p class="user-answer"><strong>Votre réponse:</strong> <span class="incorrect">${
                  item.userAnswer
                }</span></p>
                <p class="correct-answer"><strong>Réponse correcte:</strong> <span class="correct">${
                  item.correctAnswer
                }</span></p>
                <div class="explanation-box">
                    <p><strong>Explication:</strong> ${item.explanation}</p>
                </div>
            `;
        wrongAnswersContainer.appendChild(container);
      });
    } else {
      const perfectScore = document.createElement("p");
      perfectScore.textContent =
        "Félicitations ! Vous avez répondu correctement à toutes les questions !";
      perfectScore.classList.add("perfect-score");
      wrongAnswersContainer.appendChild(perfectScore);
    }

    // Show results
    quizContainer.classList.add("hide");
    resultContainer.classList.remove("hide");
  }, 1500);
}

function restartQuiz() {
  // Reset user answers and score
  userAnswers = Array(currentQuestions.length).fill(null);
  score = 0;
  currentQuestionIndex = 0;

  // Hide results and show quiz
  resultContainer.classList.add("hide");
  quizContainer.classList.remove("hide");

  // Load first question
  loadQuestion();
}

function showSeanceSelection() {
  resultContainer.classList.add("hide");
  seanceSelection.classList.remove("hide");
}

document.addEventListener("DOMContentLoaded", function () {
  const NAMESPACE = "sup-quiz-counter";
  const COUNTER_NAME = "visitors";

  // Get the counter element
  const counterElement = document.getElementById("count");

  // Function to check and update the visitor count
  function handleVisitorCount() {
    // Check if this visitor has been counted recently
    const lastVisit = localStorage.getItem("lastVisitTimestamp");
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
    const currentTime = new Date().getTime();

    // If this is a new visitor or it's been more than a week since their last visit
    if (!lastVisit || currentTime - parseInt(lastVisit) > oneWeekInMs) {
      // Increment the counter (new visitor or returning after a week)
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER_NAME}/up`)
        .then((response) => response.json())
        .then((data) => {
          counterElement.textContent = data.count.toLocaleString();
          // Store the timestamp of this visit
          localStorage.setItem("lastVisitTimestamp", currentTime.toString());
        })
        .catch((error) => {
          console.error("Error updating visitor counter:", error);
          counterElement.textContent = "Error";
        });
    } else {
      // This is a returning visitor within the past week, just get the current count
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER_NAME}/`)
        .then((response) => response.json())
        .then((data) => {
          counterElement.textContent = data.count.toLocaleString();
        })
        .catch((error) => {
          console.error("Error fetching visitor count:", error);
          counterElement.textContent = "Error";
        });
    }
  }

  // Call the function to handle the visitor count
  handleVisitorCount();
  function pollVisitorCount() {
    setInterval(() => {
      handleVisitorCount();
    }, 15000);
  }

  pollVisitorCount();
});

function loadCourseJSON(filename) {
  // Show a loading state in the drop area
  const dropArea = document.getElementById("drop-area");
  const originalDropAreaContent = dropArea.innerHTML;
  dropArea.innerHTML = "<p>Chargement du cours en cours...</p>";

  // Fetch the JSON file directly from the courses folder
  fetch(`assets/courses/${filename}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load course file: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      // Process the JSON data using your existing function
      loadQuizData(data);

      // Hide drop area and related containers since a course is loaded
      document.getElementById("drop-area").classList.add("hide");
      document.getElementById("gemini-prompt-container").classList.add("hide");
    })
    .catch((error) => {
      console.error("Error loading course:", error);

      // Restore drop area with error message
      dropArea.innerHTML = `
                <p>Erreur lors du chargement du cours.</p>
                <p class="error-message">${error.message}</p>
                ${originalDropAreaContent}
            `;
    });
}

function loadCoursesFromJSON() {
  fetch("assets/courses/course-list.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Could not load course list");
      }
      return response.json();
    })
    .then((data) => {
      // Replace the hardcoded course list with data from JSON
      const courses = data.courses || [];
      // sort courses descending by id
      courses.sort((a, b) => b.id - a.id);
      renderCourseList(courses);
    })
    .catch((error) => {
      console.error("Error loading course list:", error);
      // Fallback to hardcoded list if JSON load fails
      renderCourseList(availableCourses);
    });
}

// Helper function to render course list
function renderCourseList(courses) {
  const courseList = document.getElementById("course-list");
  courseList.innerHTML = "";

  if (courses.length === 0) {
    courseList.innerHTML =
      '<div class="no-courses">Aucun cours disponible.</div>';
    return;
  }

  // Group courses by INDP
  const groups = {};
  courses.forEach((course) => {
    const key = course.INDP || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(course);
  });

  // Sort group keys descending (INDP3 first, then INDP2, etc.)
  const sortedKeys = Object.keys(groups).sort((a, b) => b - a);

  sortedKeys.forEach((key) => {
    const groupEl = document.createElement("div");
    groupEl.className = "course-group";

    const header = document.createElement("div");
    header.className = "course-group-header";
    header.innerHTML = `<span class="course-group-arrow">&#9654;</span> INDP${key} <span class="course-group-count">(${groups[key].length})</span>`;
    header.addEventListener("click", () => {
      groupEl.classList.toggle("open");
    });

    const body = document.createElement("div");
    body.className = "course-group-body";

    const inner = document.createElement("div");
    inner.className = "course-group-inner";

    groups[key].forEach((course) => {
      const courseElement = document.createElement("div");
      courseElement.className = "course-item";
      courseElement.setAttribute("data-id", course.id);
      courseElement.textContent = course.name;

      courseElement.addEventListener("click", () => {
        document.querySelectorAll(".course-item").forEach((item) => {
          item.classList.remove("active");
        });
        courseElement.classList.add("active");
        loadCourseJSON(course.filename);
      });

      inner.appendChild(courseElement);
    });

    body.appendChild(inner);
    groupEl.appendChild(header);
    groupEl.appendChild(body);
    courseList.appendChild(groupEl);
  });
}

function reloadPage() {
  location.reload();
}

// Get the image and title elements
const logo = document.getElementById("logo");
const title = document.getElementById("title");

// Add click event listeners to reload the page
logo.addEventListener("click", reloadPage);
title.addEventListener("click", reloadPage);

window.addEventListener("load", function () {
  loadCoursesFromJSON();
});
