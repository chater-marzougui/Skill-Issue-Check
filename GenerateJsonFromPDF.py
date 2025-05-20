import os
import json
import google.generativeai as genai
import time
from dotenv import load_dotenv
from PyPDF2 import PdfReader

load_dotenv()

# Configuration
API_KEY = os.getenv("API_KEY")
CHUNK_SIZE = 10  # Number of pages per chunk

# Initialize Gemini
genai.configure(api_key=API_KEY)

def split_pdf_into_chunks(pdf_path, chunk_size=CHUNK_SIZE):
    """Split a PDF into chunks of specified size."""
    print(f"Opening PDF: {pdf_path}")
    try:
        pdf = PdfReader(pdf_path)
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        
        chunks = []
        for i in range(0, total_pages, chunk_size):
            end_page = min(i + chunk_size, total_pages)
            chunk_text = ""
            
            print(f"Processing pages {i+1} to {end_page}")
            for page_num in range(i, end_page):
                page = pdf.pages[page_num]
                chunk_text += page.extract_text() + "\n\n"
            
            chunks.append({
                "start_page": i + 1,
                "end_page": end_page,
                "text": chunk_text
            })
            
        return chunks
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return []

def get_gemini_response(text, attempts=3, delay=5):
    """Get response from Gemini with retry logic."""
    prompt = f"""
Analyze the provided document in detail and extract the key concepts, definitions, and critical points necessary for a deep understanding of the course. Then, generate multiple-choice questions (MCQs), following the format below:
Questions should be clear, precise, and relevant to the document's content.
The answer choices (options) should include one correct answer and three plausible distractors.
The correct answer should be indicated with its index in the list.
Provide a brief yet informative explanation for each answer to reinforce understanding.
Ensure the questions cover various levels of cognition, including factual recall, comprehension, and application.
Structure the questions to promote critical thinking and not just rote memorization.
Use the following JSON format:
{{
    "session 1": [
        {{
            "question": "What was the approximate amount of global venture capital funding for startups in the third quarter of 2021?",
            "options": [
                "77 billion USD",
                "158 billion USD",
                "100 billion USD",
                "200 billion USD"
            ],
            "answer": 1,
            "explanation": "Global venture capital funding for startups in the third quarter of 2021 was about 158 billion USD."
        }},
        {{
            "question": "How many new unicorns emerged in the third quarter of 2021?",
            "options": [
                "37",
                "77",
                "200",
                "127"
            ],
            "answer": 3,
            "explanation": "In the third quarter of 2021, 127 new unicorns emerged."
        }}
    ]
}}
Make sure that:
The answers are zero-indexed.
Use the same language as the document.
The questions cover different sections of the document comprehensively.
The explanations reinforce key learnings and not just repeat the correct answer.
The difficulty level varies, including both basic and challenging questions.
And be sure to put the answer indexes in different places (Don't repeat the position of the correct answer).
Don't use phrases like "The document says" or "The text states" in the questions or explanations.
The reply should be in JSON format only, without any additional text or comments.
The reply should be in the same language as the document.

Here's the document to analyze:
{text}
"""
    
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    for attempt in range(attempts):
        try:
            response = model.generate_content(prompt)
            # Extract the JSON part from the response
            response_text = response.text
            
            # Find the first { and the last } to extract the JSON object
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                # Parse to validate it's proper JSON
                try:
                    json_data = json.loads(json_str)
                    return json_data
                except json.JSONDecodeError as e:
                    print(f"Invalid JSON response (attempt {attempt+1}/{attempts}):\n{json_str}\nError: {e}")
            else:
                print(f"No valid JSON found in response (attempt {attempt+1}/{attempts}):\n{response_text}")
                
        except Exception as e:
            print(f"Error calling Gemini API (attempt {attempt+1}/{attempts}): {e}")
        
        if attempt < attempts - 1:
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            # Increase delay for next retry
            delay *= 2
    
    print("Failed to get a valid response after multiple attempts")
    return {"error": "Failed to get a valid response from Gemini"}

def process_pdf_with_gemini(pdf_path, base_folder, courses_path):
    """Process PDF with Gemini and save results to a JSON file."""
    # Generate a default output filename based on the input PDF
    chunks = split_pdf_into_chunks(pdf_path)
    if not chunks:
        print("No chunks were created. Exiting.")
        return
    
    print(f"Created {len(chunks)} chunks")
    
    all_questions = {}
    
    for i, chunk in enumerate(chunks):
        print(f"\nProcessing chunk {i+1}/{len(chunks)} (pages {chunk['start_page']}-{chunk['end_page']})")
        
        # Get response from Gemini
        print(f"Sending text to Gemini (length: {len(chunk['text'])} characters)")
        response = get_gemini_response(chunk['text'])
        
        if "error" in response:
            print(f"Error in chunk {i+1}: {response['error']}")
            continue
            
        # Merge the response with the combined results
        for section, questions in response.items():
            section_key = f"{section} (p.{chunk['start_page']}-{chunk['end_page']})"
            all_questions[section_key] = questions
            print(f"Added {len(questions)} questions for {section_key}")
        
        # Brief pause between API calls
        if i < len(chunks) - 1:
            time.sleep(2)
    
    output_path = os.path.splitext(pdf_path.replace(' ', '_').lower())[0] + '.json'
    course_name = os.path.basename(pdf_path).replace('.pdf', '')
    # Save the combined results
    with open(base_folder+output_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
        
    manage_courses(base_folder+courses_path, new_course_name=course_name, new_course_filename=output_path)
    
    print(f"\nComplete! Saved results to {output_path}")
    print(f"Generated a total of {sum(len(q) for q in all_questions.values())} questions")
    
def manage_courses(courses_file_path, new_course_name=None, new_course_filename=None):
    # Load existing courses file
    try:
        if os.path.exists(courses_file_path):
            with open(courses_file_path, 'r', encoding='utf-8') as f:
                courses_data = json.load(f)
        else:
            # Create new courses data structure if file doesn't exist
            courses_data = {"courses": []}
            print(f"No courses file found at {courses_file_path}. Creating new courses file.")
    except Exception as e:
        print(f"Error loading courses file: {e}")
        courses_data = {"courses": []}
    
    # Add new course if name and filename are provided
    if new_course_name and new_course_filename:
        # Find the highest existing ID to generate a new one
        existing_ids = [int(course["id"]) for course in courses_data.get("courses", [])]
        new_id = str(max(existing_ids, default=0) + 1)
        
        # Create new course entry
        new_course = {
            "id": new_id,
            "filename": new_course_filename,
            "name": new_course_name
        }
        
        # Add to courses list
        courses_data.setdefault("courses", []).append(new_course)
        print(f"Added new course: {new_course_name} (ID: {new_id})")
        
        # Save updated courses file
        try:
            with open(courses_file_path, 'w', encoding='utf-8') as f:
                json.dump(courses_data, f, indent=2, ensure_ascii=False)
            print(f"Courses file updated successfully at {courses_file_path}")
        except Exception as e:
            print(f"Error saving courses file: {e}")
    
    return courses_data

if __name__ == "__main__":
    # Get input from user
    base_folder = './assets/courses/'
    courses_path = 'course-list.json'
    pdf_path = 'Chapter 4-Next Generation Firewalls and Applications Identification.pdf'
    # Process the PDF
    process_pdf_with_gemini(pdf_path, base_folder, courses_path)