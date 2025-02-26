# CourseQuiz

A lightweight, frontend-only quiz application that lets instructors create and students take structured quizzes organized by courses and sessions.

![CourseQuiz Screenshot](https://via.placeholder.com/800x450?text=CourseQuiz+Screenshot)

## Features

- **No Backend Required**: Pure HTML, CSS, and JavaScript solution
- **Course Library**: Browse and load available quiz courses from JSON files
- **Session Structure**: Courses are divided into learning sessions with targeted quizzes
- **Results & Feedback**: Get immediate feedback with explanations for incorrect answers
- **JSON Import/Export**: Easy sharing and backup of quiz content

## Getting Started

### Prerequisites

- A web server or hosting solution to serve the files
  - For local development, you can use tools like:
    - Live Server extension in VS Code
    - Python's built-in server: `python -m http.server`
    - Node.js http-server: `npx http-server`

### Installation

1. Clone or download this repository
2. Place it in your web server's document root
3. Access it through your web browser

```bash
# Example using Python's built-in server
cd courseQuiz
python -m http.server 8000
# Then visit http://localhost:8000 in your browser
```

## Usage

### Taking a Quiz

1. Select a course from the sidebar or upload your Json file or Paste a Json text
2. Choose a specific session from the available options
3. Answer the questions by selecting your choice
4. Navigate through questions using the Previous/Next buttons
5. Submit your answers to see your results
6. Review explanations for any incorrect answers

### Creating Quiz Content

#### Option 1: Create JSON files manually

Create JSON files following this structure:

```json
{
  "title": "Course Title",
  "description": "Course description",
  "seances": [
    {
      "title": "Session 1: Topic",
      "questions": [
        {
          "question": "What is the correct answer?",
          "options": [
            "Option A",
            "Option B",
            "Option C",
            "Option D"
          ],
          "correct": 2,
          "explanation": "Option C is correct because..."
        }
        // More questions...
      ]
    }
    // More sessions...
  ]
}
```

Place your JSON files in the `courses` folder.

#### Option 2: Use the Gemini AI integration

1. Click "Copy Gemini prompt" button
2. Go to [Gemini Chat](https://gemini.google.com/chat)
3. Paste the prompt and add your course content
4. Copy the generated JSON
5. Paste it into the application

## Customization

### Adding New Courses

1. Create a new JSON file in the `courses` folder
2. Add the course information to `course-list.json` or update the `availableCourses` array in `home.js`

### Changing the Theme

Modify the CSS variables in the `:root` selector in `home.css`:

```css
:root {
    --primary: #3498db; /* Main color */
    --dark: #2c3e50;    /* Text color */
    --light: #ecf0f1;   /* Background color */
    --success: #2ecc71; /* Correct answers */
    --error: #e74c3c;   /* Incorrect answers */
    --neutral: #95a5a6; /* Disabled elements */
}
```

## Project Structure

```
SkillIssueCheck/
├── index.html          
├── home.css            
├── home.js             
├── courses/            
│   ├── course-list.json     
│   ├── python-basics.json   
│   └── javascript-intro.json  
└── README.md
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Created by Chater Marzougui
- Uses [Google Gemini](https://gemini.google.com/) for AI-generated content
