import os
import json
import google.generativeai as genai
import time
from dotenv import load_dotenv
from PyPDF2 import PdfReader, PdfWriter
import io
import re

load_dotenv()

# Configuration
API_KEY = os.getenv("API_KEY")
model_name = "gemini-2.0-flash"
genai.configure(api_key=API_KEY)


def split_into_pdf_pages(pdf_path):
    try:
        # Open the PDF document
        pdf = PdfReader(pdf_path)
        pages = []
        
        for page_num in range(len(pdf.pages)):
            page = pdf.pages[page_num]
            pages.append(page)
        
        return pages
    
    except Exception as e:
        print(f"Error splitting PDF: {e}")
        return []
    

def get_paths(pdf_path):
    base_name = os.path.splitext(pdf_path.replace(' ', '_').lower())[0]
    output_path = base_name + '.json'
    study_tex_path = base_name + '_study.tex'
    exam_tex_path = base_name + '_exam.tex'
    return output_path, study_tex_path, exam_tex_path


def generate_latex_document(content, doc_type="study"):
    """Generate a complete LaTeX document with proper structure."""
    
    if doc_type == "study":
        title = "Study Guide - Cryptography"
        doc_class = "article"
    else:
        title = "Exam Reference - Cryptography"
        doc_class = "article"
    
    latex_template = f"""\\documentclass[11pt,a4paper]{{{doc_class}}}
\\usepackage[utf8]{{inputenc}}
\\usepackage[T1]{{fontenc}}
\\usepackage{{amsmath}}
\\usepackage{{amsfonts}}
\\usepackage{{amssymb}}
\\usepackage{{graphicx}}
\\usepackage{{geometry}}
\\usepackage{{fancyhdr}}
\\usepackage{{enumerate}}
\\usepackage{{listings}}
\\usepackage{{xcolor}}
\\usepackage{{hyperref}}

% Page geometry
\\geometry{{margin=1in}}

% Header and footer
\\pagestyle{{fancy}}
\\fancyhf{{}}
\\rhead{{\\thepage}}
\\lhead{{{title}}}

% Code listing style
\\lstset{{
    basicstyle=\\ttfamily\\small,
    breaklines=true,
    frame=single,
    backgroundcolor=\\color{{gray!10}}
}}

\\title{{{title}}}
\\author{{Generated from PDF}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle
\\tableofcontents
\\newpage

{content}

\\end{{document}}"""
    
    return latex_template


def save_latex_files(documents, pdf_path):
    """Save the LaTeX content to .tex files."""
    _, study_tex_path, exam_tex_path = get_paths(pdf_path)
    
    try:
        # Generate and save study document
        study_latex = generate_latex_document(documents["for_study"], "study")
        with open(study_tex_path, 'w', encoding='utf-8') as f:
            f.write(study_latex)
        print(f"Study LaTeX saved to: {study_tex_path}")
        
        # Generate and save exam document
        exam_latex = generate_latex_document(documents["in_exam"], "exam")
        with open(exam_tex_path, 'w', encoding='utf-8') as f:
            f.write(exam_latex)
        print(f"Exam LaTeX saved to: {exam_tex_path}")
        
    except Exception as e:
        print(f"Error saving LaTeX files: {e}")
    

def extract_json_from_response(response_text):
    """Extract and clean JSON from Gemini response."""
    try:
        # Find the first { and the last } to extract the JSON object
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            raise ValueError("No JSON object found in response")
        
        json_str = response_text[json_start:json_end]
        
        # First attempt: try to parse as-is
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # If that fails, try to fix common LaTeX escaping issues
            return parse_json_with_latex_fix(json_str)
            
    except Exception as e:
        print(f"Error extracting JSON: {e}")
        return None


def parse_json_with_latex_fix(json_str):
    """Parse JSON string with LaTeX content, handling escape sequences."""
    try:
        # Method 1: Try using raw string decoder
        return json.loads(json_str, strict=False)
    except json.JSONDecodeError as e:
        print(f"Standard JSON parsing failed: {e}")
        
        try:
            # Method 2: Try to manually fix common escape issues
            # This is a more aggressive approach
            fixed_json = fix_latex_escapes(json_str)
            return json.loads(fixed_json)
        except json.JSONDecodeError as e2:
            print(f"Fixed JSON parsing also failed: {e2}")
            
            # Method 3: Try to extract content without JSON parsing
            return extract_content_manually(json_str)


def fix_latex_escapes(json_str):
    """Attempt to fix LaTeX escape sequences in JSON string."""
    # Replace problematic LaTeX commands that aren't properly escaped
    # This is a heuristic approach and may not catch all cases
    
    # Common LaTeX commands that cause issues
    latex_commands = [
        r'\\section', r'\\subsection', r'\\subsubsection',
        r'\\textbf', r'\\textit', r'\\emph',
        r'\\begin', r'\\end',
        r'\\item', r'\\enumerate', r'\\itemize',
        r'\\mathbf', r'\\mathit', r'\\mathrm',
        r'\\frac', r'\\sqrt', r'\\sum', r'\\int',
        r'\\alpha', r'\\beta', r'\\gamma', r'\\delta',
        r'\\newline', r'\\newpage', r'\\noindent'
    ]
    
    fixed_str = json_str
    
    # This is a simplified fix - in practice, you'd need more sophisticated handling
    # The issue is that JSON requires \\ for a literal backslash, but LaTeX uses \
    
    # Try to identify string values and fix escapes within them
    # This is a rough heuristic
    import re
    
    def fix_string_content(match):
        content = match.group(1)
        # Double the backslashes for JSON compliance
        content = content.replace('\\', '\\\\')
        return f'"{content}"'
    
    # Match quoted strings and fix their content
    fixed_str = re.sub(r'"([^"\\]*(\\.[^"\\]*)*)"', fix_string_content, fixed_str)
    
    return fixed_str


def extract_content_manually(json_str):
    """Manually extract content from malformed JSON as fallback."""
    print("Attempting manual content extraction...")
    
    result = {
        "for_study": "",
        "in_exam": "",
        "resume": ""
    }
    
    # Try to extract each field manually using regex
    for field in ["for_study", "in_exam", "resume"]:
        pattern = f'"{field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"'
        match = re.search(pattern, json_str, re.DOTALL)
        if match:
            content = match.group(1)
            # Unescape basic JSON escapes
            content = content.replace('\\"', '"').replace('\\\\', '\\')
            result[field] = content
        else:
            print(f"Could not extract {field} field")
    
    return result
    

def process_generate_documents(pdf_path):
    """Process PDF with Gemini and save results to JSON and LaTeX files."""
    # Generate output filenames based on the input PDF
    pages = split_into_pdf_pages(pdf_path)
    if not pages:
        print("No pages were created. Exiting.")
        return
    
    total_pages = len(pages)
    print(f"Created {total_pages} pages")
    chunk_size = 12
    
    documents = {
        "for_study": "",
        "in_exam": "",
        "resume": "" 
    }
    
    chunk_number = 1
    total_chunks = (total_pages + chunk_size - 1) // chunk_size  # Ceiling division
    
    for i in range(0, total_pages, chunk_size):
        print(f"\nProcessing pages {i+1} to {min(i+chunk_size, total_pages)}")
        to_process_pages = pages[i:i+chunk_size]
        
        # Get response from Gemini
        response = generate_documents_with_gemini(
            to_process_pages, chunk_number, 
            number_of_chunks=total_chunks,
            last_prompt=documents["resume"]
        )
        
        chunk_number += 1
        if "error" in response:
            print(f"Error in pages {i+1}-{min(i+chunk_size, total_pages)}: {response['error']}")
            continue
            
        # Merge the response with the combined results
        print("Response received successfully")
        documents["for_study"] += "\n" + response.get("for_study", "")
        documents["in_exam"] += "\n" + response.get("in_exam", "")
        documents["resume"] += "\n" + response.get("resume", "")
        
        # Brief pause between API calls
        if i < total_pages - chunk_size:
            time.sleep(2)
    
    output_path, _, _ = get_paths(pdf_path)
    
    # Save the combined results to JSON
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)
    
    print(f"\nJSON results saved to: {output_path}")
    
    # Generate and save LaTeX files
    save_latex_files(documents, pdf_path)
    
    print(f"\nComplete! All files generated for {pdf_path}")
    
    
def get_gemini_response(prompt, pdf_bytes, chunk_number, attempts=3, delay=5):
    model = genai.GenerativeModel(model_name=model_name)
    
    for attempt in range(attempts):
        try:
            # Upload the PDF pages as a file
            uploaded_file = genai.upload_file(
                io.BytesIO(pdf_bytes),
                mime_type='application/pdf'
            )
            
            # Generate content with the uploaded PDF
            response = model.generate_content([prompt, uploaded_file])
            
            # Extract and parse JSON from response
            response_text = response.text
            json_data = extract_json_from_response(response_text)
            
            # Clean up the uploaded file
            genai.delete_file(uploaded_file.name)
            
            if json_data is None:
                raise ValueError("Failed to extract valid JSON from response")
            
            return json_data
                
        except Exception as e:
            print(f"Error processing chunk {chunk_number} (attempt {attempt+1}/{attempts}): {e}")
            if 'uploaded_file' in locals():
                try:
                    genai.delete_file(uploaded_file.name)
                except Exception:
                    pass
        
        if attempt < attempts - 1:
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            # Increase delay for next retry
            delay *= 2
    
    # Return error if all attempts failed
    return {"error": f"Failed to get valid response after {attempts} attempts"}


def generate_documents_with_gemini(pages, chunk_number, number_of_chunks, last_prompt=None):
    """Get response from Gemini with PDF pages as direct input and retry logic."""
    
    # Convert pages to PDF bytes
    output_pdf = PdfWriter()
    for page in pages:
        output_pdf.add_page(page)
    
    # Save to bytes buffer
    pdf_buffer = io.BytesIO()
    output_pdf.write(pdf_buffer)
    pdf_bytes = pdf_buffer.getvalue()
    pdf_buffer.close()
    
    last_prompt_text = ""
    if last_prompt:
        last_prompt_text = f"This is what you generated in the last prompt: {last_prompt}"
        
    prompt = f"""
Analyze the provided document in detail and extract the key concepts, definitions, and critical points necessary for a deep understanding of the course.
The document provided is a PDF of our cryptography class.
The exam tomorrow has a document-authorized format so we need to generate the document for tomorrow's exam.
You will be provided the PDF file in different chunks.
This is chunk {chunk_number}/{number_of_chunks} of the document.
Our goal is to create two LaTeX documents:

Your task is to generate a json file with the following elements:
- A LaTeX (overleaf code) containing everything necessary from the pdf for before-the-exam study which I'll read to understand the concepts.
- A LaTeX (overleaf code) containing everything necessary from the pdf for inside-the-exam which should incorporate all concepts in a reduced way for fast search.
- A resume which will be provided for you to know what you generated in the last prompt - be precise so we don't regenerate things.


VERY IMPORTANT:
- Don't Import any packages they are allready imported.
- Don't use any \\begin{{document}}, \\end{{document}}, \\documentclass{{article}}, \\usepackage{{package_name}}, \\date, commands since everything you generate will concatenated.
- When generating LaTeX code in JSON, make sure to properly escape backslashes. 
- You only need to generae the content make sure you do only that.


{last_prompt_text}

Use the following JSON format:
{{
    "for_study": "LaTeX content for studying with properly escaped backslashes",
    "in_exam": "LaTeX content for exam with properly escaped backslashes",
    "resume": "text for what you did to be concise in next prompt" 
}}

Make sure that:
- ALL backslashes in LaTeX commands are properly escaped (doubled) for JSON
- You cover all concepts and add examples if something is hard.
- Cover different sections of the document comprehensively.
- The explanations reinforce key learnings and not just repetition.
- The reply should be valid JSON format only, without any additional text or comments.
- The reply should be in the same language as the document.
- If you want to add an image or graph mark it with a TODO and some details for where to get it from.
- Use proper LaTeX formatting for mathematical expressions, code blocks, and structured content.

VERY IMPORTANT:
- Don't Import any packages they are allready imported.
- Don't use any \\begin{{document}}, \\end{{document}}, \\documentclass{{article}}, \\usepackage{{package_name}}, \\date, commands since everything you generate will concatenated.
- When generating LaTeX code in JSON, make sure to properly escape backslashes. 
- You only need to generae the content make sure you do only that.

Here's the document to analyze:
"""
    
    try:
        return get_gemini_response(prompt, pdf_bytes, chunk_number)
    except Exception:
        print(f"Failed to get a valid response for chunk {chunk_number} after multiple attempts")
        return {"error": f"Failed to get a valid response from Gemini for chunk {chunk_number}"}


if __name__ == "__main__":
    # Automatically detect all .pdf files in the current directory
    pdf_files = [f for f in os.listdir("./") if f.lower().endswith('.pdf')]
    if not pdf_files:
        print("No PDF files found in current directory")
    else:
        print(f"Found {len(pdf_files)} PDF file(s): {pdf_files}")
        for pdf_file in pdf_files:
            print(f"\n{'='*50}")
            print(f"Processing: {pdf_file}")
            print(f"{'='*50}")
            process_generate_documents(pdf_file)