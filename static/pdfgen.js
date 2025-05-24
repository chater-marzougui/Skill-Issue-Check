let quizData = null;
let courseList = [];
let selectedCourse = null;
let questions = [];

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');
const preview = document.getElementById('preview');
const previewContent = document.getElementById('previewContent');
const statusElement = document.getElementById('status');
const optionGroups = document.querySelectorAll('.option-group');

// File upload handling
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

optionGroups.forEach(group => {
    group.addEventListener('change', (e) => {
        if (!quizData || questions.length === 0) return;
        showPreview(questions);
    });
});

function handleQuizData() {
    try {
        // Validate and process the data
        questions = extractQuestions(quizData);
        if (questions.length === 0) {
            showStatus('No valid questions found in the JSON file.', 'error');
            return;
        }

        showStatus(`Loaded ${questions.length} questions successfully!`, 'success');
        generateBtn.disabled = false;
        showPreview(questions);
        
    } catch (error) {
        showStatus('Error reading JSON file: ' + error.message, 'error');
    }
}

async function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    if (!file.name.endsWith('.json')) {
        showStatus('Please select a JSON file.', 'error');
        return;
    }

    try {
        const text = await file.text();
        quizData = JSON.parse(text);
        handleQuizData();
        
    } catch (error) {
        showStatus('Error reading JSON file: ' + error.message, 'error');
    }
}

function extractQuestions(data) {
    questions = [];
    
    // Handle different JSON structures
    if (Array.isArray(data)) {
        questions = data;
    } else {
        // Look for questions in nested objects
        for (const key in data) {
            if (Array.isArray(data[key])) {
                questions = questions.concat(data[key]);
            }
        }
    }
    
    // Filter and validate questions
    return questions.filter(q => 
        q.question && 
        q.options && 
        Array.isArray(q.options) && 
        q.answer
    );
}

function showPreview(questions) {
    // Generate PDF with current settings
    const fontSize = parseInt(document.getElementById('fontSize').value);
    const lineSpacing = parseFloat(document.getElementById('lineSpacing').value);
    const includeExplanations = document.getElementById('includeExplanations').checked;
    const numberQuestions = document.getElementById('numberQuestions').checked;
    const pdfTitle = document.getElementById('pdfTitle').value || 'Quiz Questions & Answers';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const maxWidth = doc.internal.pageSize.width - 2 * margin;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(pdfTitle, margin, y);
    y += 15;

    doc.setFontSize(fontSize);
    doc.setFont(undefined, 'normal');

    questions.forEach((question, index) => {
        // Check if we need a new page
        const estimatedHeight = 30 + (includeExplanations && question.explanation ? 20 : 0);
        if (y + estimatedHeight > pageHeight - margin) {
            doc.addPage();
            y = 20;
        }

        // Question number and text
        const questionPrefix = numberQuestions ? `${index + 1}. ` : '';
        const questionText = questionPrefix + question.question;
        
        doc.setFont(undefined, 'bold');
        const questionLines = doc.splitTextToSize(questionText, maxWidth);
        doc.text(questionLines, margin, y);
        y += questionLines.length * fontSize * lineSpacing * 0.6;

        // Correct answers
        const correctAnswers = question.answer.map(i => question.options[i]);
        doc.setFont(undefined, 'normal');
        
        correctAnswers.forEach((answer, ansIndex) => {
            const answerText = `• ${answer}`;
            const answerLines = doc.splitTextToSize(answerText, maxWidth - 10);
            doc.text(answerLines, margin + 5, y);
            y += answerLines.length * fontSize * lineSpacing * 0.5;
        });

        // Explanation (if included and available)
        if (includeExplanations && question.explanation) {
            doc.setFont(undefined, 'italic');
            const explanationText = `Explanation: ${question.explanation}`;
            const explanationLines = doc.splitTextToSize(explanationText, maxWidth);
            doc.text(explanationLines, margin, y + 3);
            y += explanationLines.length * fontSize * lineSpacing * 0.5 + 3;
        }

        y += 4;
    });

    // Get PDF as data URL and display in iframe
    const pdfDataUri = doc.output('datauristring');
    
    // Clear preview content and add iframe
    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <iframe 
            src="${pdfDataUri}" 
            style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px;"
            title="PDF Preview">
        </iframe>
    `;
    
    // Show the preview
    document.getElementById('preview').style.display = 'block';
}

// Update the generate button to use a different function name to avoid confusion
function downloadPDF() {
    if (!quizData) return;

    const questions = extractQuestions(quizData);
    const fontSize = parseInt(document.getElementById('fontSize').value);
    const lineSpacing = parseFloat(document.getElementById('lineSpacing').value);
    const includeExplanations = document.getElementById('includeExplanations').checked;
    const numberQuestions = document.getElementById('numberQuestions').checked;
    const pdfTitle = document.getElementById('pdfTitle').value || 'Quiz Questions & Answers';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const maxWidth = doc.internal.pageSize.width - 2 * margin;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(pdfTitle, margin, y);
    y += 15;

    doc.setFontSize(fontSize);
    doc.setFont(undefined, 'normal');

    questions.forEach((question, index) => {
        // Check if we need a new page
        const estimatedHeight = 30 + (includeExplanations && question.explanation ? 20 : 0);
        if (y + estimatedHeight > pageHeight - margin) {
            doc.addPage();
            y = 20;
        }

        // Question number and text
        const questionPrefix = numberQuestions ? `${index + 1}. ` : '';
        const questionText = questionPrefix + question.question;
        
        doc.setFont(undefined, 'bold');
        const questionLines = doc.splitTextToSize(questionText, maxWidth);
        doc.text(questionLines, margin, y);
        y += questionLines.length * fontSize * lineSpacing * 0.6;

        // Correct answers
        const correctAnswers = question.answer.map(i => question.options[i]);
        doc.setFont(undefined, 'normal');
        
        correctAnswers.forEach((answer, ansIndex) => {
            const answerText = `• ${answer}`;
            const answerLines = doc.splitTextToSize(answerText, maxWidth - 10);
            doc.text(answerLines, margin + 5, y);
            y += answerLines.length * fontSize * lineSpacing * 0.5;
        });

        // Explanation (if included and available)
        if (includeExplanations && question.explanation) {
            doc.setFont(undefined, 'italic');
            const explanationText = `Explanation: ${question.explanation}`;
            const explanationLines = doc.splitTextToSize(explanationText, maxWidth);
            doc.text(explanationLines, margin, y + 3);
            y += explanationLines.length * fontSize * lineSpacing * 0.5 + 3;
        }

        y += 4;
    });

    // Generate and download PDF
    const filename = `quiz_answers_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    showStatus(`PDF generated successfully! Downloaded as ${filename}`, 'success');
}

function showStatus(message, type) {
    statusElement.innerHTML = `<div class="status ${type}">${message}</div>`;
    setTimeout(() => {
        statusElement.innerHTML = '';
    }, 5000);
}

generateBtn.addEventListener('click', downloadPDF);

function populateCourseSelector() {
    const select = document.getElementById('course-select');
    select.innerHTML = '<option value="">Select a course...</option>';
    
    courseList.forEach(course => {
        const option = document.createElement('option');
        option.value = course.filename;
        option.textContent = course.name;
        select.appendChild(option);
    });
    
    // Add change event listener
    select.addEventListener('change', async (e) => {
        if (e.target.value) {
            try {
                const response = await fetch(`assets/courses/${e.target.value}`);
                if (!response.ok) {
                    throw new Error('Could not load course file');
                }
                quizData = await response.json();
                handleQuizData();
            } catch (error) {
                showStatus(`Error loading course: ${error.message}`, 'error');
            }
        }
    });
}

// Load course list on page load
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
})
.catch(error => {
    console.error('Error loading course list:', error);
    document.getElementById('course-select').innerHTML = 
        '<option value="">Error loading courses - Use file upload instead</option>';
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