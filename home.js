const defaultQuizData = {
    "seance1": [
        {
            "question": "Quel était le montant approximatif du financement mondial en capital-risque des startups au troisième trimestre 2021 ?",
            "options": [
                "77 milliards USD",
                "158 milliards USD",
                "100 milliards USD",
                "200 milliards USD"
            ],
            "answer": 1
        },
        {
            "question": "Combien de nouvelles licornes ont émergé au troisième trimestre 2021 ?",
            "options": [
                "37",
                "127",
                "77",
                "200"
            ],
            "answer": 1
        }
    ]
};

// Global variables
let quizData = {};
let currentSeance = '';
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];

// DOM Elements
const uploadSection = document.getElementById('drop-area');
const seanceSelection = document.getElementById('seance-selection');
const quizContainer = document.getElementById('quiz-container');
const resultContainer = document.getElementById('result-container');
const fileInput = document.getElementById('file-input');
const seanceSelector = document.getElementById('seance-selector');
const startQuizBtn = document.getElementById('start-quiz');
const seanceTitle = document.getElementById('seance-title');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const progressFill = document.getElementById('progress-fill');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const scoreText = document.getElementById('score-text');
const restartBtn = document.getElementById('restart-btn');
const changeSeanceBtn = document.getElementById('change-seance-btn');
const geminiPromptContainer = document.getElementById('gemini-prompt-container');

// Event Listeners
fileInput.addEventListener('change', handleFileUpload);
startQuizBtn.addEventListener('click', startQuiz);
prevBtn.addEventListener('click', showPrevQuestion);
nextBtn.addEventListener('click', showNextQuestion);
submitBtn.addEventListener('click', submitQuiz);
restartBtn.addEventListener('click', restartQuiz);
changeSeanceBtn.addEventListener('click', showSeanceSelection);

// Functions
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            loadQuizData(data);
        } catch (error) {
            alert('Erreur lors de la lecture du fichier JSON. Veuillez vérifier le format.');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

document.getElementById('load-pasted').addEventListener('click', () => {
    const jsonText = document.getElementById('json-paste').value;
    try {
        const data = JSON.parse(jsonText);
        loadQuizData(data);
    } catch (error) {
        alert('Erreur de format JSON. Veuillez vérifier votre texte.');
        console.error(error);
    }
});

function loadQuizData(data) {
    quizData = data;
    
    const cardsContainer = document.getElementById('seance-cards-container');
    cardsContainer.innerHTML = '';
    
    for (const seance in quizData) {
        const card = document.createElement('div');
        card.classList.add('seance-card');
        card.dataset.seance = seance;
        
        const questionCount = quizData[seance].length;
        
        card.innerHTML = `
            <div class="seance-card-title">${formatSeanceName(seance)}</div>
            <div class="seance-card-info">${questionCount} questions</div>
        `;
        
        card.addEventListener('click', selectSeance);
        cardsContainer.appendChild(card);
    }
    
    // Disable the start button until a seance is selected
    document.getElementById('start-quiz').disabled = true;
    
    // Show seance selection
    uploadSection.classList.add('hide');
    geminiPromptContainer.classList.add('hide');
    seanceSelection.classList.remove('hide');
}

function selectSeance(e) {
    // Remove selected class from all cards
    const allCards = document.querySelectorAll('.seance-card');
    allCards.forEach(card => card.classList.remove('selected'));
    
    // Add selected class to clicked card
    const card = e.currentTarget;
    card.classList.add('selected');
    
    // Update current seance
    currentSeance = card.dataset.seance;
    
    // Enable start button
    document.getElementById('start-quiz').disabled = false;
}

function formatSeanceName(seanceName) {
    return seanceName.replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .replace(/(\d+)/, ' $1');
}

function updateSelectedSeance() {
    currentSeance = seanceSelector.value;
}

function startQuiz() {
    // Initialize quiz variables
    currentQuestions = quizData[currentSeance];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = Array(currentQuestions.length).fill(null);
    
    // Update UI
    seanceTitle.textContent = formatSeanceName(currentSeance);
    totalQuestionsSpan.textContent = currentQuestions.length;
    
    // Show quiz container
    seanceSelection.classList.add('hide');
    quizContainer.classList.remove('hide');
    
    // Load first question
    loadQuestion();
}

document.getElementById('copy-prompt').addEventListener('click', () => {
    const promptText = `Based on the given document generate 15 qcm questions in this format:
{
    "seance 1": [
        {
            "question": "Quel était le montant approximatif du financement mondial en capital-risque des startups au troisième trimestre 2021 ?",
            "options": [
                "77 milliards USD",
                "158 milliards USD",
                "100 milliards USD",
                "200 milliards USD"
            ],
            "answer": 1,
            "explanation": "Le financement mondial en capital-risque des startups au troisième trimestre 2021 s'élevait à environ 158 milliards USD."
        },
        {
            "question": "Combien de nouvelles licornes ont émergé au troisième trimestre 2021 ?",
            "options": [
                "37",
                "127",
                "77",
                "200"
            ],
            "answer": 1,
            "explanation": "Au troisième trimestre 2021, 127 nouvelles licornes ont émergé."
        }
    ]
}`;

    navigator.clipboard.writeText(promptText)
        .then(() => {
            const confirmation = document.getElementById('copy-confirmation');
            confirmation.classList.remove('hide');
            setTimeout(() => {
                confirmation.classList.add('hide');
            }, 2000);
        })
        .catch(err => {
            console.error('Erreur lors de la copie: ', err);
            alert('Erreur lors de la copie. Veuillez réessayer.');
        });
});

// Drag and drop functionality
const dropArea = document.getElementById('drop-area');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight() {
    dropArea.classList.add('active');
}

function unhighlight() {
    dropArea.classList.remove('active');
}

dropArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                loadQuizData(data);
            } catch (error) {
                alert('Erreur lors de la lecture du fichier JSON. Veuillez vérifier le format.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
}

function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];

    if (!question.hasOwnProperty('explanation')) {
        question.explanation = "Aucune explication disponible.";
    }        
    
    // Update question display
    questionText.textContent = question.question;
    currentQuestionSpan.textContent = currentQuestionIndex + 1;
    
    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
    progressFill.style.width = `${progress}%`;
    
    // Generate options
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.classList.add('option');
        optionElement.textContent = option;
        optionElement.dataset.index = index;
        
        // Highlight selected option if user has previously answered
        if (userAnswers[currentQuestionIndex] === index) {
            optionElement.classList.add('selected');
        }
        
        optionElement.addEventListener('click', selectOption);
        optionsContainer.appendChild(optionElement);
    });
    
    // Update navigation buttons
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = userAnswers[currentQuestionIndex] === null;
    
    // Show submit button on last question
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.classList.add('hide');
        submitBtn.classList.remove('hide');
        submitBtn.disabled = userAnswers[currentQuestionIndex] === null;
    } else {
        nextBtn.classList.remove('hide');
        submitBtn.classList.add('hide');
    }
}

function selectOption(e) {
    // Remove selected class from all options
    const options = optionsContainer.querySelectorAll('.option');
    options.forEach(option => option.classList.remove('selected'));
    
    // Add selected class to clicked option
    e.target.classList.add('selected');
    
    // Save the answer
    const selectedIndex = parseInt(e.target.dataset.index);
    userAnswers[currentQuestionIndex] = selectedIndex;
    
    // Enable next/submit button
    nextBtn.disabled = false;
    submitBtn.disabled = false;
}

function showPrevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function showNextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    }
}

function submitQuiz() {
    // Calculate score
    score = 0;
    const wrongAnswers = [];
    
    userAnswers.forEach((answer, index) => {
        const question = currentQuestions[index];
        if (answer === question.answer) {
            score++;
        } else {
            // Store wrong answers for display
            wrongAnswers.push({
                question: question.question,
                userAnswer: question.options[answer],
                correctAnswer: question.options[question.answer],
                explanation: question.explanation || "Aucune explication disponible."
            });
        }
    });
    
    // Update score text
    scoreText.textContent = `Vous avez obtenu ${score}/${currentQuestions.length} points`;
    
    // Display wrong answers with explanations
    const wrongAnswersContainer = document.getElementById('wrong-answers-container');
    wrongAnswersContainer.innerHTML = '';
    
    if (wrongAnswers.length > 0) {
        const heading = document.createElement('h3');
        heading.textContent = 'Questions incorrectes:';
        wrongAnswersContainer.appendChild(heading);
        
        wrongAnswers.forEach((item, index) => {
            const container = document.createElement('div');
            container.classList.add('wrong-answer-item');
            
            container.innerHTML = `
                <p class="question-text"><strong>Question ${index + 1}:</strong> ${item.question}</p>
                <p class="user-answer"><strong>Votre réponse:</strong> <span class="incorrect">${item.userAnswer}</span></p>
                <p class="correct-answer"><strong>Réponse correcte:</strong> <span class="correct">${item.correctAnswer}</span></p>
                <div class="explanation-box">
                    <p><strong>Explication:</strong> ${item.explanation}</p>
                </div>
            `;
            
            wrongAnswersContainer.appendChild(container);
        });
    } else {
        const perfectScore = document.createElement('p');
        perfectScore.textContent = 'Félicitations ! Vous avez répondu correctement à toutes les questions !';
        perfectScore.classList.add('perfect-score');
        wrongAnswersContainer.appendChild(perfectScore);
    }
    
    // Show results
    quizContainer.classList.add('hide');
    resultContainer.classList.remove('hide');
}

function restartQuiz() {
    // Reset user answers and score
    userAnswers = Array(currentQuestions.length).fill(null);
    score = 0;
    currentQuestionIndex = 0;
    
    // Hide results and show quiz
    resultContainer.classList.add('hide');
    quizContainer.classList.remove('hide');
    
    // Load first question
    loadQuestion();
}

function showSeanceSelection() {
    resultContainer.classList.add('hide');
    seanceSelection.classList.remove('hide');
}

document.addEventListener('DOMContentLoaded', function() {
    const NAMESPACE = 'sup-quiz-counter';
    const COUNTER_NAME = 'visitors';
    
    // Get the counter element
    const counterElement = document.getElementById('count');
    
    // Function to check and update the visitor count
    function handleVisitorCount() {
        // Check if this visitor has been counted recently
        const lastVisit = localStorage.getItem('lastVisitTimestamp');
        const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds
        const currentTime = new Date().getTime();
        
        // If this is a new visitor or it's been more than a week since their last visit
        if (!lastVisit || (currentTime - parseInt(lastVisit)) > oneWeekInMs) {
            // Increment the counter (new visitor or returning after a week)
            fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER_NAME}/up`)
                .then(response => response.json())
                .then(data => {
                    counterElement.textContent = data.count.toLocaleString();
                    // Store the timestamp of this visit
                    localStorage.setItem('lastVisitTimestamp', currentTime.toString());
                })
                .catch(error => {
                    console.error('Error updating visitor counter:', error);
                    counterElement.textContent = 'Error';
                });
        } else {
            // This is a returning visitor within the past week, just get the current count
            fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${COUNTER_NAME}/`)
                .then(response => response.json())
                .then(data => {
                    counterElement.textContent = data.count.toLocaleString();
                })
                .catch(error => {
                    console.error('Error fetching visitor count:', error);
                    counterElement.textContent = 'Error';
                });
        }
    }
    
    // Call the function to handle the visitor count
    handleVisitorCount();
});

function loadCourseJSON(filename) {
    // Show a loading state in the drop area
    const dropArea = document.getElementById('drop-area');
    const originalDropAreaContent = dropArea.innerHTML;
    dropArea.innerHTML = '<p>Chargement du cours en cours...</p>';
    
    // Fetch the JSON file directly from the courses folder
    fetch(`courses/${filename}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load course file: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Successfully loaded course: ${filename}`);
            
            // Process the JSON data using your existing function
            loadQuizData(data);
            
            // Hide drop area and related containers since a course is loaded
            document.getElementById('drop-area').classList.add('hide');
            document.getElementById('gemini-prompt-container').classList.add('hide');
        })
        .catch(error => {
            console.error('Error loading course:', error);
            
            // Restore drop area with error message
            dropArea.innerHTML = `
                <p>Erreur lors du chargement du cours.</p>
                <p class="error-message">${error.message}</p>
                ${originalDropAreaContent}
            `;
        });
}

function loadCoursesFromJSON() {
    fetch('courses/course-list.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Could not load course list');
            }
            return response.json();
        })
        .then(data => {
            // Replace the hardcoded course list with data from JSON
            const courses = data.courses || [];
            renderCourseList(courses);
        })
        .catch(error => {
            console.error('Error loading course list:', error);
            // Fallback to hardcoded list if JSON load fails
            renderCourseList(availableCourses);
        });
}

// Helper function to render course list
function renderCourseList(courses) {
    const courseList = document.getElementById('course-list');
    courseList.innerHTML = '';
    
    if (courses.length === 0) {
        courseList.innerHTML = '<div class="no-courses">Aucun cours disponible.</div>';
        return;
    }
    
    courses.forEach(course => {
        const courseElement = document.createElement('div');
        courseElement.className = 'course-item';
        courseElement.setAttribute('data-id', course.id);
        courseElement.textContent = course.name;
        
        courseElement.addEventListener('click', () => {
            document.querySelectorAll('.course-item').forEach(item => {
                item.classList.remove('active');
            });
            courseElement.classList.add('active');
            loadCourseJSON(course.filename);
        });
        
        courseList.appendChild(courseElement);
    });
}

window.addEventListener('load', function() {
    loadCoursesFromJSON();
});
