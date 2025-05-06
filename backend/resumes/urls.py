from django.urls import path
from .views import ResumeUploadView, ResumeSuggestionView, ResumeDeleteView, ResumeDetailView

urlpatterns = [
    # Use POST on /upload/ for creating/updating
    path('upload/', ResumeUploadView.as_view(), name='resume-upload'),
    # Use GET on /details/ for fetching the current resume
    path('details/', ResumeDetailView.as_view(), name='resume-detail'),
    # DELETE endpoint remains the same
    path('delete/', ResumeDeleteView.as_view(), name='resume-delete'),
    # Suggestions endpoints
    path('suggestions/', ResumeSuggestionView.as_view(), name='resume-suggestions'),
    # Add path for getting specific suggestion status/result
    path('suggestions/<uuid:suggestion_id>/', ResumeSuggestionView.as_view(), name='resume-suggestion-detail'),
]
