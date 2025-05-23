let quizData;
let searchResults = [];
let currentSearchIndex = -1;
let allQuestions = [];
let courseList = [];
let isSearchClosed = true;
let currentElement = 0;

fetch('assets/courses/course-list.json')
.then(response => {
    if (!response.ok) {
        throw new Error('Could not load course list');
    }
    return response.json();
})
.then(data => {
    courseList = data.courses;
    populateCourseSelector();
    loadCourse('3_cloud_cours.json');
})
.catch(error => {
    console.error('Error loading course list:', error);
    document.getElementById('course-select').innerHTML = 
        '<option value="">Error loading courses</option>';
});

function populateCourseSelector() {
    const select = document.getElementById('course-select');
    select.innerHTML = '<option value="">Select a course...</option>';
    
    courseList.forEach(course => {
        const option = document.createElement('option');
        option.value = course.filename;
        option.textContent = course.name;
        if (course.filename === '3_cloud_cours.json') {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', (e) => {
        const selectedFile = e.target.value;
        if (selectedFile) {
            loadCourse(selectedFile);
        } else {
            clearQuizDisplay();
        }
    });
}

function loadCourse(filename) {
    // Clear previous data
    clearQuizDisplay();
    clearSearch();
    
    // Show loading state
    document.getElementById('quiz-container').innerHTML = 
        '<div style="text-align: center; color: white; padding: 20px;">Loading course...</div>';
    
    fetch(`assets/courses/${filename}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Could not load course: ${filename}`);
        }
        return response.json();
    })
    .then(data => {
        displayQuiz(data);
        setupSearch();
    })
    .catch(error => {
        console.error('Error loading quiz data:', error);
        document.getElementById('quiz-container').innerHTML = 
            '<div style="text-align: center; color: white; padding: 20px;">Error loading course data</div>';
    });

    document.getElementById('quiz-container').innerHTML = '';
}

function clearQuizDisplay() {
    document.getElementById('quiz-container').innerHTML = '';
    document.getElementById('stats-container').innerHTML = '';
    allQuestions = [];
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const prevBtn = document.getElementById('prev-result');
    const nextBtn = document.getElementById('next-result');
    const closeBtn = document.getElementById('close-search');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        if (query.length === 0) {
            clearSearch();
            return;
        }
        
        performSearch(query);
    });
    
    prevBtn.addEventListener('click', () => navigateSearch(-1));
    nextBtn.addEventListener('click', () => navigateSearch(1));
    
    // Keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' && searchResults.length > 0) {
            e.preventDefault();
            navigateSearch(1);
        } else if (e.key === 'ArrowUp' && searchResults.length > 0) {
            e.preventDefault();
            navigateSearch(-1);
        } else if (e.key === 'Enter' && searchResults.length > 0) {
            e.preventDefault();
            scrollToCurrentResult();
        }
    });

    closeBtn.addEventListener('click', () => {
        isSearchClosed = !isSearchClosed;
        if (isSearchClosed) {
            searchInput.value = '';
            clearSearch();
            document.getElementById('search-input').style.display = 'none';
            closeBtn.textContent = '🔍';
        } else {
            searchInput.focus();
            document.getElementById('search-input').style.display = 'block';
            closeBtn.textContent = '❌';
        }
    });
}

function performSearch(query) {
    clearSearch();
    searchResults = [];
    
    allQuestions.forEach((questionData, index) => {
        const questionText = questionData.question.toLowerCase();
        const optionsText = questionData.options ? questionData.options.join(' ').toLowerCase() : '';
        const fullText = questionText + ' ' + optionsText;
        
        if (fullText.includes(query)) {
            searchResults.push({
                index: index,
                element: questionData.element,
                pageElement: questionData.pageElement,
                pageContent: questionData.pageContent,
                relevance: calculateRelevance(fullText, query)
            });
        }
    });
    
    // Sort by relevance (higher is better)
    searchResults.sort((a, b) => b.relevance - a.relevance);
    
    updateSearchUI();
    
    if (searchResults.length > 0) {
        currentSearchIndex = 0;
        highlightCurrentResult();
        scrollToCurrentResult();
    }
}

function calculateRelevance(text, query) {
    const queryWords = query.split(' ').filter(word => word.length > 0);
    let score = 0;
    
    queryWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        const matches = text.match(regex);
        if (matches) {
            score += matches.length;
            // Bonus for exact matches at word boundaries
            const exactMatches = text.match(new RegExp(`\\b${word}\\b`, 'gi'));
            if (exactMatches) {
                score += exactMatches.length * 2;
            }
        }
    });
    
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
    document.querySelectorAll('.search-match').forEach(el => {
        el.classList.remove('search-match');
    });
    
    if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
        const result = searchResults[currentSearchIndex];
        result.element.classList.add('search-match');
        
        // Expand the page if collapsed
        if (!result.pageContent.classList.contains('expanded')) {
            result.pageElement.classList.remove('collapsed');
            result.pageContent.classList.add('expanded');
        }
    }
}

function scrollToCurrentResult() {
    if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
        const result = searchResults[currentSearchIndex];
        result.element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function scrollToElement(element) {
    let parent = element.closest('.page-section');
    let pageContent = parent.querySelector('.page-content');
    let pageHeader = parent.querySelector('.page-header');

    // Expand the section if it's collapsed
    if (!pageContent.classList.contains('expanded')) {
        pageHeader.classList.remove('collapsed');
        pageContent.classList.add('expanded');
    }
    
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function handleKeydown(e) {
    let questions = document.getElementById('quiz-container').querySelectorAll('.question-container');
    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            currentElement -= currentElement - 1 < 0 ? 0 : 1;
            scrollToElement(questions[currentElement]);
            break;
        case 'ArrowRight':
            e.preventDefault();
            currentElement += currentElement + 1 >= questions.length ? 0 : 1;
            scrollToElement(questions[currentElement]);
            break;
    }
}

function updateSearchUI() {
    const searchNav = document.getElementById('search-nav');
    const counter = document.getElementById('search-counter');
    const prevBtn = document.getElementById('prev-result');
    const nextBtn = document.getElementById('next-result');
    
    if (searchResults.length === 0) {
        searchNav.style.display = 'none';
    } else {
        searchNav.style.display = 'flex';
        counter.textContent = `${currentSearchIndex + 1}/${searchResults.length}`;
        
        prevBtn.disabled = searchResults.length <= 1;
        nextBtn.disabled = searchResults.length <= 1;
    }
}

function clearSearch() {
    searchResults = [];
    currentSearchIndex = -1;
    
    document.querySelectorAll('.search-match').forEach(el => {
        el.classList.remove('search-match');
    });
    
    document.querySelectorAll('.highlight').forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
    
    updateSearchUI();
}

function displayStats(quizData) {
    let totalQuestions = 0;
    let totalPages = 0;
    
    Object.keys(quizData).forEach(pageKey => {
        try {
            const questions = quizData[pageKey];
            if (Array.isArray(questions)) {
                totalPages++;
                totalQuestions += questions.length;
            }
        } catch (error) {
            console.error(`Error processing page ${pageKey}:`, error);
        }
    });
    
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
        <h3>📊 Course Info</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-value">${totalPages}</div>
                <div class="stat-label">Parts</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${totalQuestions}</div>
                <div class="stat-label">Questions</div>
            </div>
        </div>
    `;
}

function displayQuiz(quizData) {
    const container = document.getElementById('quiz-container');
    displayStats(quizData);
    allQuestions = []; // Reset for search
    
    // Process each page
    Object.keys(quizData).forEach(pageKey => {
        try {
            const questions = quizData[pageKey];
            if (!Array.isArray(questions)) return;
            
            // Create page section
            const pageSection = document.createElement('div');
            pageSection.className = 'page-section';
            
            // Page header (collapsible)
            const pageHeader = document.createElement('div');
            pageHeader.className = 'page-header collapsed';
            pageHeader.innerHTML = `
                <span>${pageKey} (${questions.length} questions)</span>
                <span class="toggle-icon">▼</span>
            `;
            
            // Page content
            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';
            
            questions.forEach((questionData, questionIndex) => {
                const questionContainer = document.createElement('div');
                questionContainer.className = 'question-container';
                
                // Question title
                const questionTitle = document.createElement('div');
                questionTitle.className = 'question-title';
                questionTitle.textContent = `Q${questionIndex + 1}: ${questionData.question}`;
                questionContainer.appendChild(questionTitle);
                
                // Options
                if (questionData.options && Array.isArray(questionData.options)) {
                    questionData.options.forEach((option, optionIndex) => {
                        const optionDiv = document.createElement('div');
                        optionDiv.className = 'option';
                        const isMultiAnswer = Array.isArray(questionData.answer);
                        let isCorrect;

                        if (isMultiAnswer) {
                            isCorrect = questionData.answer?.includes(optionIndex);
                        } else if (optionIndex === questionData.answer) {
                            isCorrect = true;
                        }
                        
                        if (isCorrect) {
                            optionDiv.classList.add('correct');
                        } else {
                            optionDiv.classList.add('incorrect');
                        }
                        
                        const indicator = document.createElement('span');
                        indicator.className = 'indicator';
                        indicator.textContent = isCorrect ? '✓' : '✗';
                        
                        const optionText = document.createElement('span');
                        optionText.textContent = option;
                        
                        optionDiv.appendChild(indicator);
                        optionDiv.appendChild(optionText);
                        questionContainer.appendChild(optionDiv);
                    });
                }
                
                // Store for search functionality
                allQuestions.push({
                    question: questionData.question,
                    options: questionData.options || [],
                    element: questionContainer,
                    pageElement: pageHeader,
                    pageContent: pageContent
                });

                if (questionData.explanation) {
                    const explanationDiv = document.createElement('div');
                    explanationDiv.className = 'explanation';
                    explanationDiv.innerHTML = `<strong>Explication:</strong> ${questionData.explanation}`;
                    questionContainer.appendChild(explanationDiv);
                }
                
                pageContent.appendChild(questionContainer);
            });
            
            // Toggle functionality
            pageHeader.addEventListener('click', () => {
                pageHeader.classList.toggle('collapsed');
                pageContent.classList.toggle('expanded');
            });
            
            pageSection.appendChild(pageHeader);
            pageSection.appendChild(pageContent);
            container.appendChild(pageSection);
            
        } catch (error) {
            console.error(`Error processing page ${pageKey}:`, error);
        }
    });
}


document.addEventListener('DOMContentLoaded', function() {
    const NAMESPACE = 'sup-quiz-counter';
    const COUNTER_NAME = 'visitors-count';
    
    // Get the counter element
    const counterElement = document.getElementById('count');
    
    // Function to check and update the visitor count
    function handleVisitorCount() {
        // Check if this visitor has been counted recently
        const lastVisit = localStorage.getItem('lastVisitTimestampAnswers');
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
                    localStorage.setItem('lastVisitTimestampAnswers', currentTime.toString());
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
    
    document.addEventListener('keydown', handleKeydown);
    
    // Call the function to handle the visitor count
    handleVisitorCount();
    function pollVisitorCount() {
        setInterval(() => {
            handleVisitorCount();
        }, 15000);
    }

    pollVisitorCount();
});


function reloadPage() {
    location.reload();
}

// Get the image and title elements
const logo = document.getElementById('logo');
const title = document.getElementById('title');

// Add click event listeners to reload the page
logo.addEventListener('click', reloadPage);
title.addEventListener('click', reloadPage);