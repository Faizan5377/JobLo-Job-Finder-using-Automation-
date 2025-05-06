# backend/resumes/views.py

import requests
import json
from rest_framework import status, views, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import Http404 # Import Http404
import threading
import google.generativeai as genai
import logging
import time

from .models import Resume, ResumeSuggestion
from .serializers import ResumeSerializer, ResumeSuggestionSerializer
from .utils import extract_text_from_pdf

logger = logging.getLogger(__name__)

# --- Corrected View for GETting Resume Details ---
class ResumeDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Fetches the details of the currently authenticated user's resume.
        Returns 404 if no resume is found.
        """
        try:
            # Use a standard try/except block instead of get_object_or_404
            # to handle the response format correctly within DRF.
            resume = Resume.objects.get(user=request.user)
            serializer = ResumeSerializer(resume, context={"request": request})
            return Response(serializer.data, status=status.HTTP_200_OK) # OK status
        except Resume.DoesNotExist:
            logger.info(f"No resume found for user {request.user.id} on GET /api/resumes/details/")
            # Return a proper DRF 404 response
            return Response(
                {"detail": "No Resume found."},
                status=status.HTTP_404_NOT_FOUND # Not Found status
            )
        except Exception as e:
            logger.error(f"Error fetching resume details for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred while fetching resume details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# --- Corrected Upload View (Handles POST/Create/Update) ---
class ResumeUploadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """
        Uploads a new resume or updates an existing one for the authenticated user.
        Handles 'file' in form-data.
        """
        if 'file' not in request.data:
            return Response(
                {"error": "No file provided."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Use request.data which contains the uploaded file and any other form data
        data_to_validate = request.data

        try:
            # Try to get the existing resume instance for the user
            resume_instance = Resume.objects.filter(user=request.user).first()

            if resume_instance:
                # --- UPDATE existing resume ---
                logger.info(f"Updating existing resume for user {request.user.id}")
                # Pass BOTH the instance to update AND the new data
                serializer = ResumeSerializer(
                    instance=resume_instance,
                    data=data_to_validate,
                    partial=True, # Allow partial updates if needed, though here we replace the file
                    context={"request": request}
                )
                response_status = status.HTTP_200_OK # Status for successful update
            else:
                # --- CREATE new resume ---
                logger.info(f"Creating new resume for user {request.user.id}")
                # Pass ONLY the new data for validation and creation
                serializer = ResumeSerializer(
                    data=data_to_validate,
                    context={"request": request}
                )
                response_status = status.HTTP_201_CREATED # Status for successful creation

            # --- Validate and Save ---
            if serializer.is_valid():
                # Assign user ONLY if creating a new instance
                # (serializer won't have 'user' in validated_data if instance was provided)
                if not resume_instance:
                    serializer.save(user=request.user)
                else:
                    serializer.save() # Update the existing instance

                return Response(serializer.data, status=response_status)
            else:
                # Validation failed
                logger.error(f"Resume serialization/validation error for user {request.user.id}: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error uploading resume for user {request.user.id}: {e}", exc_info=True)
            return Response(
                {"error": "An unexpected error occurred during resume upload."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- Resume Deletion View (Should be OK, but added logging) ---
class ResumeDeleteView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        try:
            # Use get_object_or_404 here is fine, as failure naturally leads to 404 response
            resume = get_object_or_404(Resume, user=request.user)
            resume_id = resume.id # Get ID for logging before deletion
            # Consider deleting associated suggestions if desired
            # ResumeSuggestion.objects.filter(resume=resume).delete()
            resume.delete() # Model's delete method handles file deletion
            logger.info(f"Resume {resume_id} deleted successfully for user {request.user.id}")
            return Response(status=status.HTTP_204_NO_CONTENT) # Standard success for DELETE
        except Http404: # Catch the specific exception from get_object_or_404
             logger.warning(f"Resume delete request failed: No resume found for user {request.user.id}")
             return Response({"detail": "No Resume found to delete."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
             logger.error(f"Error deleting resume for user {request.user.id}: {e}", exc_info=True)
             return Response(
                {"error": "An unexpected error occurred while deleting the resume."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- Resume Suggestion View (Keep the previous version using Gemini) ---
class ResumeSuggestionView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Initiates the resume analysis process in the background using Gemini."""
        try:
            resume = get_object_or_404(Resume, user=request.user)
            logger.info(f"Initiating resume analysis for user: {request.user.id}, resume_id: {resume.id}")

            suggestion = ResumeSuggestion.objects.create(
                resume=resume,
                status='processing',
                suggestion_data={"message": "Analysis has started."}
            )
            logger.info(f"Created ResumeSuggestion record {suggestion.id} with status 'processing'.")

            thread = threading.Thread(
                target=self._process_resume_in_background,
                args=(resume.id, suggestion.id)
            )
            thread.daemon = True
            thread.start()

            serializer = ResumeSuggestionSerializer(suggestion)
            return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

        except Http404: # Catch specific exception
             logger.warning(f"Resume analysis request failed: No resume found for user {request.user.id}")
             return Response(
                 {"error": "No resume found. Please upload a resume first."},
                 status=status.HTTP_404_NOT_FOUND
             )
        except Exception as e:
            logger.exception(f"Error initiating resume analysis for user {request.user.id}")
            return Response(
                {"error": f"An error occurred while starting the analysis: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _process_resume_in_background(self, resume_id, suggestion_id):
        """Background task to extract text, call Gemini, and update suggestion."""
        logger.info(f"[BG Thread {suggestion_id}] Starting processing.")
        try:
            resume = Resume.objects.get(id=resume_id)
            suggestion = ResumeSuggestion.objects.get(id=suggestion_id)

            logger.info(f"[BG Thread {suggestion_id}] Extracting text from {resume.file.name}")
            resume_text = extract_text_from_pdf(resume.file.path)
            if not resume_text or len(resume_text) < 50:
                error_msg = "Failed to extract sufficient text from the resume PDF."
                logger.error(f"[BG Thread {suggestion_id}] {error_msg}")
                self._update_suggestion_status(suggestion_id, 'error', {"error": error_msg})
                return

            logger.info(f"[BG Thread {suggestion_id}] Extracted ~{len(resume_text)} characters.")
            logger.info(f"[BG Thread {suggestion_id}] Calling Gemini API.")
            analysis_result = self._get_gemini_analysis(resume_text, suggestion_id)

            if analysis_result and 'error' not in analysis_result:
                logger.info(f"[BG Thread {suggestion_id}] Gemini analysis successful. Updating suggestion.")
                self._update_suggestion_status(suggestion_id, 'completed', analysis_result)
            else:
                error_data = analysis_result if analysis_result else {"error": "Gemini analysis failed for an unknown reason."}
                # Log the error data structure if possible
                logger.error(f"[BG Thread {suggestion_id}] Gemini analysis failed or returned error: {error_data}")
                self._update_suggestion_status(suggestion_id, 'error', error_data)

            logger.info(f"[BG Thread {suggestion_id}] Processing finished.")

        except Resume.DoesNotExist:
             logger.error(f"[BG Thread {suggestion_id}] Resume {resume_id} not found.", exc_info=True)
             self._update_suggestion_status(suggestion_id, 'error', {"error": "Associated resume not found during processing."})
        except ResumeSuggestion.DoesNotExist:
            logger.error(f"[BG Thread {suggestion_id}] Suggestion {suggestion_id} not found during processing.", exc_info=True)
        except Exception as e:
            logger.exception(f"[BG Thread {suggestion_id}] Unhandled error during background processing.")
            try:
                 self._update_suggestion_status(suggestion_id, 'error', {"error": f"An unexpected server error occurred during processing: {str(e)}"})
            except Exception as update_err:
                 logger.error(f"[BG Thread {suggestion_id}] Could not update suggestion status after error: {update_err}")


    def _update_suggestion_status(self, suggestion_id, status_val, data): # Renamed status -> status_val
        """Safely updates the suggestion status and data."""
        try:
            # Use update to perform atomic update if possible, otherwise fetch and save
            # ResumeSuggestion.objects.filter(id=suggestion_id).update(status=status_val, suggestion_data=data)
            # Fetch-and-save is safer if complex logic depends on the object state
            suggestion = ResumeSuggestion.objects.get(id=suggestion_id)
            suggestion.status = status_val
            suggestion.suggestion_data = data
            suggestion.save(update_fields=['status', 'suggestion_data'])
            logger.info(f"[BG Thread {suggestion_id}] Updated suggestion status to '{status_val}'.")
        except ResumeSuggestion.DoesNotExist:
            logger.error(f"[BG Thread {suggestion_id}] Failed to update status: Suggestion {suggestion_id} not found.")
        except Exception as e:
            logger.error(f"[BG Thread {suggestion_id}] Failed to update suggestion {suggestion_id} status to '{status_val}': {e}", exc_info=True)


    def _get_gemini_analysis(self, resume_text, suggestion_id):
        """Calls the Gemini API to get resume analysis."""
        # (Keep the Gemini logic from the previous correct version)
        # ... (Make sure GOOGLE_API_KEY check, prompt creation, API call,
        #      safety check, JSON parsing, and error handling are here) ...
        if not settings.GOOGLE_API_KEY:
             logger.error(f"[BG Thread {suggestion_id}] GOOGLE_API_KEY not configured.")
             return {"error": "AI analysis service is not configured."}
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            prompt = self._create_gemini_prompt(resume_text)
            model = genai.GenerativeModel('gemini-1.5-flash') # Or 'gemini-pro'
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
                # ... other safety settings ...
            ]
            response = model.generate_content(
                prompt,
                safety_settings=safety_settings,
                generation_config=genai.types.GenerationConfig(
                     response_mime_type="application/json"
                )
            )

            if not response.candidates:
                 block_reason = "Unknown"
                 try: block_reason = response.prompt_feedback.block_reason
                 except Exception: pass
                 error_msg = f"Gemini analysis blocked due to safety settings (Reason: {block_reason})."
                 logger.warning(f"[BG Thread {suggestion_id}] {error_msg}")
                 return {"error": error_msg}

            json_text = response.text
            logger.debug(f"[BG Thread {suggestion_id}] Raw Gemini JSON response snippet: {json_text[:200]}...")
            analysis_data = json.loads(json_text)
            return analysis_data
        except json.JSONDecodeError as e:
             logger.error(f"[BG Thread {suggestion_id}] Gemini returned invalid JSON: {e}. Response text: {json_text[:500]}...", exc_info=True)
             return {"error": "AI analysis returned an invalid format."}
        except Exception as e:
            logger.exception(f"[BG Thread {suggestion_id}] Error calling Gemini API.")
            error_detail = str(e)
            # Specific error checks
            if "API key not valid" in error_detail: return {"error": "AI analysis failed: Invalid API Key."}
            if "quota" in error_detail.lower(): return {"error": "AI analysis failed: API quota exceeded."}
            return {"error": f"AI analysis failed: {error_detail}"}


    def _create_gemini_prompt(self, resume_text):
        """Creates the prompt for the Gemini API, requesting JSON output."""
        # (Keep the prompt definition from the previous correct version)
        # ... (Make sure the JSON structure requested matches frontend needs) ...
        return f"""
Analyze the following resume text and provide feedback in JSON format.

Resume Text:
---
{resume_text}
---

Instructions:
1. Evaluate the resume based on common best practices...
2. Provide an overall score between 1 and 10 (integer).
3. List specific strengths...
4. List specific weaknesses...
5. Provide actionable suggestions for improvement...
6. For each major section (format, skills, experience, education), provide feedback and score (1-10).

Output the analysis STRICTLY as a valid JSON object with the following structure:

{{
  "score": <integer, 1-10>,
  "strengths": ["<string>"],
  "weaknesses": ["<string>"],
  "suggestions": {{
    "format": ["<string>"],
    "skills": ["<string>"],
    "experience": ["<string>"],
    "education": ["<string>"]
  }},
  "sectionFeedback": {{
    "format": {{"score": <integer>, "feedback": "<string>"}},
    "skills": {{"score": <integer>, "feedback": "<string>"}},
    "experience": {{"score": <integer>, "feedback": "<string>"}},
    "education": {{"score": <integer>, "feedback": "<string>"}}
  }}
}}

Ensure ONLY the JSON object is returned.
"""


    def get(self, request, suggestion_id=None):
        """
        Gets the latest suggestion or a specific suggestion by ID.
        Handles polling for status updates.
        """
        try:
            resume = get_object_or_404(Resume, user=request.user) # Check resume exists first
            if suggestion_id:
                suggestion = get_object_or_404(ResumeSuggestion, id=suggestion_id, resume=resume)
                serializer = ResumeSuggestionSerializer(suggestion)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                suggestion = ResumeSuggestion.objects.filter(resume=resume).order_by('-created_at').first()
                if not suggestion:
                    return Response({"message": "No analysis found for this resume."}, status=status.HTTP_404_NOT_FOUND)
                serializer = ResumeSuggestionSerializer(suggestion)
                return Response(serializer.data, status=status.HTTP_200_OK)
        except Http404: # Catch if resume or specific suggestion not found
            error_msg = "Suggestion not found." if suggestion_id else "No resume found for this user."
            logger.warning(f"GET suggestion failed for user {request.user.id}, suggestion_id={suggestion_id}: {error_msg}")
            return Response({"error": error_msg}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception(f"Error retrieving resume suggestion(s) for user {request.user.id}")
            return Response({"error": f"An error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)