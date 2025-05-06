import PyPDF2
import io
import json
import logging

logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        str: Extracted text from the PDF
    """
    try:
        # Open the PDF file in binary mode
        with open(pdf_path, 'rb') as file:
            # Create a PDF reader object
            pdf_reader = PyPDF2.PdfReader(file)
            
            # Get the number of pages
            num_pages = len(pdf_reader.pages)
            logger.info(f"Extracting text from PDF with {num_pages} pages")
            
            # Initialize an empty string to store the text
            text = ""
            
            # Extract text from each page
            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n\n"
            
            return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        return None

def structure_resume_data(resume_text):
    """
    Create a basic structure from the extracted resume text
    to simulate what might have come from the RapidAPI service
    
    Args:
        resume_text: The extracted text from the resume
        
    Returns:
        dict: Structured resume data
    """
    # This is a simplified structure - you can enhance this
    # to better extract sections based on common resume patterns
    sections = resume_text.split('\n\n')
    
    # Very simple structure for demonstration
    structured_data = {
        "full_text": resume_text,
        "extracted_data": {
            "contact_info": sections[0] if sections else "",
            "sections": sections,
            "skills": [],  # Would need more advanced parsing to extract skills
            "experience": [],  # Would need more advanced parsing to extract experience
            "education": []  # Would need more advanced parsing to extract education
        }
    }
    
    return structured_data